import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Switch,
  InputNumber,
} from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  getPortalObjects,
  createPortalObject,
  updatePortalObject,
  deletePortalObject,
} from '@/entities/portal-objects/api/portal-objects-api'
import type {
  PortalObject,
  CreatePortalObjectDto,
  UpdatePortalObjectDto,
  PortalObjectType,
} from '@/entities/portal-objects/model/types'
import type { ColumnsType } from 'antd/es/table'
import { parseNumberWithSeparators } from '@/shared/lib'

const OBJECT_TYPES: { label: string; value: PortalObjectType }[] = [
  { label: 'Страница', value: 'page' },
  { label: 'Раздел', value: 'section' },
  { label: 'Функция', value: 'feature' },
  { label: 'Действие', value: 'action' },
]

const TYPE_COLORS: Record<PortalObjectType, string> = {
  page: 'blue',
  section: 'green',
  feature: 'orange',
  action: 'purple',
}

export default function PortalObjectsTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingObject, setEditingObject] = useState<PortalObject | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: objects = [], isLoading } = useQuery({
    queryKey: ['portal-objects'],
    queryFn: () => getPortalObjects(),
  })

  const createMutation = useMutation({
    mutationFn: createPortalObject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-objects'] })
      message.success('Объект создан')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePortalObjectDto }) =>
      updatePortalObject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-objects'] })
      message.success('Объект обновлен')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePortalObject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portal-objects'] })
      message.success('Объект удален')
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const handleAdd = () => {
    setEditingObject(null)
    form.resetFields()
    form.setFieldsValue({
      is_visible: true,
      sort_order: 0,
    })
    setIsModalOpen(true)
  }

  const handleEdit = (object: PortalObject) => {
    setEditingObject(object)
    form.setFieldsValue(object)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingObject(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const dto: CreatePortalObjectDto = {
        name: values.name,
        code: values.code,
        object_type: values.object_type,
        description: values.description,
        route_path: values.route_path,
        parent_id: values.parent_id,
        icon: values.icon,
        sort_order: values.sort_order || 0,
        is_visible: values.is_visible !== undefined ? values.is_visible : true,
      }

      if (editingObject) {
        updateMutation.mutate({ id: editingObject.id, data: dto })
      } else {
        createMutation.mutate(dto)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<PortalObject> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 200,
    },
    {
      title: 'Тип',
      dataIndex: 'object_type',
      key: 'object_type',
      width: 120,
      render: (type: PortalObjectType) => (
        <Tag color={TYPE_COLORS[type]}>
          {OBJECT_TYPES.find((t) => t.value === type)?.label || type}
        </Tag>
      ),
      filters: OBJECT_TYPES.map((t) => ({ text: t.label, value: t.value })),
      onFilter: (value, record) => record.object_type === value,
    },
    {
      title: 'Путь',
      dataIndex: 'route_path',
      key: 'route_path',
      ellipsis: true,
      width: 250,
    },
    {
      title: 'Видимость',
      dataIndex: 'is_visible',
      key: 'is_visible',
      width: 100,
      render: (visible: boolean) => (
        <Tag color={visible ? 'green' : 'red'}>{visible ? 'Да' : 'Нет'}</Tag>
      ),
      filters: [
        { text: 'Видимый', value: true },
        { text: 'Скрытый', value: false },
      ],
      onFilter: (value, record) => record.is_visible === value,
    },
    {
      title: 'Системный',
      dataIndex: 'is_system',
      key: 'is_system',
      width: 110,
      render: (isSystem: boolean) => (
        <Tag color={isSystem ? 'red' : 'default'}>{isSystem ? 'Да' : 'Нет'}</Tag>
      ),
    },
    {
      title: 'Порядок',
      dataIndex: 'sort_order',
      key: 'sort_order',
      width: 100,
      sorter: (a, b) => a.sort_order - b.sort_order,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            disabled={record.is_system}
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить объект?"
            description="Это действие нельзя отменить"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              disabled={record.is_system}
              title="Удалить"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const parentOptions = objects
    .filter((obj) => obj.object_type === 'page' || obj.object_type === 'section')
    .map((obj) => ({ label: obj.name, value: obj.id }))

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить объект
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={objects}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />

      <Modal
        title={editingObject ? 'Редактирование объекта портала' : 'Создание объекта портала'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Название"
            rules={[{ required: true, message: 'Введите название' }]}
          >
            <Input placeholder="Название объекта" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код"
            rules={[{ required: true, message: 'Введите код' }]}
          >
            <Input placeholder="unique_code" disabled={!!editingObject} />
          </Form.Item>

          <Form.Item
            name="object_type"
            label="Тип объекта"
            rules={[{ required: true, message: 'Выберите тип' }]}
          >
            <Select
              placeholder="Выберите тип"
              options={OBJECT_TYPES}
              disabled={!!editingObject}
            />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание объекта" />
          </Form.Item>

          <Form.Item name="route_path" label="Путь маршрута">
            <Input placeholder="/path/to/page" />
          </Form.Item>

          <Form.Item name="parent_id" label="Родительский объект">
            <Select
              placeholder="Не выбрано"
              options={parentOptions}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item name="icon" label="Иконка">
            <Input placeholder="IconName" />
          </Form.Item>

          <Form.Item name="sort_order" label="Порядок сортировки">
            <InputNumber min={0} style={{ width: '100%' }} parser={parseNumberWithSeparators} />
          </Form.Item>

          <Form.Item name="is_visible" label="Видимость" valuePropName="checked">
            <Switch checkedChildren="Видимый" unCheckedChildren="Скрытый" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
