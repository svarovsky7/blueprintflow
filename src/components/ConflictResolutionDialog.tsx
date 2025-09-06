import { useState, useMemo } from 'react'
import { Modal, Table, Button, Space, Tag, Typography, Alert } from 'antd'
import { CheckOutlined, CloseOutlined } from '@ant-design/icons'
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
  const [acceptAll, setAcceptAll] = useState(false)
  const [skipAll, setSkipAll] = useState(false)

  // Преобразуем конфликты в строки таблицы
  const tableData: TableRow[] = useMemo(() => {
    return conflicts.map((conflict) => ({
      key: `${conflict.index}`,
      index: conflict.index,
      code: conflict.row.code,
      newTag: conflict.row.tag,
      existingTag: conflict.existingData.tag?.name || '',
      newVersion: conflict.row.version_number,
      existingVersions:
        conflict.existingData.versions?.map((v) => v.version_number).join(', ') || 'Нет версий',
      resolution: acceptAll ? 'accept' : skipAll ? 'skip' : resolutions.get(conflict.index),
    }))
  }, [conflicts, resolutions, acceptAll, skipAll])

  // Обработка индивидуального решения
  const handleIndividualResolution = (index: number, resolution: ConflictResolution) => {
    const newResolutions = new Map(resolutions)
    newResolutions.set(index, resolution)
    setResolutions(newResolutions)
    setAcceptAll(false)
    setSkipAll(false)
  }

  // Принять все
  const handleAcceptAll = () => {
    setAcceptAll(true)
    setSkipAll(false)
    setResolutions(new Map())
  }

  // Пропустить все
  const handleSkipAll = () => {
    setSkipAll(true)
    setAcceptAll(false)
    setResolutions(new Map())
  }

  // Применить решения
  const handleApply = () => {
    const finalResolutions = new Map<number, ConflictResolution>()

    conflicts.forEach((conflict) => {
      if (acceptAll) {
        finalResolutions.set(conflict.index, 'accept')
      } else if (skipAll) {
        finalResolutions.set(conflict.index, 'skip')
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
    if (acceptAll || skipAll) return true
    return conflicts.every((c) => resolutions.has(c.index))
  }, [conflicts, resolutions, acceptAll, skipAll])

  const columns: ColumnsType<TableRow> = [
    {
      title: 'Шифр проекта',
      dataIndex: 'code',
      key: 'code',
      width: 200,
    },
    {
      title: 'Раздел',
      key: 'tag',
      width: 250,
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
      title: 'Решение',
      key: 'resolution',
      width: 150,
      align: 'center',
      render: (_, record) => {
        const resolution = record.resolution

        if (resolution === 'accept') {
          return <Tag color="green">Принять</Tag>
        }
        if (resolution === 'skip') {
          return <Tag color="orange">Пропустить</Tag>
        }

        return (
          <Space size="small">
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleIndividualResolution(record.index, 'accept')}
              disabled={acceptAll || skipAll}
            >
              Принять
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={() => handleIndividualResolution(record.index, 'skip')}
              disabled={acceptAll || skipAll}
            >
              Пропустить
            </Button>
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
      width={900}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Отмена
        </Button>,
        <Button
          key="skipAll"
          onClick={handleSkipAll}
          disabled={loading}
          type={skipAll ? 'primary' : 'default'}
        >
          Пропустить все
        </Button>,
        <Button
          key="acceptAll"
          onClick={handleAcceptAll}
          disabled={loading}
          type={acceptAll ? 'primary' : 'default'}
        >
          Принять все
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
        description="Выберите действие для каждой записи: заменить существующую или пропустить импорт."
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

      {(acceptAll || skipAll) && (
        <Alert
          message={
            acceptAll
              ? 'Все существующие записи будут заменены новыми данными'
              : 'Все конфликтные записи будут пропущены'
          }
          type={acceptAll ? 'info' : 'warning'}
          style={{ marginTop: 16 }}
        />
      )}
    </Modal>
  )
}
