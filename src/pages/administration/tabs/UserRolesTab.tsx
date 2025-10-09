import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Space, Modal, Form, Select, message, Tag, Popconfirm, Badge } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  getAllUserRolesMappings,
  assignRoleToUser,
  removeRoleFromUser,
} from '@/entities/users/api/users-roles-mapping-api'
import { getRoles } from '@/entities/roles'
import { getUsers } from '@/entities/users'
import type { UserRoleMapping } from '@/entities/users/api/users-roles-mapping-api'
import type { ColumnsType } from 'antd/es/table'

export default function UserRolesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['user-roles-mappings'],
    queryFn: () => getAllUserRolesMappings(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const assignMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      assignRoleToUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-mappings'] })
      message.success('Роль назначена пользователю')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ userId, roleId }: { userId: string; roleId: string }) =>
      removeRoleFromUser(userId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-roles-mappings'] })
      message.success('Роль удалена у пользователя')
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const handleAdd = () => {
    form.resetFields()
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      assignMutation.mutate({ userId: values.user_id, roleId: values.role_id })
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<UserRoleMapping> = [
    {
      title: 'Пользователь',
      key: 'user',
      render: (_, record) => {
        if (!record.user) return '-'
        const fullName = [record.user.last_name, record.user.first_name, record.user.middle_name]
          .filter(Boolean)
          .join(' ')
        return (
          <Space>
            {!record.user.is_active && <Badge status="warning" />}
            {fullName}
            {record.user.position && (
              <Tag color="default" style={{ marginLeft: 8 }}>
                {record.user.position}
              </Tag>
            )}
          </Space>
        )
      },
      sorter: (a, b) => {
        const aName = a.user
          ? `${a.user.last_name} ${a.user.first_name}`.trim()
          : ''
        const bName = b.user
          ? `${b.user.last_name} ${b.user.first_name}`.trim()
          : ''
        return aName.localeCompare(bName)
      },
    },
    {
      title: 'Роль',
      key: 'role',
      render: (_, record) =>
        record.role ? (
          <Tag color="blue">
            {record.role.name} (уровень: {record.role.access_level})
          </Tag>
        ) : (
          '-'
        ),
      filters: roles.map((r) => ({ text: r.name, value: r.id })),
      onFilter: (value, record) => record.role_id === value,
      sorter: (a, b) => (a.role?.name || '').localeCompare(b.role?.name || ''),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="Удалить роль у пользователя?"
          onConfirm={() =>
            removeMutation.mutate({ userId: record.user_id, roleId: record.role_id })
          }
          okText="Да"
          cancelText="Нет"
        >
          <Button type="text" danger icon={<DeleteOutlined />} title="Удалить" />
        </Popconfirm>
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Назначить роль пользователю
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={mappings}
        rowKey={(record) => `${record.user_id}-${record.role_id}`}
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />

      <Modal
        title="Назначение роли пользователю"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={assignMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="user_id"
            label="Пользователь"
            rules={[{ required: true, message: 'Выберите пользователя' }]}
          >
            <Select
              placeholder="Выберите пользователя"
              options={users.map((u) => {
                const fullName = [u.last_name, u.first_name, u.middle_name].filter(Boolean).join(' ')
                return {
                  label: `${fullName}${u.position ? ` (${u.position})` : ''}`,
                  value: u.id,
                }
              })}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="role_id"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select
              placeholder="Выберите роль"
              options={roles.map((r) => ({ label: `${r.name} (${r.access_level})`, value: r.id }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}
