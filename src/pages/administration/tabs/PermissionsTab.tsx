import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Table, Select, message, Checkbox, Tag, Space, Button, Tooltip } from 'antd'
import { EditOutlined, SaveOutlined, CloseOutlined, CheckSquareOutlined, CopyOutlined } from '@ant-design/icons'
import {
  getPermissions,
  updatePermissionByRoleAndObject,
} from '@/entities/permissions/api/permissions-api'
import { getRoles } from '@/entities/roles'
import { getPortalObjects } from '@/entities/portal-objects/api/portal-objects-api'
import type { Permission, UpdatePermissionDto } from '@/entities/permissions'
import type { ColumnsType } from 'antd/es/table'

interface PermissionMatrix {
  objectId: string
  objectName: string
  objectCode: string
  objectType: string
  permissions: Record<string, Permission>
}

interface EditedPermissions {
  [objectId: string]: {
    can_view: boolean
    can_create: boolean
    can_edit: boolean
    can_delete: boolean
  }
}

export default function PermissionsTab() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedPermissions, setEditedPermissions] = useState<EditedPermissions>({})
  const queryClient = useQueryClient()

  const { data: permissions = [], isLoading: permissionsLoading } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => getPermissions(),
  })

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: () => getRoles(),
  })

  const { data: objects = [] } = useQuery({
    queryKey: ['portal-objects'],
    queryFn: () => getPortalObjects(),
  })

  const updateMutation = useMutation({
    mutationFn: async (updates: { roleId: string; objectId: string; data: UpdatePermissionDto }[]) => {
      for (const update of updates) {
        await updatePermissionByRoleAndObject(update.roleId, update.objectId, update.data)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] })
      message.success('Разрешения обновлены')
      setIsEditing(false)
      setEditedPermissions({})
    },
    onError: (error: Error) => {
      message.error(`Ошибка: ${error.message}`)
    },
  })

  const filteredPermissions = selectedRole
    ? permissions.filter((p) => p.role_id === selectedRole)
    : []

  const matrixData: PermissionMatrix[] = objects.map((obj) => {
    const objPermissions: Record<string, Permission> = {}
    filteredPermissions.forEach((perm) => {
      if (perm.portal_object_id === obj.id) {
        objPermissions[perm.role_id] = perm
      }
    })
    return {
      objectId: obj.id,
      objectName: obj.name,
      objectCode: obj.code,
      objectType: obj.object_type,
      permissions: objPermissions,
    }
  })

  const handleStartEdit = () => {
    const initial: EditedPermissions = {}
    matrixData.forEach((row) => {
      const perm = row.permissions[selectedRole!]
      initial[row.objectId] = {
        can_view: perm?.can_view || false,
        can_create: perm?.can_create || false,
        can_edit: perm?.can_edit || false,
        can_delete: perm?.can_delete || false,
      }
    })
    setEditedPermissions(initial)
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditedPermissions({})
  }

  const handleSave = () => {
    if (!selectedRole) return

    const updates = Object.entries(editedPermissions).map(([objectId, perms]) => ({
      roleId: selectedRole,
      objectId,
      data: perms,
    }))

    updateMutation.mutate(updates)
  }

  const handlePermissionChange = (
    objectId: string,
    field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete',
    value: boolean
  ) => {
    setEditedPermissions((prev) => ({
      ...prev,
      [objectId]: {
        ...prev[objectId],
        [field]: value,
      },
    }))
  }

  const handleToggleAll = (field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    const allChecked = matrixData.every((row) => editedPermissions[row.objectId]?.[field])
    const newValue = !allChecked

    const updated: EditedPermissions = { ...editedPermissions }
    matrixData.forEach((row) => {
      if (updated[row.objectId]) {
        updated[row.objectId] = {
          ...updated[row.objectId],
          [field]: newValue,
        }
      }
    })
    setEditedPermissions(updated)
  }

  const handleCopyFromPrevious = (
    targetField: 'can_create' | 'can_edit' | 'can_delete'
  ) => {
    console.log('📋 handleCopyFromPrevious called for field:', targetField) // LOG
    const sourceFieldMap: Record<'can_create' | 'can_edit' | 'can_delete', 'can_view' | 'can_create' | 'can_edit'> = {
      can_create: 'can_view',
      can_edit: 'can_create',
      can_delete: 'can_edit',
    }
    const sourceField = sourceFieldMap[targetField]
    console.log('Copying from field:', sourceField, 'to field:', targetField) // LOG

    const updated: EditedPermissions = { ...editedPermissions }
    matrixData.forEach((row) => {
      if (updated[row.objectId]) {
        updated[row.objectId] = {
          ...updated[row.objectId],
          [targetField]: updated[row.objectId][sourceField],
        }
      }
    })
    setEditedPermissions(updated)
  }

  const areAllChecked = (field: 'can_view' | 'can_create' | 'can_edit' | 'can_delete') => {
    return matrixData.every((row) => editedPermissions[row.objectId]?.[field])
  }

  const columns: ColumnsType<PermissionMatrix> = [
    {
      title: 'Объект',
      dataIndex: 'objectName',
      key: 'objectName',
      width: 250,
      fixed: 'left',
      sorter: (a, b) => a.objectName.localeCompare(b.objectName),
    },
    {
      title: 'Код',
      dataIndex: 'objectCode',
      key: 'objectCode',
      width: 150,
    },
    {
      title: 'Тип',
      dataIndex: 'objectType',
      key: 'objectType',
      width: 120,
      render: (type: string) => {
        const colors: Record<string, string> = {
          page: 'blue',
          section: 'green',
          feature: 'orange',
          action: 'purple',
        }
        return <Tag color={colors[type] || 'default'}>{type}</Tag>
      },
    },
    {
      title: () => (
        <div onClick={(e) => e.stopPropagation()}>
          <Space direction="vertical" size={4}>
            <div>Просмотр</div>
            <Tooltip title="Выбрать/снять все">
              <Checkbox
                checked={isEditing && areAllChecked('can_view')}
                onChange={(e) => {
                  e.stopPropagation()
                  isEditing && handleToggleAll('can_view')
                }}
                disabled={!isEditing}
              />
            </Tooltip>
          </Space>
        </div>
      ),
      key: 'can_view',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (!selectedRole) return null
        const value = isEditing
          ? editedPermissions[record.objectId]?.can_view
          : record.permissions[selectedRole]?.can_view
        return (
          <Checkbox
            checked={value}
            onChange={(e) =>
              isEditing && handlePermissionChange(record.objectId, 'can_view', e.target.checked)
            }
            disabled={!isEditing}
          />
        )
      },
    },
    {
      title: () => (
        <div onClick={(e) => e.stopPropagation()}>
          <Space direction="vertical" size={4}>
            <div>Создание</div>
            <Space size={4}>
              <Tooltip title="Выбрать/снять все">
                <Checkbox
                  checked={isEditing && areAllChecked('can_create')}
                  onChange={(e) => {
                    e.stopPropagation()
                    isEditing && handleToggleAll('can_create')
                  }}
                  disabled={!isEditing}
                />
              </Tooltip>
              <Tooltip title="Скопировать из 'Просмотр'">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    isEditing && handleCopyFromPrevious('can_create')
                  }}
                  disabled={!isEditing}
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              </Tooltip>
            </Space>
          </Space>
        </div>
      ),
      key: 'can_create',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (!selectedRole) return null
        const value = isEditing
          ? editedPermissions[record.objectId]?.can_create
          : record.permissions[selectedRole]?.can_create
        return (
          <Checkbox
            checked={value}
            onChange={(e) =>
              isEditing && handlePermissionChange(record.objectId, 'can_create', e.target.checked)
            }
            disabled={!isEditing}
          />
        )
      },
    },
    {
      title: () => (
        <div onClick={(e) => e.stopPropagation()}>
          <Space direction="vertical" size={4}>
            <div>Редактирование</div>
            <Space size={4}>
              <Tooltip title="Выбрать/снять все">
                <Checkbox
                  checked={isEditing && areAllChecked('can_edit')}
                  onChange={(e) => {
                    e.stopPropagation()
                    isEditing && handleToggleAll('can_edit')
                  }}
                  disabled={!isEditing}
                />
              </Tooltip>
              <Tooltip title="Скопировать из 'Создание'">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    isEditing && handleCopyFromPrevious('can_edit')
                  }}
                  disabled={!isEditing}
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              </Tooltip>
            </Space>
          </Space>
        </div>
      ),
      key: 'can_edit',
      width: 150,
      align: 'center',
      render: (_, record) => {
        if (!selectedRole) return null
        const value = isEditing
          ? editedPermissions[record.objectId]?.can_edit
          : record.permissions[selectedRole]?.can_edit
        return (
          <Checkbox
            checked={value}
            onChange={(e) =>
              isEditing && handlePermissionChange(record.objectId, 'can_edit', e.target.checked)
            }
            disabled={!isEditing}
          />
        )
      },
    },
    {
      title: () => (
        <div onClick={(e) => e.stopPropagation()}>
          <Space direction="vertical" size={4}>
            <div>Удаление</div>
            <Space size={4}>
              <Tooltip title="Выбрать/снять все">
                <Checkbox
                  checked={isEditing && areAllChecked('can_delete')}
                  onChange={(e) => {
                    e.stopPropagation()
                    isEditing && handleToggleAll('can_delete')
                  }}
                  disabled={!isEditing}
                />
              </Tooltip>
              <Tooltip title="Скопировать из 'Редактирование'">
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={(e) => {
                    e.stopPropagation()
                    isEditing && handleCopyFromPrevious('can_delete')
                  }}
                  disabled={!isEditing}
                  style={{ padding: '0 4px', minWidth: 'auto' }}
                />
              </Tooltip>
            </Space>
          </Space>
        </div>
      ),
      key: 'can_delete',
      width: 120,
      align: 'center',
      render: (_, record) => {
        if (!selectedRole) return null
        const value = isEditing
          ? editedPermissions[record.objectId]?.can_delete
          : record.permissions[selectedRole]?.can_delete
        return (
          <Checkbox
            checked={value}
            onChange={(e) =>
              isEditing && handlePermissionChange(record.objectId, 'can_delete', e.target.checked)
            }
            disabled={!isEditing}
          />
        )
      },
    },
  ]

  return (
    <>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Space>
          <span>Роль:</span>
          <Select
            style={{ width: 300 }}
            placeholder="Выберите роль для настройки разрешений"
            value={selectedRole}
            onChange={(value) => {
              setSelectedRole(value)
              setIsEditing(false)
              setEditedPermissions({})
            }}
            allowClear
            showSearch
            disabled={isEditing}
            filterOption={(input, option) =>
              (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            options={roles.map((r) => ({
              label: `${r.name} (уровень: ${r.access_level})`,
              value: r.id,
            }))}
          />
        </Space>

        {selectedRole && (
          <Space>
            {!isEditing ? (
              <Button type="primary" icon={<EditOutlined />} onClick={handleStartEdit}>
                Редактировать
              </Button>
            ) : (
              <>
                <Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
                  Отмена
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                  loading={updateMutation.isPending}
                >
                  Сохранить
                </Button>
              </>
            )}
          </Space>
        )}
      </div>

      {!selectedRole && (
        <div style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
          Выберите роль для настройки разрешений
        </div>
      )}

      {selectedRole && (
        <Table
          columns={columns}
          dataSource={matrixData}
          rowKey="objectId"
          loading={permissionsLoading}
          pagination={{
            pageSize: 100,
            showSizeChanger: true,
            showTotal: (total) => `Всего: ${total}`,
          }}
          scroll={{ y: 'calc(100vh - 400px)', x: 1100 }}
        />
      )}
    </>
  )
}
