import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Space, Modal, Form, Select, message, Tag, Popconfirm, Badge } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  getAllUserGroupsMemberships,
  addUserToGroup,
  removeUserFromGroup,
} from '@/entities/user-groups/api/users-groups-mapping-api'
import { getUserGroups } from '@/entities/user-groups'
import { getUsers } from '@/entities/users'
import type { UserGroupMembership } from '@/entities/user-groups/api/users-groups-mapping-api'
import type { ColumnsType } from 'antd/es/table'

export default function UserGroupsTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: memberships = [], isLoading } = useQuery({
    queryKey: ['user-groups-memberships'],
    queryFn: () => getAllUserGroupsMemberships(),
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups'],
    queryFn: () => getUserGroups(),
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => getUsers(),
  })

  const addMutation = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
      addUserToGroup(userId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups-memberships'] })
      message.success('Пользователь добавлен в группу')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ userId, groupId }: { userId: string; groupId: string }) =>
      removeUserFromGroup(userId, groupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups-memberships'] })
      message.success('Пользователь удален из группы')
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
      addMutation.mutate({ userId: values.user_id, groupId: values.group_id })
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<UserGroupMembership> = [
    {
      title: 'Группа',
      key: 'group',
      render: (_, record) =>
        record.group ? <Tag color={record.group.color}>{record.group.name}</Tag> : '-',
      filters: groups.map((g) => ({ text: g.name, value: g.id })),
      onFilter: (value, record) => record.group_id === value,
      sorter: (a, b) => (a.group?.name || '').localeCompare(b.group?.name || ''),
    },
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
        const aName = a.user ? `${a.user.last_name} ${a.user.first_name}`.trim() : ''
        const bName = b.user ? `${b.user.last_name} ${b.user.first_name}`.trim() : ''
        return aName.localeCompare(bName)
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title="Удалить пользователя из группы?"
          onConfirm={() =>
            removeMutation.mutate({ userId: record.user_id, groupId: record.group_id })
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
          Добавить пользователя в группу
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={memberships}
        rowKey={(record) => `${record.user_id}-${record.group_id}`}
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />

      <Modal
        title="Добавление пользователя в группу"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={addMutation.isPending}
        width={500}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="group_id"
            label="Группа"
            rules={[{ required: true, message: 'Выберите группу' }]}
          >
            <Select
              placeholder="Выберите группу"
              options={groups.map((g) => ({ label: g.name, value: g.id }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

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
        </Form>
      </Modal>
    </>
  )
}
