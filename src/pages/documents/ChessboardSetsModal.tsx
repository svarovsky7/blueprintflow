import { useState } from 'react'
import { Modal, Table, Space, Button, Input, Select, Tag, message } from 'antd'
import { DeleteOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import {
  chessboardSetsApi,
  type ChessboardSetTableRow,
  type ChessboardSetSearchFilters,
} from '@/entities/chessboard'

interface ChessboardSetsModalProps {
  open: boolean
  onClose: () => void
  projectId?: string
  onSelectSet?: (setId: string) => void
}

export default function ChessboardSetsModal({
  open,
  onClose,
  projectId,
  onSelectSet,
}: ChessboardSetsModalProps) {
  const [searchFilters, setSearchFilters] = useState<ChessboardSetSearchFilters>({
    project_id: projectId,
  })

  // Загрузка комплектов
  const {
    data: sets,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['chessboard-sets', searchFilters],
    queryFn: () => chessboardSetsApi.getSets(searchFilters),
    enabled: open && !!projectId,
  })

  // Удаление комплекта
  const handleDelete = async (setId: string) => {
    try {
      await chessboardSetsApi.deleteSet(setId)
      message.success('Комплект удален')
      refetch()
    } catch (error) {
      console.error('Ошибка удаления комплекта:', error)
      message.error('Ошибка при удалении комплекта')
    }
  }

  // Выбор комплекта для применения фильтров
  const handleSelectSet = (setId: string) => {
    onSelectSet?.(setId)
    onClose()
  }

  const columns: ColumnsType<ChessboardSetTableRow> = [
    {
      title: 'Номер комплекта',
      dataIndex: 'set_number',
      key: 'set_number',
      width: 150,
      sorter: true,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      width: 200,
      render: (name) => name || '-',
    },
    {
      title: 'Шифр проекта',
      dataIndex: 'documentation_code',
      key: 'documentation_code',
      width: 150,
    },
    {
      title: 'Версия',
      dataIndex: 'version_number',
      key: 'version_number',
      width: 80,
      align: 'center',
    },
    {
      title: 'Раздел',
      dataIndex: 'tag_name',
      key: 'tag_name',
      width: 150,
      render: (tagName) => tagName || 'Все',
    },
    {
      title: 'Корпуса',
      dataIndex: 'block_names',
      key: 'block_names',
      width: 120,
      render: (blockNames) => blockNames || 'Все',
    },
    {
      title: 'Категории затрат',
      dataIndex: 'cost_category_names',
      key: 'cost_category_names',
      width: 150,
      render: (categoryNames) => categoryNames || 'Все',
    },
    {
      title: 'Виды затрат',
      dataIndex: 'cost_type_names',
      key: 'cost_type_names',
      width: 150,
      render: (typeNames) => typeNames || 'Все',
    },
    {
      title: 'Статус',
      dataIndex: 'status_name',
      key: 'status_name',
      width: 120,
      render: (statusName, record) => <Tag color={record.status_color}>{statusName}</Tag>,
      filters: Array.from(new Set(sets?.map((s) => s.status_name))).map((status) => ({
        text: status,
        value: status,
      })),
      onFilter: (value, record) => record.status_name === value,
    },
    {
      title: 'Дата создания',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      render: (date) => new Date(date).toLocaleDateString('ru'),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => handleSelectSet(record.id)} type="link">
            Применить
          </Button>
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
            title="Удалить комплект"
          />
        </Space>
      ),
    },
  ]

  return (
    <Modal
      title={`Комплекты шахматок для проекта`}
      open={open}
      onCancel={onClose}
      width={1400}
      footer={null}
    >
      {/* Фильтры */}
      <Space style={{ marginBottom: 16 }}>
        <Input.Search
          placeholder="Поиск по номеру или названию"
          style={{ width: 250 }}
          value={searchFilters.search}
          onChange={(e) => setSearchFilters((prev) => ({ ...prev, search: e.target.value }))}
          allowClear
        />
        <Select
          placeholder="Статус"
          style={{ width: 150 }}
          value={searchFilters.status_id}
          onChange={(statusId) => setSearchFilters((prev) => ({ ...prev, status_id: statusId }))}
          allowClear
          options={Array.from(
            new Set(sets?.map((s) => ({ id: s.status_name, name: s.status_name }))),
          ).map((status) => ({
            value: status.id,
            label: status.name,
          }))}
        />
        <Select
          placeholder="Шифр проекта"
          style={{ width: 200 }}
          value={searchFilters.documentation_id}
          onChange={(docId) => setSearchFilters((prev) => ({ ...prev, documentation_id: docId }))}
          allowClear
          options={Array.from(
            new Set(
              sets?.map((s) => ({
                id: s.documentation_code,
                name: s.documentation_code,
              })),
            ),
          ).map((doc) => ({
            value: doc.id,
            label: doc.name,
          }))}
        />
      </Space>

      <Table
        columns={columns}
        dataSource={sets}
        loading={isLoading}
        rowKey="id"
        scroll={{ x: 1200, y: 400 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
        size="small"
      />
    </Modal>
  )
}
