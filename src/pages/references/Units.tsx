import { useCallback, useMemo, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

interface Unit {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function Units() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentUnit, setCurrentUnit] = useState<Unit | null>(null)
  const [form] = Form.useForm()

  const { data: units, isLoading, refetch } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as Unit[]
    },
  })

  const openAddModal = useCallback(() => {
    form.resetFields()
    setModalMode('add')
  }, [form])

  const openViewModal = useCallback((record: Unit) => {
    setCurrentUnit(record)
    setModalMode('view')
  }, [])

  const openEditModal = useCallback(
    (record: Unit) => {
      setCurrentUnit(record)
      form.setFieldsValue({ name: record.name, description: record.description })
      setModalMode('edit')
    },
    [form],
  )

  const handleSave = useCallback(async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      if (modalMode === 'add') {
        const { error } = await supabase
          .from('units')
          .insert({ name: values.name, description: values.description })
        if (error) throw error
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentUnit) {
        const { error } = await supabase
          .from('units')
          .update({ name: values.name, description: values.description })
          .eq('id', currentUnit.id)
        if (error) throw error
        message.success('Запись обновлена')
      }
      setModalMode(null)
      setCurrentUnit(null)
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }, [form, modalMode, currentUnit, message, refetch])

  const handleDelete = useCallback(
    async (record: Unit) => {
      if (!supabase) return
      const { error } = await supabase.from('units').delete().eq('id', record.id)
      if (error) {
        message.error('Не удалось удалить')
      } else {
        message.success('Запись удалена')
        refetch()
      }
    },
    [message, refetch],
  )

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((units ?? []).map((u) => u.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [units],
  )

  const descriptionFilters = useMemo(
    () =>
      Array.from(
        new Set((units ?? []).map((u) => u.description).filter((d): d is string => !!d)),
      ).map((d) => ({
        text: d,
        value: d,
      })),
    [units],
  )

  const columns: ColumnsType<Unit> = useMemo(
    () => [
      {
        title: 'Название',
        dataIndex: 'name',
        sorter: (a: Unit, b: Unit) => a.name.localeCompare(b.name),
        filters: nameFilters,
        onFilter: (value: unknown, record: Unit) => record.name === value,
      },
      {
        title: 'Описание',
        dataIndex: 'description',
        sorter: (a: Unit, b: Unit) =>
          (a.description ?? '').localeCompare(b.description ?? ''),
        filters: descriptionFilters,
        onFilter: (value: unknown, record: Unit) => record.description === value,
      },
      {
        title: 'Действия',
        dataIndex: 'actions',
        render: (_: unknown, record: Unit) => (
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
    ],
    [
      nameFilters,
      descriptionFilters,
      openViewModal,
      openEditModal,
      handleDelete,
    ],
  )

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" onClick={openAddModal}>
          Добавить
        </Button>
      </div>
      <Table<Unit>
        dataSource={units ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить единицу'
            : modalMode === 'edit'
              ? 'Редактировать единицу'
              : 'Просмотр единицы'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentUnit(null)
        }}
        onOk={modalMode === 'view' ? () => setModalMode(null) : handleSave}
        okText={modalMode === 'view' ? 'Закрыть' : 'Сохранить'}
        cancelText="Отмена"
      >
        {modalMode === 'view' ? (
          <div>
            <p>Название: {currentUnit?.name}</p>
            <p>Описание: {currentUnit?.description}</p>
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
            <Form.Item label="Описание" name="description">
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

