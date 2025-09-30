import { useCallback, useMemo, useState } from 'react'
import { App, Button, Input, Modal, Space, Table, type TableProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons'
import { roomsApi, type Room } from '@/entities/rooms'

type RoomRow = Room | { id: 'new'; name: string; created_at: string; updated_at: string }

export default function Rooms() {
  const { message } = App.useApp()
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [nameValue, setNameValue] = useState('')

  const {
    data: rooms,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      return await roomsApi.getAll()
    },
  })

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((rooms ?? []).map((r) => r.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [rooms],
  )

  const startEdit = useCallback((record: Room) => {
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
      try {
        if (id === 'new') {
          await roomsApi.create(nameValue)
          message.success('Запись добавлена')
        } else {
          await roomsApi.update(id, nameValue)
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
    async (record: Room) => {
      try {
        await roomsApi.delete(record.id)
        message.success('Запись удалена')
        refetch()
      } catch {
        message.error('Не удалось удалить')
      }
    },
    [message, refetch],
  )

  const confirmDelete = useCallback(
    (record: Room) => {
      Modal.confirm({
        title: 'Удалить запись?',
        okText: 'Удалить',
        okButtonProps: { danger: true },
        cancelText: 'Отмена',
        onOk: () => handleDelete(record),
      })
    },
    [handleDelete],
  )

  const columns: TableProps<RoomRow>['columns'] = useMemo(
    () => [
      {
        title: 'Название',
        dataIndex: 'name',
        sorter: (a: RoomRow, b: RoomRow) => a.name.localeCompare(b.name),
        filters: nameFilters,
        onFilter: (value: unknown, record: RoomRow) => record.name === value,
        render: (_: unknown, record: RoomRow) =>
          record.id === editingId ? (
            <Input value={nameValue} onChange={(e) => setNameValue(e.target.value)} />
          ) : (
            record.name
          ),
      },
      {
        title: 'Действия',
        dataIndex: 'actions',
        render: (_: unknown, record: RoomRow) =>
          record.id === editingId ? (
            <Space>
              <Button
                icon={<CheckOutlined />}
                onClick={() => save(record.id)}
                aria-label="Сохранить"
              />
              <Button icon={<CloseOutlined />} onClick={cancelEdit} aria-label="Отмена" />
            </Space>
          ) : (
            <Space>
              {record.id !== 'new' && (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => startEdit(record as Room)}
                  aria-label="Редактировать"
                />
              )}
              {record.id !== 'new' && (
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => confirmDelete(record as Room)}
                  aria-label="Удалить"
                />
              )}
            </Space>
          ),
      },
    ],
    [editingId, nameValue, nameFilters, startEdit, cancelEdit, save, confirmDelete],
  )

  const dataSource = useMemo<RoomRow[]>(
    () =>
      editingId === 'new'
        ? [{ id: 'new', name: nameValue, created_at: '', updated_at: '' }, ...(rooms ?? [])]
        : (rooms ?? []),
    [editingId, rooms, nameValue],
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd}>
          Добавить
        </Button>
      </div>
      <Table<RoomRow>
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />
    </div>
  )
}