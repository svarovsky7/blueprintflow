import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Button, Space, Modal, Form, Select, message, Tag } from 'antd'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { DeleteConfirmModal } from '@/shared/components'
import { getAllGroupRolesMappings, assignRoleToGroup, removeRoleFromGroup } from '@/entities/roles/api/roles-mapping-api'
import { getRoles } from '@/entities/roles'
import { getUserGroups } from '@/entities/user-groups'
import type { GroupRoleMapping } from '@/entities/roles/api/roles-mapping-api'
import type { ColumnsType } from 'antd/es/table'

export default function GroupRolesTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  
  // Состояние для модального окна удаления
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [mappingToDelete, setMappingToDelete] = useState<GroupRoleMapping | null>(null)

  const { data: mappings = [], isLoading } = useQuery({
    queryKey: ['group-roles-mappings'],
    queryFn: () => getAllGroupRolesMappings(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: groups = [] } = useQuery({
    queryKey: ['user-groups'],
    queryFn: () => getUserGroups(),
  })

  const assignMutation = useMutation({
    mutationFn: ({ groupId, roleId }: { groupId: string; roleId: string }) =>
      assignRoleToGroup(groupId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-roles-mappings'] })
      message.success('Роль назначена группе')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const removeMutation = useMutation({
    mutationFn: ({ groupId, roleId }: { groupId: string; roleId: string }) =>
      removeRoleFromGroup(groupId, roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-roles-mappings'] })
      message.success('Роль удалена из группы')
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

  const handleDeleteClick = (mapping: GroupRoleMapping) => {
    setMappingToDelete(mapping)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (mappingToDelete) {
      removeMutation.mutate({ groupId: mappingToDelete.group_id, roleId: mappingToDelete.role_id })
      setDeleteModalOpen(false)
      setMappingToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setMappingToDelete(null)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      assignMutation.mutate({ groupId: values.group_id, roleId: values.role_id })
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<GroupRoleMapping> = [
    {
      title: 'Группа',
      key: 'group',
      render: (_, record) =>
        record.group ? <Tag color={record.group.color}>{record.group.name}</Tag> : '-',
      sorter: (a, b) => (a.group?.name || '').localeCompare(b.group?.name || ''),
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
      sorter: (a, b) => (a.role?.name || '').localeCompare(b.role?.name || ''),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteClick(record)}
          title="Удалить"
        />
      ),
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Назначить роль группе
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={mappings}
        rowKey={(record) => `${record.group_id}-${record.role_id}`}
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />

      <Modal
        title="Назначение роли группе"
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={assignMutation.isPending}
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

      <DeleteConfirmModal
        open={deleteModalOpen}
        onCancel={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Удаление роли из группы"
        description="Это действие нельзя отменить"
        itemName={mappingToDelete ? `${mappingToDelete.group?.name} - ${mappingToDelete.role?.name}` : undefined}
        loading={removeMutation.isPending}
      />
    </>
  )
}
