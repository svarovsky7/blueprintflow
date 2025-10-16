import React, { useState, useMemo } from 'react'
import { Modal, Table, Space, message, Select, DatePicker, Button, Tag, Descriptions, Typography } from 'antd'
import { DownloadOutlined, FilterOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import dayjs, { Dayjs } from 'dayjs'
import { getVorSetDiff, type VorSetDiff, type ChangeLogEntry } from '@/entities/chessboard'
import type { ColumnsType } from 'antd/es/table'

const { RangePicker } = DatePicker
const { Text } = Typography

interface VorChangesModalProps {
  visible: boolean
  onCancel: () => void
  vorId: string
  vorName?: string
}

type ChangeType = 'INSERT' | 'UPDATE' | 'DELETE'

const VorChangesModal: React.FC<VorChangesModalProps> = ({
  visible,
  onCancel,
  vorId,
  vorName,
}) => {
  const [messageApi, contextHolder] = message.useMessage()

  // Фильтры
  const [changeTypeFilter, setChangeTypeFilter] = useState<ChangeType | undefined>(undefined)
  const [dateRange, setDateRange] = useState<[Dayjs | null, Dayjs | null] | null>(null)
  const [authorFilter, setAuthorFilter] = useState<string | undefined>(undefined)

  // Загружаем diff данные
  const { data: diffData, isLoading } = useQuery<VorSetDiff | null>({
    queryKey: ['vor-set-diff', vorId],
    queryFn: () => getVorSetDiff(vorId),
    enabled: visible && !!vorId,
  })

  // Объединяем все изменения в один массив
  const allChanges = useMemo(() => {
    if (!diffData) return []

    const changes: ChangeLogEntry[] = []

    // Добавленные строки
    diffData.added.forEach((entry) => {
      changes.push({
        ...entry,
        change_type: 'INSERT' as ChangeType,
      })
    })

    // Измененные строки
    diffData.modified.forEach((entry) => {
      changes.push({
        ...entry,
        change_type: 'UPDATE' as ChangeType,
      })
    })

    // Удаленные строки
    diffData.deleted.forEach((entry) => {
      changes.push({
        ...entry,
        change_type: 'DELETE' as ChangeType,
      })
    })

    return changes
  }, [diffData])

  // Применяем фильтры
  const filteredChanges = useMemo(() => {
    let result = [...allChanges]

    // Фильтр по типу изменения
    if (changeTypeFilter) {
      result = result.filter((change) => change.change_type === changeTypeFilter)
    }

    // Фильтр по дате
    if (dateRange && dateRange[0] && dateRange[1]) {
      result = result.filter((change) => {
        const changeDate = dayjs(change.changed_at)
        return (
          changeDate.isAfter(dateRange[0]) &&
          changeDate.isBefore(dateRange[1].add(1, 'day'))
        )
      })
    }

    // Фильтр по автору
    if (authorFilter) {
      result = result.filter((change) => change.changed_by_name?.includes(authorFilter))
    }

    return result.sort((a, b) =>
      dayjs(b.changed_at).diff(dayjs(a.changed_at))
    )
  }, [allChanges, changeTypeFilter, dateRange, authorFilter])

  // Уникальные авторы для фильтра
  const uniqueAuthors = useMemo(() => {
    const authors = new Set<string>()
    allChanges.forEach((change) => {
      if (change.changed_by_name) {
        authors.add(change.changed_by_name)
      }
    })
    return Array.from(authors).sort()
  }, [allChanges])

  // Получить цвет тега в зависимости от типа изменения
  const getChangeTypeColor = (type: ChangeType): string => {
    switch (type) {
      case 'INSERT':
        return 'green'
      case 'UPDATE':
        return 'orange'
      case 'DELETE':
        return 'red'
      default:
        return 'default'
    }
  }

  // Получить текст для типа изменения
  const getChangeTypeText = (type: ChangeType): string => {
    switch (type) {
      case 'INSERT':
        return 'Добавлено'
      case 'UPDATE':
        return 'Изменено'
      case 'DELETE':
        return 'Удалено'
      default:
        return type
    }
  }

  // Обработчик экспорта в Excel
  const handleExport = () => {
    if (filteredChanges.length === 0) {
      messageApi.warning('Нет данных для экспорта')
      return
    }

    try {
      // Подготовка данных для экспорта
      const exportData = filteredChanges.map((change) => {
        const snapshot = change.snapshot_data as any

        return {
          'Тип изменения': getChangeTypeText(change.change_type),
          'Дата изменения': dayjs(change.changed_at).format('DD.MM.YYYY HH:mm'),
          Автор: change.changed_by_name || 'Не указан',
          Материал: snapshot?.material || '-',
          'Ед.Изм.': snapshot?.unit || '-',
          'Кол-во ПД': snapshot?.quantityPd || '-',
          'Кол-во Спецификация': snapshot?.quantitySpec || '-',
          'Кол-во РД': snapshot?.quantityRd || '-',
          Блок: snapshot?.block || '-',
          'Категория затрат': snapshot?.cost_category || '-',
          'Вид затрат': snapshot?.cost_type || '-',
          Локация: snapshot?.location || '-',
        }
      })

      // Создание workbook
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Изменения')

      // Скачивание файла
      const fileName = `ВОР_${vorName || vorId}_изменения_${dayjs().format('YYYY-MM-DD')}.xlsx`
      XLSX.writeFile(wb, fileName)

      messageApi.success('Файл успешно экспортирован')
    } catch (error) {
      console.error('Ошибка экспорта:', error)
      messageApi.error('Ошибка при экспорте файла')
    }
  }

  // Сброс всех фильтров
  const handleResetFilters = () => {
    setChangeTypeFilter(undefined)
    setDateRange(null)
    setAuthorFilter(undefined)
  }

  // Колонки таблицы
  const columns: ColumnsType<ChangeLogEntry> = [
    {
      title: 'Тип',
      dataIndex: 'change_type',
      key: 'change_type',
      width: 120,
      render: (type: ChangeType) => (
        <Tag color={getChangeTypeColor(type)}>{getChangeTypeText(type)}</Tag>
      ),
    },
    {
      title: 'Дата изменения',
      dataIndex: 'changed_at',
      key: 'changed_at',
      width: 160,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm'),
    },
    {
      title: 'Автор',
      dataIndex: 'changed_by_name',
      key: 'changed_by_name',
      width: 200,
      render: (name: string | null) => name || 'Не указан',
    },
    {
      title: 'Детали изменения',
      key: 'details',
      render: (_, record) => {
        const snapshot = record.snapshot_data as any
        const oldSnapshot = record.old_snapshot_data as any

        return (
          <Descriptions size="small" column={1} bordered>
            <Descriptions.Item label="Материал">
              {record.change_type === 'UPDATE' && oldSnapshot?.material !== snapshot?.material ? (
                <Space>
                  <Text delete>{oldSnapshot?.material || '-'}</Text>
                  <Text strong>{snapshot?.material || '-'}</Text>
                </Space>
              ) : (
                snapshot?.material || '-'
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Ед.Изм.">
              {record.change_type === 'UPDATE' && oldSnapshot?.unit !== snapshot?.unit ? (
                <Space>
                  <Text delete>{oldSnapshot?.unit || '-'}</Text>
                  <Text strong>{snapshot?.unit || '-'}</Text>
                </Space>
              ) : (
                snapshot?.unit || '-'
              )}
            </Descriptions.Item>

            <Descriptions.Item label="Количества">
              <Space direction="vertical" size="small">
                {record.change_type === 'UPDATE' && oldSnapshot?.quantityPd !== snapshot?.quantityPd ? (
                  <div>
                    <Text type="secondary">ПД: </Text>
                    <Text delete>{oldSnapshot?.quantityPd || '0'}</Text>
                    {' → '}
                    <Text strong>{snapshot?.quantityPd || '0'}</Text>
                  </div>
                ) : (
                  <div>
                    <Text type="secondary">ПД: </Text>
                    {snapshot?.quantityPd || '0'}
                  </div>
                )}

                {record.change_type === 'UPDATE' && oldSnapshot?.quantitySpec !== snapshot?.quantitySpec ? (
                  <div>
                    <Text type="secondary">Спецификация: </Text>
                    <Text delete>{oldSnapshot?.quantitySpec || '0'}</Text>
                    {' → '}
                    <Text strong>{snapshot?.quantitySpec || '0'}</Text>
                  </div>
                ) : (
                  <div>
                    <Text type="secondary">Спецификация: </Text>
                    {snapshot?.quantitySpec || '0'}
                  </div>
                )}

                {record.change_type === 'UPDATE' && oldSnapshot?.quantityRd !== snapshot?.quantityRd ? (
                  <div>
                    <Text type="secondary">РД: </Text>
                    <Text delete>{oldSnapshot?.quantityRd || '0'}</Text>
                    {' → '}
                    <Text strong>{snapshot?.quantityRd || '0'}</Text>
                  </div>
                ) : (
                  <div>
                    <Text type="secondary">РД: </Text>
                    {snapshot?.quantityRd || '0'}
                  </div>
                )}
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Категория/Вид">
              <Space direction="vertical" size="small">
                <div>
                  <Text type="secondary">Категория: </Text>
                  {snapshot?.cost_category || '-'}
                </div>
                <div>
                  <Text type="secondary">Вид: </Text>
                  {snapshot?.cost_type || '-'}
                </div>
              </Space>
            </Descriptions.Item>

            <Descriptions.Item label="Блок/Локация">
              <Space direction="vertical" size="small">
                <div>
                  <Text type="secondary">Блок: </Text>
                  {snapshot?.block || '-'}
                </div>
                <div>
                  <Text type="secondary">Локация: </Text>
                  {snapshot?.location || '-'}
                </div>
              </Space>
            </Descriptions.Item>
          </Descriptions>
        )
      },
    },
  ]

  return (
    <>
      {contextHolder}
      <Modal
        title={
          <Space>
            <span>История изменений шахматки</span>
            {vorName && <Text type="secondary">({vorName})</Text>}
          </Space>
        }
        open={visible}
        onCancel={onCancel}
        width={1200}
        footer={[
          <Button key="export" icon={<DownloadOutlined />} onClick={handleExport}>
            Экспорт в Excel
          </Button>,
          <Button key="close" onClick={onCancel}>
            Закрыть
          </Button>,
        ]}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Фильтры */}
          <Space wrap>
            <Select
              placeholder="Тип изменения"
              value={changeTypeFilter}
              onChange={setChangeTypeFilter}
              style={{ width: 160 }}
              allowClear
            >
              <Select.Option value="INSERT">
                <Tag color="green">Добавлено</Tag>
              </Select.Option>
              <Select.Option value="UPDATE">
                <Tag color="orange">Изменено</Tag>
              </Select.Option>
              <Select.Option value="DELETE">
                <Tag color="red">Удалено</Tag>
              </Select.Option>
            </Select>

            <RangePicker
              placeholder={['Дата от', 'Дата до']}
              value={dateRange}
              onChange={setDateRange}
              format="DD.MM.YYYY"
              style={{ width: 260 }}
            />

            <Select
              placeholder="Автор изменения"
              value={authorFilter}
              onChange={setAuthorFilter}
              style={{ width: 200 }}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const text = option?.children?.toString() || ''
                return text.toLowerCase().includes(input.toLowerCase())
              }}
            >
              {uniqueAuthors.map((author) => (
                <Select.Option key={author} value={author}>
                  {author}
                </Select.Option>
              ))}
            </Select>

            <Button icon={<FilterOutlined />} onClick={handleResetFilters}>
              Сбросить фильтры
            </Button>
          </Space>

          {/* Статистика */}
          <Space>
            <Text strong>Всего изменений: {allChanges.length}</Text>
            <Text type="secondary">|</Text>
            <Text>
              <Tag color="green">Добавлено: {diffData?.added.length || 0}</Tag>
            </Text>
            <Text>
              <Tag color="orange">Изменено: {diffData?.modified.length || 0}</Tag>
            </Text>
            <Text>
              <Tag color="red">Удалено: {diffData?.deleted.length || 0}</Tag>
            </Text>
          </Space>

          {/* Таблица изменений */}
          <Table
            columns={columns}
            dataSource={filteredChanges}
            rowKey="id"
            loading={isLoading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) =>
                `${range[0]}-${range[1]} из ${total} изменений`,
            }}
            scroll={{ y: 500 }}
            size="small"
          />
        </Space>
      </Modal>
    </>
  )
}

export default VorChangesModal
