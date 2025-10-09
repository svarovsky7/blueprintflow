import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Switch,
  message,
  Badge,
  Popconfirm,
  Tag,
} from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getUsers, updateUser, deleteUser, deactivateUser, activateUser } from '@/entities/users'
import type { User, UpdateUserDto } from '@/entities/users'
import type { ColumnsType } from 'antd/es/table'

export default function UsersTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserDto }) => updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Пользователь обновлен')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Пользователь удален')
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      active ? activateUser(id) : deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      message.success('Статус изменен')
    },
  })

  const handleEdit = (user: User) => {
    setEditingUser(user)
    form.setFieldsValue(user)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingUser(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      if (editingUser) {
        updateMutation.mutate({ id: editingUser.id, data: values })
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const pendingUsersCount = users.filter((u) => !u.is_active).length

  const columns: ColumnsType<User> = [
    {
      title: 'ФИО',
      key: 'full_name',
      render: (_, record) => (
        <Space>
          {!record.is_active && <Badge status="warning" />}
          {`${record.last_name} ${record.first_name}${record.middle_name ? ' ' + record.middle_name : ''}`}
        </Space>
      ),
      sorter: (a, b) => a.last_name.localeCompare(b.last_name),
    },
    {
      title: 'Должность',
      dataIndex: 'position',
      key: 'position',
      sorter: (a, b) => (a.position || '').localeCompare(b.position || ''),
    },
    {
      title: 'Отдел',
      dataIndex: 'department',
      key: 'department',
      sorter: (a, b) => (a.department || '').localeCompare(b.department || ''),
    },
    {
      title: 'Статус',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active: boolean, record) => (
        <Switch
          checked={active}
          onChange={(checked) => toggleActiveMutation.mutate({ id: record.id, active: checked })}
          checkedChildren="Активен"
          unCheckedChildren="Отключен"
        />
      ),
      filters: [
        { text: 'Активен', value: true },
        { text: 'Отключен', value: false },
      ],
      onFilter: (value, record) => record.is_active === value,
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
            title="Редактировать"
          />
          <Popconfirm
            title="Удалить пользователя?"
            description="Это действие нельзя отменить"
            onConfirm={() => deleteMutation.mutate(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="text" danger icon={<DeleteOutlined />} title="Удалить" />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <>
      {pendingUsersCount > 0 && (
        <div style={{ marginBottom: 16 }}>
          <Tag color="warning">Неактивных пользователей: {pendingUsersCount}</Tag>
        </div>
      )}

      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />

      <Modal
        title="Редактирование пользователя"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="first_name" label="Имя" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="last_name" label="Фамилия" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="middle_name" label="Отчество">
            <Input />
          </Form.Item>
          <Form.Item name="position" label="Должность">
            <Input />
          </Form.Item>
          <Form.Item name="department" label="Отдел">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input />
          </Form.Item>
          <Form.Item name="is_active" label="Активен" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
