import { useState, useEffect } from 'react'
import { Modal, Table, Space, Button, Input, Select, Tag, message, Form } from 'antd'
import { DeleteOutlined, EditOutlined } from '@ant-design/icons'
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
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingSet, setEditingSet] = useState<ChessboardSetTableRow | null>(null)
  const [form] = Form.useForm()

  // Обновляем фильтр проекта при изменении projectId
  useEffect(() => {
    setSearchFilters(prev => ({
      ...prev,
      project_id: projectId,
    }))
  }, [projectId])

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

  // Открытие модального окна редактирования
  const handleEdit = (record: ChessboardSetTableRow) => {
    setEditingSet(record)
    form.setFieldsValue({
      name: record.name,
    })
    setEditModalOpen(true)
  }

  // Сохранение изменений комплекта
  const handleSaveEdit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingSet) {
        await chessboardSetsApi.updateSet(editingSet.id, {
          name: values.name,
        })
        
        message.success('Комплект обновлен')
        setEditModalOpen(false)
        setEditingSet(null)
        form.resetFields()
        refetch()
      }
    } catch (error) {
      console.error('Ошибка обновления комплекта:', error)
      message.error('Ошибка при обновлении комплекта')
    }
  }

  // Закрытие модального окна редактирования
  const handleCancelEdit = () => {
    setEditModalOpen(false)
    setEditingSet(null)
    form.resetFields()
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
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button size="small" onClick={() => handleSelectSet(record.id)} type="link">
            Применить
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            title="Редактировать комплект"
          />
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

      {/* Модальное окно редактирования комплекта */}
      <Modal
        title="Редактирование комплекта"
        open={editModalOpen}
        onOk={handleSaveEdit}
        onCancel={handleCancelEdit}
        okText="Сохранить"
        cancelText="Отмена"
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          style={{ marginTop: 20 }}
        >
          <Form.Item
            name="name"
            label="Название комплекта"
            rules={[{ required: false }]}
          >
            <Input placeholder="Введите название комплекта" />
          </Form.Item>
          
          {editingSet && (
            <div style={{ marginTop: 20 }}>
              <h4>Информация о комплекте:</h4>
              <p><strong>Номер:</strong> {editingSet.set_number}</p>
              <p><strong>Проект:</strong> {editingSet.project_name}</p>
              <p><strong>Шифр документа:</strong> {editingSet.documentation_code}</p>
              <p><strong>Раздел:</strong> {editingSet.tag_name || 'Все'}</p>
              <p><strong>Корпуса:</strong> {editingSet.block_names || 'Все'}</p>
              <p><strong>Категории затрат:</strong> {editingSet.cost_category_names || 'Все'}</p>
              <p><strong>Виды затрат:</strong> {editingSet.cost_type_names || 'Все'}</p>
              <p style={{ marginTop: 10, fontSize: 12, color: '#888' }}>
                Примечание: В текущей версии можно редактировать только название комплекта. 
                Для изменения фильтров создайте новый комплект.
              </p>
            </div>
          )}
        </Form>
      </Modal>
    </Modal>
  )
}
