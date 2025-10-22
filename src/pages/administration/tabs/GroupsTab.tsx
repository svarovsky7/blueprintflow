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
  Select,
  ColorPicker,
} from 'antd'
import type { Color } from 'antd/es/color-picker'
import { EditOutlined, DeleteOutlined, PlusOutlined, TeamOutlined } from '@ant-design/icons'
import { DeleteConfirmModal } from '@/shared/components'
import {
  getUserGroups,
  createUserGroup,
  updateUserGroup,
  deleteUserGroup,
} from '@/entities/user-groups'
import type { UserGroup, CreateUserGroupDto, UpdateUserGroupDto } from '@/entities/user-groups'
import type { ColumnsType } from 'antd/es/table'

export default function GroupsTab() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<UserGroup | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  
  // Состояние для модального окна удаления
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [groupToDelete, setGroupToDelete] = useState<UserGroup | null>(null)

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['user-groups'],
    queryFn: () => getUserGroups(),
  })

  const createMutation = useMutation({
    mutationFn: createUserGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      message.success('Группа создана')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserGroupDto }) =>
      updateUserGroup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      message.success('Группа обновлена')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteUserGroup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-groups'] })
      message.success('Группа удалена')
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const handleAdd = () => {
    setEditingGroup(null)
    form.resetFields()
    form.setFieldsValue({ color: '#1890ff' })
    setIsModalOpen(true)
  }

  const handleEdit = (group: UserGroup) => {
    setEditingGroup(group)
    form.setFieldsValue(group)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingGroup(null)
    form.resetFields()
  }

  const handleDeleteClick = (group: UserGroup) => {
    setGroupToDelete(group)
    setDeleteModalOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (groupToDelete) {
      deleteMutation.mutate(groupToDelete.id)
      setDeleteModalOpen(false)
      setGroupToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false)
    setGroupToDelete(null)
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const dto = {
        name: values.name,
        code: values.code,
        description: values.description,
        color: values.color,
        parent_group_id: values.parent_group_id,
      }

      if (editingGroup) {
        updateMutation.mutate({ id: editingGroup.id, data: dto })
      } else {
        createMutation.mutate(dto)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<UserGroup> = [
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
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteClick(record)}
            disabled={record.is_system}
            title="Удалить"
          />
        </Space>
      ),
    },
  ]

  const parentGroupOptions = groups
    .filter((g) => !editingGroup || g.id !== editingGroup.id)
    .map((g) => ({
      label: g.name,
      value: g.id,
    }))

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить группу
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={groups}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
        scroll={{ y: 'calc(100vh - 400px)' }}
      />

      <Modal
        title={editingGroup ? 'Редактирование группы' : 'Создание группы'}
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
            <Input placeholder="Администраторы" />
          </Form.Item>

          <Form.Item
            name="code"
            label="Код"
            rules={[
              { required: true, message: 'Введите код' },
              { pattern: /^[a-z0-9_-]+$/, message: 'Только a-z, 0-9, _, -' },
            ]}
          >
            <Input placeholder="administrators" disabled={editingGroup?.is_system} />
          </Form.Item>

          <Form.Item name="description" label="Описание">
            <Input.TextArea rows={3} placeholder="Описание группы" />
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

          <Form.Item name="parent_group_id" label="Родительская группа">
            <Select
              placeholder="Выберите родительскую группу"
              options={parentGroupOptions}
              allowClear
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
        title="Удаление группы"
        description="Это действие нельзя отменить"
        itemName={groupToDelete?.name}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
