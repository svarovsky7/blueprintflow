import { useState } from 'react'
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
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

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

  const openAddModal = () => {
    form.resetFields()
    setModalMode('add')
  }

  const openViewModal = (record: Unit) => {
    setCurrentUnit(record)
    setModalMode('view')
  }

  const openEditModal = (record: Unit) => {
    setCurrentUnit(record)
    form.setFieldsValue({ name: record.name, description: record.description })
    setModalMode('edit')
  }

  const handleSave = async () => {
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
  }

  const handleDelete = async (record: Unit) => {
    if (!supabase) return
    const { error } = await supabase.from('units').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      message.success('Запись удалена')
      refetch()
    }
  }

  const columns = [
    { title: 'Название', dataIndex: 'name' },
    { title: 'Описание', dataIndex: 'description' },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: Unit) => (
        <Space>
          <Button onClick={() => openViewModal(record)}>Просмотр</Button>
          <Button onClick={() => openEditModal(record)}>Редактировать</Button>
          <Popconfirm title="Удалить запись?" onConfirm={() => handleDelete(record)}>
            <Button danger>Удалить</Button>
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

