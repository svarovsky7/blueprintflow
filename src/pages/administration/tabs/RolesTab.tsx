import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  message,
  Tag,
  Popconfirm,
  ColorPicker,
  InputNumber,
} from 'antd'
import type { Color } from 'antd/es/color-picker'
import { EditOutlined, DeleteOutlined, PlusOutlined, SafetyOutlined } from '@ant-design/icons'
import { getRoles, createRole, updateRole, deleteRole } from '@/entities/roles'
import { createPermissionsForAllObjects } from '@/entities/permissions/api/permissions-api'
import type { Role, CreateRoleDto, UpdateRoleDto } from '@/entities/roles'
import type { ColumnsType } from 'antd/es/table'

export default function RolesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const createMutation = useMutation({
    mutationFn: async (dto: CreateRoleDto) => {
      const role = await createRole(dto)
      await createPermissionsForAllObjects(role.id)
      return role
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      message.success('Роль создана и разрешения инициализированы')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRoleDto }) => updateRole(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      message.success('Роль обновлена')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteRole,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      message.success('Роль удалена')
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const handleAdd = () => {
    setEditingRole(null)
    form.resetFields()
    form.setFieldsValue({ color: '#1890ff', access_level: 0 })
    setIsModalOpen(true)
  }

  const handleEdit = (role: Role) => {
    setEditingRole(role)
    form.setFieldsValue(role)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingRole(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const dto = {
        name: values.name,
        code: values.code,
        description: values.description,
        access_level: values.access_level || 0,
        color: values.color,
      }

      if (editingRole) {
        updateMutation.mutate({ id: editingRole.id, data: dto })
      } else {
        createMutation.mutate(dto)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<Role> = [
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Tag color={record.color}>{text}</Tag>
          {record.is_system && <Tag color="orange">Системная</Tag>}
        </Space>
      ),
      sorter: (a, b) => a.name.localeCompare(b.name),
    },
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      sorter: (a, b) => a.code.localeCompare(b.code),
    },
    {
      title: 'Уровень доступа',
      dataIndex: 'access_level',
      key: 'access_level',
      width: 150,
      render: (level: number) => <Tag color={level >= 100 ? 'red' : 'blue'}>{level}</Tag>,
      sorter: (a, b) => b.access_level - a.access_level,
      defaultSortOrder: 'ascend',
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
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
            title="Удалить роль?"
            description="Это действие нельзя отменить"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Да"
            cancelText="Нет"
            disabled={record.is_system}
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

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить роль
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={roles}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />

      <Modal
        title={editingRole ? 'Редактирование роли' : 'Создание роли'}
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
            <Input placeholder="Администратор" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код' },
              { pattern: /^[a-z0-9_-]+$/, message: 'Только a-z, 0-9, _, -' },
            ]}
          >
            <Input placeholder="administrator" disabled={editingRole?.is_system} />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание роли" />
          </Form.Item>

          <Form.Item
            name="access_level"
            label="Уровень доступа"
            tooltip="0=обычный, 100=супер-админ"
          >
            <InputNumber min={0} max={100} step={10} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="color" label="Цвет">
            <ColorPicker
              showText
              format="hex"
              onChange={(color: Color) => {
                form.setFieldValue('color', color.toHexString())
              }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
