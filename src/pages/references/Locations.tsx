import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
} from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

interface Location {
  id: string
  name: string
  unit_id: string
  created_at: string
  units: { name: string } | null
}

interface LocationRow extends Location {
  unitName: string
}

interface UnitOption {
  id: string
  name: string
}

export default function Locations() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentLocation, setCurrentLocation] = useState<LocationRow | null>(null)
  const [form] = Form.useForm()

  const { data: locations, isLoading, refetch } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('locations')
        .select('*, units(name)')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as Location[]
    },
  })

  const { data: units } = useQuery({
    queryKey: ['units-for-locations'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('units')
        .select('id, name')
        .order('name', { ascending: true })
      if (error) {
        message.error('Не удалось загрузить единицы')
        throw error
      }
      return data as UnitOption[]
    },
  })

  const locationRows = useMemo<LocationRow[]>(
    () =>
      (locations ?? []).map((l) => ({
        ...l,
        unitName: l.units?.name ?? '',
      })),
    [locations],
  )

  const nameFilters = useMemo(
    () =>
      Array.from(new Set(locationRows.map((l) => l.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [locationRows],
  )

  const unitFilters = useMemo(
    () =>
      Array.from(
        new Set(
          locationRows
            .map((l) => l.unitName)
            .filter((u): u is string => !!u),
        ),
      ).map((u) => ({
        text: u,
        value: u,
      })),
    [locationRows],
  )

  const openAddModal = () => {
    form.resetFields()
    setModalMode('add')
  }

  const openViewModal = (record: LocationRow) => {
    setCurrentLocation(record)
    setModalMode('view')
  }

  const openEditModal = (record: LocationRow) => {
    setCurrentLocation(record)
    form.setFieldsValue({ name: record.name, unit_id: record.unit_id })
    setModalMode('edit')
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      if (modalMode === 'add') {
        const { error } = await supabase
          .from('locations')
          .insert({ name: values.name, unit_id: values.unit_id })
        if (error) throw error
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentLocation) {
        const { error } = await supabase
          .from('locations')
          .update({ name: values.name, unit_id: values.unit_id })
          .eq('id', currentLocation.id)
        if (error) throw error
        message.success('Запись обновлена')
      }
      setModalMode(null)
      setCurrentLocation(null)
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: LocationRow) => {
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
      sorter: (a: LocationRow, b: LocationRow) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: LocationRow) => record.name === value,
    },
    {
      title: 'Единица измерения',
      dataIndex: 'unitName',
      sorter: (a: LocationRow, b: LocationRow) => a.unitName.localeCompare(b.unitName),
      filters: unitFilters,
      onFilter: (value: unknown, record: LocationRow) => record.unitName === value,
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: LocationRow) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => openViewModal(record)}
            aria-label="Просмотр"
          />
          <Button
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
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
        <Button type="primary" onClick={openAddModal}>
          Добавить
        </Button>
      </div>
      <Table<LocationRow>
        dataSource={locationRows}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить локализацию'
            : modalMode === 'edit'
              ? 'Редактировать локализацию'
              : 'Просмотр локализации'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentLocation(null)
        }}
        onOk={modalMode === 'view' ? () => setModalMode(null) : handleSave}
        okText={modalMode === 'view' ? 'Закрыть' : 'Сохранить'}
        cancelText="Отмена"
      >
        {modalMode === 'view' ? (
          <div>
            <p>Название: {currentLocation?.name}</p>
            <p>Единица измерения: {currentLocation?.unitName}</p>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              label="Название"
              name="name"
              rules={[{ required: true, message: 'Введите название' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Единица измерения"
              name="unit_id"
              rules={[{ required: true, message: 'Выберите единицу' }]}
            >
              <Select
                options={(units ?? []).map((u) => ({ label: u.name, value: u.id }))}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

