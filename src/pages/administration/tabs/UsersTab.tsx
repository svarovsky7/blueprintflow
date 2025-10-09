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
  App,
  Badge,
  Popconfirm,
  Tag,
  Select,
} from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { getUsers, updateUser, deleteUser, deactivateUser, activateUser } from '@/entities/users'
import {
  assignRoleToUser,
  removeRoleFromUser,
  getAllUserRolesMappings,
} from '@/entities/users/api/users-roles-mapping-api'
import {
  addUserToGroup,
  removeUserFromGroup,
  getAllUserGroupsMappings,
} from '@/entities/user-groups'
import { getRoles } from '@/entities/roles'
import { getUserGroups } from '@/entities/user-groups/api/user-groups-api'
import type { User, UpdateUserDto } from '@/entities/users'
import type { Role } from '@/entities/roles'
import type { UserGroup } from '@/entities/user-groups'
import type { ColumnsType } from 'antd/es/table'

interface UserWithRelations extends User {
  roles?: Role[]
  groups?: UserGroup[]
}

export default function UsersTab() {
  const { message } = App.useApp()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: userGroups = [] } = useQuery({
    queryKey: ['user-groups'],
    queryFn: () => getUserGroups(),
  })

  const { data: usersRoles = {} } = useQuery({
    queryKey: ['users-roles-mappings'],
    queryFn: async () => {
      console.log('🔍 Loading user roles mappings...') // LOG
      const mappings = await getAllUserRolesMappings()
      console.log('🔍 Loaded mappings:', mappings) // LOG
      const result: Record<string, Role[]> = {}

      mappings.forEach((mapping) => {
        if (!result[mapping.user_id]) {
          result[mapping.user_id] = []
        }
        if (mapping.role) {
          result[mapping.user_id].push(mapping.role)
        }
      })

      console.log('🔍 Processed usersRoles:', result) // LOG
      return result
    },
  })

  const { data: usersGroups = {} } = useQuery({
    queryKey: ['users-groups-mappings'],
    queryFn: async () => {
      const mappings = await getAllUserGroupsMappings()
      const result: Record<string, UserGroup[]> = {}

      mappings.forEach((mapping) => {
        if (!result[mapping.user_id]) {
          result[mapping.user_id] = []
        }
        if (mapping.group) {
          result[mapping.user_id].push(mapping.group)
        }
      })

      return result
    },
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

  const updateUserRolesMutation = useMutation({
    mutationFn: async ({ userId, roleIds }: { userId: string; roleIds: string[] }) => {
      console.log('🔍 Updating roles for user:', userId) // LOG
      console.log('🔍 Selected roleIds:', roleIds) // LOG

      const currentRoles = usersRoles[userId] || []
      const currentRoleIds = currentRoles.map((r) => r.id)

      console.log('🔍 Current roles:', currentRoles) // LOG
      console.log('🔍 Current roleIds:', currentRoleIds) // LOG

      const toAdd = roleIds.filter((id) => !currentRoleIds.includes(id))
      const toRemove = currentRoleIds.filter((id) => !roleIds.includes(id))

      console.log('🔍 To add:', toAdd) // LOG
      console.log('🔍 To remove:', toRemove) // LOG

      for (const roleId of toAdd) {
        await assignRoleToUser(userId, roleId)
      }
      for (const roleId of toRemove) {
        await removeRoleFromUser(userId, roleId)
      }
    },
    onSuccess: () => {
      console.log('🔍 Roles updated successfully, invalidating cache') // LOG
      queryClient.invalidateQueries({ queryKey: ['users-roles-mappings'] })
      message.success('Роли обновлены')
    },
    onError: (error: Error) => {
      console.error('🔍 Error updating roles:', error) // LOG
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const updateUserGroupsMutation = useMutation({
    mutationFn: async ({ userId, groupIds }: { userId: string; groupIds: string[] }) => {
      const currentGroups = usersGroups[userId] || []
      const currentGroupIds = currentGroups.map((g) => g.id)

      const toAdd = groupIds.filter((id) => !currentGroupIds.includes(id))
      const toRemove = currentGroupIds.filter((id) => !groupIds.includes(id))

      for (const groupId of toAdd) {
        await addUserToGroup(userId, groupId)
      }
      for (const groupId of toRemove) {
        await removeUserFromGroup(userId, groupId)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-groups-mappings'] })
      message.success('Группы обновлены')
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
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
      title: 'Роли',
      key: 'roles',
      width: 250,
      render: (_, record) => {
        const userRolesList = usersRoles[record.id] || []
        return (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Выберите роли"
            value={userRolesList.map((r) => r.id)}
            onChange={(roleIds) => updateUserRolesMutation.mutate({ userId: record.id, roleIds })}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={roles.map((r) => ({
              label: `${r.name} (${r.code})`,
              value: r.id,
            }))}
          />
        )
      },
    },
    {
      title: 'Группы',
      key: 'groups',
      width: 250,
      render: (_, record) => {
        const userGroupsList = usersGroups[record.id] || []
        return (
          <Select
            mode="multiple"
            style={{ width: '100%' }}
            placeholder="Выберите группы"
            value={userGroupsList.map((g) => g.id)}
            onChange={(groupIds) =>
              updateUserGroupsMutation.mutate({ userId: record.id, groupIds })
            }
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={userGroups.map((g) => ({
              label: g.name,
              value: g.id,
            }))}
          />
        )
      },
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
        scroll={{ y: 'calc(100vh - 400px)', x: 1400 }}
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
