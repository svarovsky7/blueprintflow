import { useCallback, useMemo, useState } from 'react'
import {
  App,
  Button,
  Input,
  Popconfirm,
  Space,
  Table,
  type TableProps,
} from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
} from '@ant-design/icons'

interface Location {
  id: number
  name: string
  created_at: string
  updated_at: string
}

type LocationRow = Location | { id: 'new'; name: string; created_at: string; updated_at: string }

export default function Locations() {
  const { message } = App.useApp()
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [nameValue, setNameValue] = useState('')

  const { data: locations, isLoading, refetch } = useQuery({
    queryKey: ['location'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('location')
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

  const startEdit = useCallback((record: Location) => {
    setEditingId(record.id)
    setNameValue(record.name)
  }, [])

  const handleAdd = useCallback(() => {
    setEditingId('new')
    setNameValue('')
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setNameValue('')
  }, [])

  const save = useCallback(
    async (id: number | 'new') => {
      if (!nameValue.trim()) {
        message.error('Введите название')
        return
      }
      if (!supabase) return
      try {
        if (id === 'new') {
          const { error } = await supabase.from('location').insert({ name: nameValue })
          if (error) throw error
          message.success('Запись добавлена')
        } else {
          const { error } = await supabase
            .from('location')
            .update({ name: nameValue })
            .eq('id', id)
          if (error) throw error
          message.success('Запись обновлена')
        }
        cancelEdit()
        await refetch()
      } catch {
        message.error('Не удалось сохранить')
      }
    },
    [nameValue, message, cancelEdit, refetch],
  )

  const handleDelete = useCallback(
    async (record: Location) => {
      if (!supabase) return
      const { error } = await supabase.from('location').delete().eq('id', record.id)
      if (error) {
        message.error('Не удалось удалить')
      } else {
        message.success('Запись удалена')
        refetch()
      }
    },
    [message, refetch],
  )

  const columns: TableProps<LocationRow>['columns'] = useMemo(
    () => [
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: LocationRow, b: LocationRow) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: LocationRow) => record.name === value,
      render: (_: unknown, record: LocationRow) =>
        record.id === editingId ? (
          <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
        ) : (
          record.name
        ),
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: LocationRow) =>
        record.id === editingId ? (
          <Space>
            <Button
              icon={<CheckOutlined />}
              onClick={() => save(record.id)}
              aria-label="Сохранить"
            />
            <Button
              icon={<CloseOutlined />}
              onClick={cancelEdit}
              aria-label="Отмена"
            />
          </Space>
        ) : (
          <Space>
            {record.id !== 'new' && (
              <Button
                icon={<EditOutlined />}
                onClick={() => startEdit(record as Location)}
                aria-label="Редактировать"
              />
            )}
            {record.id !== 'new' && (
              <Popconfirm title="Удалить запись?" onConfirm={() => handleDelete(record as Location)}>
                <Button danger icon={<DeleteOutlined />} aria-label="Удалить" />
              </Popconfirm>
            )}
          </Space>
        ),
    },
  ],
    [editingId, nameValue, nameFilters, startEdit, cancelEdit, save, handleDelete],
  )

  const dataSource = useMemo<LocationRow[]>(
    () =>
      editingId === 'new'
        ? [{ id: 'new', name: nameValue, created_at: '', updated_at: '' }, ...(locations ?? [])]
        : (locations ?? []),
    [editingId, locations, nameValue],
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>
          Добавить
        </Button>
      </div>
      <Table<LocationRow>
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />
    </div>
  )
}

