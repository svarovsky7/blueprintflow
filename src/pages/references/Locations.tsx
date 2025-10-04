import { useCallback, useMemo, useState } from 'react'
import { App, Button, Input, Modal, Select, Space, Table, Tag, type TableProps } from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EditOutlined, DeleteOutlined, CheckOutlined, CloseOutlined, PlusOutlined } from '@ant-design/icons'
import { roomsApi, type Room } from '@/entities/rooms'
import AddRoomModal from '@/components/AddRoomModal'

interface Location {
  id: number
  name: string
  created_at: string
  updated_at: string
  rooms?: Room[]
}

type LocationRow = Location | { id: 'new'; name: string; created_at: string; updated_at: string; rooms?: Room[] }

export default function Locations() {
  const { message } = App.useApp()
  const [editingId, setEditingId] = useState<number | 'new' | null>(null)
  const [nameValue, setNameValue] = useState('')
  const [selectedRoomIds, setSelectedRoomIds] = useState<number[]>([])
  const [isAddRoomModalVisible, setIsAddRoomModalVisible] = useState(false)

  const {
    data: locations,
    isLoading,
    refetch,
  } = useQuery({
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

      // Загружаем помещения для каждой локализации
      const locationsWithRooms = await Promise.all(
        (data as Location[]).map(async (location) => {
          const rooms = await roomsApi.getByLocationId(location.id)
          return { ...location, rooms }
        }),
      )

      return locationsWithRooms
    },
  })

  const { data: allRooms, refetch: refetchRooms } = useQuery({
    queryKey: ['rooms'],
    queryFn: async () => {
      return await roomsApi.getAll()
    },
  })

  const handleRoomAdded = useCallback(() => {
    refetchRooms()
    refetch()
  }, [refetchRooms, refetch])

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
    setSelectedRoomIds(record.rooms?.map((r) => r.id) || [])
  }, [])

  const handleAdd = useCallback(() => {
    setEditingId('new')
    setNameValue('')
    setSelectedRoomIds([])
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingId(null)
    setNameValue('')
    setSelectedRoomIds([])
  }, [])

  const save = useCallback(
    async (id: number | 'new') => {
      if (!nameValue.trim()) {
        message.error('Введите название')
        return
      }
      if (!supabase) return
      try {
        let locationId: number
        if (id === 'new') {
          const { data, error } = await supabase
            .from('location')
            .insert({ name: nameValue })
            .select()
            .single()
          if (error) throw error
          locationId = data.id
          message.success('Запись добавлена')
        } else {
          const { error } = await supabase.from('location').update({ name: nameValue }).eq('id', id)
          if (error) throw error
          locationId = id
          message.success('Запись обновлена')
        }

        // Обновляем связи с помещениями
        await roomsApi.updateLocationRooms(locationId, selectedRoomIds)

        cancelEdit()
        await refetch()
      } catch {
        message.error('Не удалось сохранить')
      }
    },
    [nameValue, selectedRoomIds, message, cancelEdit, refetch],
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

  const confirmDelete = useCallback(
    (record: Location) => {
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
        title: 'Названия помещений',
        dataIndex: 'rooms',
        render: (_: unknown, record: LocationRow) =>
          record.id === editingId ? (
            <Select
              mode="multiple"
              placeholder="Выберите помещения"
              value={selectedRoomIds}
              onChange={setSelectedRoomIds}
              style={{ width: '100%' }}
              allowClear
              showSearch
              filterOption={(input, option) =>
                (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
              }
              options={allRooms?.map((room) => ({ label: room.name, value: room.id })) || []}
            />
          ) : (
            <Space size={[0, 8]} wrap>
              {record.rooms?.map((room) => (
                <Tag key={room.id} color="blue">
                  {room.name}
                </Tag>
              ))}
            </Space>
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
              <Button icon={<CloseOutlined />} onClick={cancelEdit} aria-label="Отмена" />
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
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => confirmDelete(record as Location)}
                  aria-label="Удалить"
                />
              )}
            </Space>
          ),
      },
    ],
    [editingId, nameValue, selectedRoomIds, nameFilters, allRooms, startEdit, cancelEdit, save, confirmDelete],
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
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16, gap: 8 }}>
        <Button icon={<PlusOutlined />} onClick={() => setIsAddRoomModalVisible(true)}>
          Добавить помещение
        </Button>
        <Button type="primary" onClick={handleAdd}>
          Добавить локализацию
        </Button>
      </div>
      <Table<LocationRow>
        dataSource={dataSource}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{
          defaultPageSize: 100,
          pageSizeOptions: ['10', '20', '50', '100', '200', '500'],
          showSizeChanger: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
        }}
      />
      <AddRoomModal
        visible={isAddRoomModalVisible}
        onClose={() => setIsAddRoomModalVisible(false)}
        rooms={allRooms || []}
        onRoomAdded={handleRoomAdded}
      />
    </div>
  )
}
