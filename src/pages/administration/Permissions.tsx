import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Select,
  message,
  Checkbox,
  Popconfirm,
  Tag,
} from 'antd'
import { EditOutlined, DeleteOutlined, PlusOutlined, KeyOutlined } from '@ant-design/icons'
import {
  getPermissions,
  createPermission,
  updatePermission,
  deletePermission,
} from '@/entities/permissions'
import { getRoles } from '@/entities/roles'
import { getPortalObjects } from '@/entities/portal-objects'
import type { Permission, CreatePermissionDto, UpdatePermissionDto } from '@/entities/permissions'
import type { ColumnsType } from 'antd/es/table'

interface PermissionRow extends Permission {
  role_name?: string
  object_name?: string
  object_code?: string
}

export default function Permissions() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingPermission, setEditingPermission] = useState<Permission | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [form] = Form.useForm()
  const queryClient = useQueryClient()

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => getPermissions(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: portalObjects = [] } = useQuery({
    queryKey: ['portal-objects'],
    queryFn: () => getPortalObjects(),
  })

  const createMutation = useMutation({
    mutationFn: createPermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      message.success('Разрешение создано')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePermissionDto }) =>
      updatePermission(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      message.success('Разрешение обновлено')
      handleCloseModal()
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deletePermission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      message.success('Разрешение удалено')
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const permissionsWithDetails: PermissionRow[] = permissions.map((perm) => {
    const role = roles.find((r) => r.id === perm.role_id)
    const obj = portalObjects.find((o) => o.id === perm.portal_object_id)
    return {
      ...perm,
      role_name: role?.name,
      object_name: obj?.name,
      object_code: obj?.code,
    }
  })

  const filteredPermissions = selectedRole
    ? permissionsWithDetails.filter((p) => p.role_id === selectedRole)
    : permissionsWithDetails

  const handleAdd = () => {
    setEditingPermission(null)
    form.resetFields()
    form.setFieldsValue({
      can_view: false,
      can_create: false,
      can_edit: false,
      can_delete: false,
    })
    setIsModalOpen(true)
  }

  const handleEdit = (permission: Permission) => {
    setEditingPermission(permission)
    form.setFieldsValue(permission)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingPermission(null)
    form.resetFields()
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const dto = {
        role_id: values.role_id,
        portal_object_id: values.portal_object_id,
        can_view: values.can_view || false,
        can_create: values.can_create || false,
        can_edit: values.can_edit || false,
        can_delete: values.can_delete || false,
      }

      if (editingPermission) {
        updateMutation.mutate({ id: editingPermission.id, data: dto })
      } else {
        createMutation.mutate(dto)
      }
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  const columns: ColumnsType<PermissionRow> = [
    {
      title: 'Роль',
      dataIndex: 'role_name',
      key: 'role_name',
      filters: roles.map((r) => ({ text: r.name, value: r.id })),
      onFilter: (value, record) => record.role_id === value,
      render: (name) => <Tag color="blue">{name}</Tag>,
    },
    {
      title: 'Объект портала',
      dataIndex: 'object_name',
      key: 'object_name',
      filters: portalObjects.map((o) => ({ text: o.name, value: o.id })),
      onFilter: (value, record) => record.portal_object_id === value,
    },
    {
      title: 'Просмотр',
      dataIndex: 'can_view',
      key: 'can_view',
      width: 100,
      render: (value) => <Checkbox checked={value} disabled />,
      filters: [
        { text: 'Да', value: true },
        { text: 'Нет', value: false },
      ],
      onFilter: (value, record) => record.can_view === value,
    },
    {
      title: 'Создание',
      dataIndex: 'can_create',
      key: 'can_create',
      width: 100,
      render: (value) => <Checkbox checked={value} disabled />,
    },
    {
      title: 'Редактирование',
      dataIndex: 'can_edit',
      key: 'can_edit',
      width: 130,
      render: (value) => <Checkbox checked={value} disabled />,
    },
    {
      title: 'Удаление',
      dataIndex: 'can_delete',
      key: 'can_delete',
      width: 100,
      render: (value) => <Checkbox checked={value} disabled />,
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
            title="Удалить разрешение?"
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
    <div style={{ padding: '24px', height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>
          <KeyOutlined /> Разрешения
        </h1>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
          Добавить разрешение
        </Button>
      </div>

      <div style={{ marginBottom: 16 }}>
        <Space>
          <span>Роль:</span>
          <Select
            style={{ width: 250 }}
            placeholder="Все роли"
            value={selectedRole}
            onChange={setSelectedRole}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={[
              ...roles.map((r) => ({ label: r.name, value: r.id })),
            ]}
          />
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Table
          columns={columns}
          dataSource={filteredPermissions}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 50, showSizeChanger: true, showTotal: (total) => `Всего: ${total}` }}
          scroll={{ y: 'calc(100vh - 350px)' }}
        />
      </div>

      <Modal
        title={editingPermission ? 'Редактирование разрешения' : 'Создание разрешения'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        confirmLoading={createMutation.isPending || updateMutation.isPending}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="role_id"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select
              placeholder="Выберите роль"
              options={roles.map((r) => ({ label: r.name, value: r.id }))}
              disabled={!!editingPermission}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item
            name="portal_object_id"
            label="Объект портала"
            rules={[{ required: true, message: 'Выберите объект' }]}
          >
            <Select
              placeholder="Выберите объект портала"
              options={portalObjects.map((o) => ({ label: o.name, value: o.id }))}
              disabled={!!editingPermission}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>

          <Form.Item label="Права доступа">
            <Space direction="vertical">
              <Form.Item name="can_view" valuePropName="checked" noStyle>
                <Checkbox>Просмотр</Checkbox>
              </Form.Item>
              <Form.Item name="can_create" valuePropName="checked" noStyle>
                <Checkbox>Создание</Checkbox>
              </Form.Item>
              <Form.Item name="can_edit" valuePropName="checked" noStyle>
                <Checkbox>Редактирование</Checkbox>
              </Form.Item>
              <Form.Item name="can_delete" valuePropName="checked" noStyle>
                <Checkbox>Удаление</Checkbox>
              </Form.Item>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
