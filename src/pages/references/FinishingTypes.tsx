import { useState, useMemo } from 'react'
import { Typography, Table, Button, Space, message, Popconfirm, Input, Select } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useScale } from '@/shared/contexts/ScaleContext'

const { Title } = Typography

interface FinishingType {
  id: string
  project_id: string
  name: string
  project?: {
    name: string
  }
}

interface ProjectOption {
  value: string
  label: string
}

export default function FinishingTypes() {
  const { scale } = useScale()
  const queryClient = useQueryClient()
  const [editingKey, setEditingKey] = useState<string>('')
  const [addingRow, setAddingRow] = useState(false)
  const [editForm, setEditForm] = useState<Partial<FinishingType>>({})
  const [selectedProject, setSelectedProject] = useState<string>()

  // Загрузка проектов
  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ['projects-for-finishing-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data?.map((p) => ({ value: p.id, label: p.name })) || []
    },
  })

  // Загрузка типов отделки
  const { data: finishingTypes = [], isLoading } = useQuery<FinishingType[]>({
    queryKey: ['finishing-types', selectedProject],
    queryFn: async () => {
      if (!selectedProject) return []

      const { data, error } = await supabase
        .from('finishing_pie_types')
        .select(`
          id,
          project_id,
          name,
          projects(name)
        `)
        .eq('project_id', selectedProject)
        .order('name')

      if (error) throw error
      return data as FinishingType[]
    },
    enabled: !!selectedProject,
  })

  // Мутация создания типа
  const createMutation = useMutation({
    mutationFn: async (newType: Partial<FinishingType>) => {
      const { data, error } = await supabase
        .from('finishing_pie_types')
        .insert([
          {
            project_id: newType.project_id,
            name: newType.name,
          },
        ])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-types'] })
      message.success('Тип отделки создан')
      setAddingRow(false)
      setEditForm({})
    },
    onError: (error: any) => {
      message.error(`Ошибка создания: ${error.message}`)
    },
  })

  // Мутация обновления типа
  const updateMutation = useMutation({
    mutationFn: async (updatedType: FinishingType) => {
      const { data, error } = await supabase
        .from('finishing_pie_types')
        .update({
          name: updatedType.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', updatedType.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-types'] })
      message.success('Тип отделки обновлён')
      setEditingKey('')
      setEditForm({})
    },
    onError: (error: any) => {
      message.error(`Ошибка обновления: ${error.message}`)
    },
  })

  // Мутация удаления типа
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('finishing_pie_types').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finishing-types'] })
      message.success('Тип отделки удалён')
    },
    onError: (error: any) => {
      message.error(`Ошибка удаления: ${error.message}`)
    },
  })

  const isEditing = (record: FinishingType) => record.id === editingKey

  const handleEdit = (record: FinishingType) => {
    setEditForm({ ...record })
    setEditingKey(record.id)
  }

  const handleCancelEdit = () => {
    setEditingKey('')
    setEditForm({})
  }

  const handleSave = async () => {
    if (!editForm.name?.trim()) {
      message.error('Заполните название типа')
      return
    }

    if (editingKey) {
      updateMutation.mutate({ ...editForm, id: editingKey } as FinishingType)
    }
  }

  const handleAdd = () => {
    if (!selectedProject) {
      message.error('Выберите проект')
      return
    }
    setAddingRow(true)
    setEditForm({ project_id: selectedProject, name: '' })
  }

  const handleCancelAdd = () => {
    setAddingRow(false)
    setEditForm({})
  }

  const handleSaveNew = () => {
    if (!editForm.name?.trim()) {
      message.error('Заполните название типа')
      return
    }

    createMutation.mutate(editForm)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const columns = [
    {
      title: 'Тип',
      dataIndex: 'name',
      key: 'name',
      width: '70%',
      render: (text: string, record: FinishingType) => {
        if (isEditing(record)) {
          return (
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="Тип-1, Тип-2, ..."
            />
          )
        }
        return text
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: '30%',
      align: 'center' as const,
      render: (_: any, record: FinishingType) => {
        if (isEditing(record)) {
          return (
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                size="small"
                onClick={handleSave}
                loading={updateMutation.isPending}
              >
                Сохранить
              </Button>
              <Button icon={<CloseOutlined />} size="small" onClick={handleCancelEdit}>
                Отмена
              </Button>
            </Space>
          )
        }

        return (
          <Space>
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={editingKey !== '' || addingRow}
            />
            <Popconfirm
              title="Удалить тип отделки?"
              description="Это действие нельзя отменить"
              onConfirm={() => handleDelete(record.id)}
              okText="Удалить"
              cancelText="Отмена"
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
                disabled={editingKey !== '' || addingRow}
              />
            </Popconfirm>
          </Space>
        )
      },
    },
  ]

  const dataSource = useMemo(() => {
    const data = [...finishingTypes]
    if (addingRow) {
      data.unshift({
        id: 'new',
        project_id: selectedProject || '',
        name: editForm.name || '',
      } as FinishingType)
    }
    return data
  }, [finishingTypes, addingRow, editForm, selectedProject])

  return (
    <div
      style={{
        height: 'calc(100vh - 96px)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Заголовок страницы */}
      <div style={{ padding: '16px 24px', flexShrink: 0 }}>
        <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
          Типы отделки
        </Title>
      </div>

      {/* Фильтр проекта и кнопка добавления */}
      <div
        style={{
          padding: '0 24px 16px 24px',
          flexShrink: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space>
          <span>Проект:</span>
          <Select
            style={{ width: 300 }}
            placeholder="Выберите проект"
            value={selectedProject}
            onChange={setSelectedProject}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
            }
            options={projects}
          />
        </Space>

        {selectedProject && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={editingKey !== '' || addingRow}
          >
            Добавить тип
          </Button>
        )}
      </div>

      {/* Таблица */}
      {selectedProject && (
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 24px 24px 24px' }}>
          <Table
            columns={columns}
            dataSource={dataSource}
            rowKey="id"
            loading={isLoading}
            pagination={{
              defaultPageSize: 50,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
            rowClassName={(record) => (record.id === 'new' ? 'adding-row' : '')}
            scroll={{ y: 'calc(100vh - 300px)' }}
            locale={{ emptyText: 'Нет данных' }}
            footer={
              addingRow
                ? () => (
                    <Space>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSaveNew}
                        loading={createMutation.isPending}
                      >
                        Сохранить
                      </Button>
                      <Button icon={<CloseOutlined />} onClick={handleCancelAdd}>
                        Отмена
                      </Button>
                    </Space>
                  )
                : undefined
            }
          />
        </div>
      )}

      {!selectedProject && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#999',
          }}
        >
          Выберите проект для управления типами отделки
        </div>
      )}
    </div>
  )
}