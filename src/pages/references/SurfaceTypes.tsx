import { useState } from 'react'
import { Typography, Button, Table, Input, Popconfirm, App } from 'antd'
import { PlusOutlined, DeleteOutlined, EditOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useScale } from '@/shared/contexts/ScaleContext'
import {
  getSurfaceTypes,
  createSurfaceType,
  updateSurfaceType,
  deleteSurfaceType,
  type SurfaceType,
} from '@/entities/calculation'

const { Title } = Typography

type Mode = 'view' | 'add' | 'edit'

interface EditableRow extends Partial<SurfaceType> {
  isNew?: boolean
  isEditing?: boolean
}

export default function SurfaceTypes() {
  const { scale } = useScale()
  const queryClient = useQueryClient()
  const { message } = App.useApp()

  const [mode, setMode] = useState<Mode>('view')
  const [editingRows, setEditingRows] = useState<EditableRow[]>([])

  const { data: surfaceTypes = [], isLoading } = useQuery({
    queryKey: ['surface-types'],
    queryFn: getSurfaceTypes,
  })

  const createMutation = useMutation({
    mutationFn: createSurfaceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surface-types'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: { name: string } }) =>
      updateSurfaceType(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surface-types'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteSurfaceType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surface-types'] })
    },
  })

  const handleAddRow = () => {
    setMode('add')
    setEditingRows([
      ...editingRows,
      {
        id: `new-${Date.now()}`,
        isNew: true,
        name: '',
      },
    ])
  }

  const handleEditRow = (record: SurfaceType) => {
    setMode('edit')
    setEditingRows([{ ...record, isEditing: true }])
  }

  const handleCancelEdit = () => {
    setMode('view')
    setEditingRows([])
  }

  const handleSave = async () => {
    try {
      for (const row of editingRows) {
        if (!row.name?.trim()) {
          message.error('Название не может быть пустым')
          return
        }

        if (row.isNew) {
          await createMutation.mutateAsync({ name: row.name.trim() })
        } else if (row.isEditing) {
          await updateMutation.mutateAsync({
            id: row.id!,
            dto: { name: row.name.trim() },
          })
        }
      }

      message.success('Изменения сохранены')
      setMode('view')
      setEditingRows([])
    } catch (error: any) {
      message.error(`Ошибка сохранения: ${error.message}`)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id)
      message.success('Запись удалена')
    } catch (error: any) {
      message.error(`Ошибка удаления: ${error.message}`)
    }
  }

  const handleUpdateEditingRow = (id: string, field: keyof EditableRow, value: any) => {
    setEditingRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [field]: value } : row))
    )
  }

  const dataSource =
    mode === 'add' || mode === 'edit'
      ? [...surfaceTypes, ...editingRows]
      : surfaceTypes

  const columns = [
    {
      title: '№',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    {
      title: 'Название',
      dataIndex: 'name',
      key: 'name',
      render: (value: string, record: EditableRow) => {
        if ((mode === 'add' && record.isNew) || (mode === 'edit' && record.isEditing)) {
          return (
            <Input
              value={value}
              onChange={(e) => handleUpdateEditingRow(record.id!, 'name', e.target.value)}
              placeholder="Введите название"
              autoFocus
            />
          )
        }
        return value
      },
    },
    {
      title: '',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (_: any, record: SurfaceType) => {
        if (mode === 'view') {
          return (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <Button
                type="text"
                icon={<EditOutlined />}
                size="small"
                onClick={() => handleEditRow(record)}
              />
              <Popconfirm
                title="Удалить этот тип поверхности?"
                onConfirm={() => handleDelete(record.id)}
                okText="Да"
                cancelText="Нет"
              >
                <Button type="text" danger icon={<DeleteOutlined />} size="small" />
              </Popconfirm>
            </div>
          )
        }
        return null
      },
    },
  ]

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
          Типы поверхностей
        </Title>
      </div>

      <div style={{ padding: '0 24px 16px 24px', flexShrink: 0 }}>
        {mode === 'view' ? (
          <Button icon={<PlusOutlined />} onClick={handleAddRow}>
            Добавить
          </Button>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
              Сохранить
            </Button>
            <Button icon={<CloseOutlined />} onClick={handleCancelEdit}>
              Отмена
            </Button>
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 24px 24px' }}>
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={isLoading}
          pagination={{ defaultPageSize: 50, showSizeChanger: true }}
          scroll={{ y: 'calc(100vh - 300px)' }}
          locale={{ emptyText: 'Нет данных' }}
        />
      </div>
    </div>
  )
}
