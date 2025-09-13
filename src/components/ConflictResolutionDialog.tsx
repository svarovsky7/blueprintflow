import { useState, useMemo } from 'react'
import { Modal, Table, Button, Space, Tag, Typography, Alert, Tooltip } from 'antd'
import { CloseOutlined, FileTextOutlined, EditOutlined } from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import type { ImportConflict, ConflictResolution } from '@/entities/documentation/types'

const { Text } = Typography

interface ConflictResolutionDialogProps {
  visible: boolean
  conflicts: ImportConflict[]
  onResolve: (resolutions: Map<number, ConflictResolution>) => void
  onCancel: () => void
  loading?: boolean
}

interface TableRow {
  key: string
  index: number
  code: string
  newTag: string
  existingTag: string
  newProjectName: string
  existingProjectName: string
  newVersion: number
  existingVersions: string
  resolution: ConflictResolution | undefined
}

export default function ConflictResolutionDialog({
  visible,
  conflicts,
  onResolve,
  onCancel,
  loading = false,
}: ConflictResolutionDialogProps) {
  const [resolutions, setResolutions] = useState<Map<number, ConflictResolution>>(new Map())
  const [skipAll, setSkipAll] = useState(false)
  const [fillEmptyAll, setFillEmptyAll] = useState(false)
  const [overwriteAll, setOverwriteAll] = useState(false)

  // Преобразуем конфликты в строки таблицы
  const tableData: TableRow[] = useMemo(() => {
    return conflicts.map((conflict) => ({
      key: `${conflict.index}`,
      index: conflict.index,
      code: conflict.row.code,
      newTag: conflict.row.tag,
      existingTag: conflict.existingData.tag?.name || '',
      newProjectName: conflict.row.project_name || '',
      existingProjectName: conflict.existingData.project_name || '',
      newVersion: conflict.row.version_number,
      existingVersions:
        conflict.existingData.versions?.map((v) => v.version_number).join(', ') || 'Нет версий',
      resolution: skipAll
        ? 'skip'
        : fillEmptyAll
          ? 'fill_empty'
          : overwriteAll
            ? 'overwrite'
            : resolutions.get(conflict.index),
    }))
  }, [conflicts, resolutions, skipAll, fillEmptyAll, overwriteAll])

  // Обработка индивидуального решения
  const handleIndividualResolution = (index: number, resolution: ConflictResolution) => {
    const newResolutions = new Map(resolutions)
    newResolutions.set(index, resolution)
    setResolutions(newResolutions)
    clearAllStates()
  }

  // Очистка всех состояний массовых действий
  const clearAllStates = () => {
    setSkipAll(false)
    setFillEmptyAll(false)
    setOverwriteAll(false)
  }

  // Пропустить все
  const handleSkipAll = () => {
    setSkipAll(true)
    setFillEmptyAll(false)
    setOverwriteAll(false)
    setResolutions(new Map())
  }

  // Заполнить пустые столбцы для всех
  const handleFillEmptyAll = () => {
    setFillEmptyAll(true)
    setSkipAll(false)
    setOverwriteAll(false)
    setResolutions(new Map())
  }

  // Перезаписать все
  const handleOverwriteAll = () => {
    setOverwriteAll(true)
    setSkipAll(false)
    setFillEmptyAll(false)
    setResolutions(new Map())
  }

  // Применить решения
  const handleApply = () => {
    const finalResolutions = new Map<number, ConflictResolution>()

    conflicts.forEach((conflict) => {
      if (skipAll) {
        finalResolutions.set(conflict.index, 'skip')
      } else if (fillEmptyAll) {
        finalResolutions.set(conflict.index, 'fill_empty')
      } else if (overwriteAll) {
        finalResolutions.set(conflict.index, 'overwrite')
      } else if (resolutions.has(conflict.index)) {
        finalResolutions.set(conflict.index, resolutions.get(conflict.index)!)
      } else {
        // По умолчанию пропускаем, если решение не принято
        finalResolutions.set(conflict.index, 'skip')
      }
    })

    onResolve(finalResolutions)
  }

  // Проверка, все ли конфликты разрешены
  const allResolved = useMemo(() => {
    if (skipAll || fillEmptyAll || overwriteAll) return true
    return conflicts.every((c) => resolutions.has(c.index))
  }, [conflicts, resolutions, skipAll, fillEmptyAll, overwriteAll])

  const columns: ColumnsType<TableRow> = [
    {
      title: 'Шифр проекта',
      dataIndex: 'code',
      key: 'code',
      width: 150,
    },
    {
      title: 'Раздел',
      key: 'tag',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text type="secondary">Текущий:</Text>
            <Text>{record.existingTag || 'Не указан'}</Text>
          </Space>
          <Space>
            <Text type="secondary">Новый:</Text>
            <Text strong>{record.newTag}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Название проекта',
      key: 'projectName',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text type="secondary">Текущее:</Text>
            <Text>{record.existingProjectName || 'Не указано'}</Text>
          </Space>
          <Space>
            <Text type="secondary">Новое:</Text>
            <Text strong>{record.newProjectName || 'Не указано'}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Версии',
      key: 'versions',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size="small">
          <Space>
            <Text type="secondary">Существующие:</Text>
            <Text>{record.existingVersions}</Text>
          </Space>
          <Space>
            <Text type="secondary">Новая:</Text>
            <Text strong>{record.newVersion}</Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Действие',
      key: 'resolution',
      width: 180,
      align: 'center',
      render: (_, record) => {
        const resolution = record.resolution

        if (resolution === 'skip') {
          return <Tag color="orange">Пропустить</Tag>
        }
        if (resolution === 'fill_empty') {
          return <Tag color="blue">Заполнить пустые</Tag>
        }
        if (resolution === 'overwrite') {
          return <Tag color="green">Перезаписать</Tag>
        }

        const isDisabled = skipAll || fillEmptyAll || overwriteAll

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            <Space size="small">
              <Tooltip title="Пропустить эту запись">
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => handleIndividualResolution(record.index, 'skip')}
                  disabled={isDisabled}
                />
              </Tooltip>
              <Tooltip title="Заполнить только пустые поля">
                <Button
                  size="small"
                  icon={<FileTextOutlined />}
                  onClick={() => handleIndividualResolution(record.index, 'fill_empty')}
                  disabled={isDisabled}
                />
              </Tooltip>
              <Tooltip title="Перезаписать существующую запись">
                <Button
                  size="small"
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => handleIndividualResolution(record.index, 'overwrite')}
                  disabled={isDisabled}
                />
              </Tooltip>
            </Space>
          </Space>
        )
      },
    },
  ]

  return (
    <Modal
      title="Обнаружены конфликты при импорте"
      open={visible}
      onCancel={onCancel}
      width={1200}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>,
        <Button
          key="skipAll"
          icon={<CloseOutlined />}
          onClick={handleSkipAll}
          disabled={loading}
          type={skipAll ? 'primary' : 'default'}
        >
          Пропустить все
        </Button>,
        <Button
          key="fillEmptyAll"
          icon={<FileTextOutlined />}
          onClick={handleFillEmptyAll}
          disabled={loading}
          type={fillEmptyAll ? 'primary' : 'default'}
        >
          Заполнить пустые
        </Button>,
        <Button
          key="overwriteAll"
          icon={<EditOutlined />}
          onClick={handleOverwriteAll}
          disabled={loading}
          type={overwriteAll ? 'primary' : 'default'}
        >
          Перезаписать все
        </Button>,
        <Button
          key="apply"
          type="primary"
          onClick={handleApply}
          loading={loading}
          disabled={!allResolved}
        >
          Применить
        </Button>,
      ]}
    >
      <Alert
        message="Найдены записи с одинаковыми шифрами проектов"
        description={
          <div>
            <p>Выберите действие для каждой записи:</p>
            <ul>
              <li>
                <strong>Пропустить</strong> - не импортировать эту запись
              </li>
              <li>
                <strong>Заполнить пустые</strong> - заполнить только пустые поля, не трогая
                существующие данные
              </li>
              <li>
                <strong>Перезаписать</strong> - полностью заменить существующую запись (сохраняя
                UUID)
              </li>
            </ul>
          </div>
        }
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Table
        columns={columns}
        dataSource={tableData}
        pagination={false}
        scroll={{ y: 400 }}
        size="small"
      />

      {(skipAll || fillEmptyAll || overwriteAll) && (
        <Alert
          message={
            skipAll
              ? 'Все конфликтные записи будут пропущены'
              : fillEmptyAll
                ? 'Для всех записей будут заполнены только пустые поля, существующие данные останутся неизменными'
                : 'Все существующие записи будут полностью перезаписаны (с сохранением UUID)'
          }
          type={skipAll ? 'warning' : fillEmptyAll ? 'info' : 'success'}
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  )
}
