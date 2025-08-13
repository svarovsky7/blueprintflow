import { useState, useMemo } from 'react'
import { App, Button, Input, Popconfirm, Space, Table } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  PlusOutlined,
} from '@ant-design/icons'

interface Location {
  id: string
  name: string
  created_at: string
}

export default function Locations() {
  const { message } = App.useApp()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameValue, setNameValue] = useState('')

  const { data: locations, isLoading, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as Location[]
    },
  })

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((locations ?? []).map((l) => l.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [locations],
  )

  const dataSource = useMemo(
    () =>
      editingId === 'new'
        ? [{ id: 'new', name: '', created_at: '' }, ...(locations ?? [])]
        : locations ?? [],
    [editingId, locations],
  )

  const startAdd = () => {
    setEditingId('new')
    setNameValue('')
  }

  const startEdit = (record: Location) => {
    setEditingId(record.id)
    setNameValue(record.name)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setNameValue('')
  }

  const saveEdit = async () => {
    if (!supabase) return
    try {
      if (!nameValue.trim()) {
        message.error('Введите название')
        return
      }
      if (editingId === 'new') {
        const { error } = await supabase
          .from('locations')
          .insert({ name: nameValue.trim() })
        if (error) throw error
        message.success('Запись добавлена')
      } else if (editingId) {
        const { error } = await supabase
          .from('locations')
          .update({ name: nameValue.trim() })
          .eq('id', editingId)
        if (error) throw error
        message.success('Запись обновлена')
      }
      cancelEdit()
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: Location) => {
    if (!supabase) return
    const { error } = await supabase.from('locations').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetch()
    }
  }

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: Location, b: Location) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: Location) => record.name === value,
      render: (_: unknown, record: Location) =>
        editingId === record.id ? (
          <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
        ) : (
          record.name
        ),
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: Location) =>
        editingId === record.id ? (
          <Space>
            <Button icon={<CheckOutlined />} onClick={saveEdit} aria-label="Сохранить" />
            <Button icon={<CloseOutlined />} onClick={cancelEdit} aria-label="Отменить" />
          </Space>
        ) : (
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => startEdit(record)}
              aria-label="Редактировать"
            />
            <Popconfirm title="Удалить запись?" onConfirm={() => handleDelete(record)}>
              <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
            </Popconfirm>
          </Space>
        ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={startAdd}
          disabled={editingId !== null}
        >
          Добавить
        </Button>
      </div>
      <Table<Location>
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={false}
      />
    </div>
  )
}
