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

interface Project {
  id: string
  name: string
  description: string
  address: string
  buildingName: string
  created_at: string
}

export default function Projects() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [form] = Form.useForm()

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return (data as {
        id: string
        name: string
        description: string
        address: string
        building_name: string
        created_at: string
      }[]).map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        address: p.address,
        buildingName: p.building_name,
        created_at: p.created_at,
      }))
    },
  })

  const openAddModal = () => {
    form.resetFields()
    setModalMode('add')
  }

  const openViewModal = (record: Project) => {
    setCurrentProject(record)
    setModalMode('view')
  }

  const openEditModal = (record: Project) => {
    setCurrentProject(record)
    form.setFieldsValue({
      name: record.name,
      description: record.description,
      address: record.address,
      buildingName: record.buildingName,
    })
    setModalMode('edit')
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      if (modalMode === 'add') {
        const { error } = await supabase.from('projects').insert({
          name: values.name,
          description: values.description,
          address: values.address,
          building_name: values.buildingName,
        })
        if (error) throw error
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentProject) {
        const { error } = await supabase
          .from('projects')
          .update({
            name: values.name,
            description: values.description,
            address: values.address,
            building_name: values.buildingName,
          })
          .eq('id', currentProject.id)
        if (error) throw error
        message.success('Запись обновлена')
      }
      setModalMode(null)
      setCurrentProject(null)
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: Project) => {
    if (!supabase) return
    const { error } = await supabase.from('projects').delete().eq('id', record.id)
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
    { title: 'Адрес', dataIndex: 'address' },
    { title: 'Корпус', dataIndex: 'buildingName' },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: Project) => (
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
      <Table<Project>
        dataSource={projects ?? []}
        columns={columns}
        rowKey="id"
        loading={isLoading}
      />

      <Modal
        open={modalMode !== null}
        title={
          modalMode === 'add'
            ? 'Добавить проект'
            : modalMode === 'edit'
              ? 'Редактировать проект'
              : 'Просмотр проекта'
        }
        onCancel={() => {
          setModalMode(null)
          setCurrentProject(null)
        }}
        onOk={modalMode === 'view' ? () => setModalMode(null) : handleSave}
        okText={modalMode === 'view' ? 'Закрыть' : 'Сохранить'}
        cancelText="Отмена"
      >
        {modalMode === 'view' ? (
          <div>
            <p><strong>Название:</strong> {currentProject?.name}</p>
            <p><strong>Описание:</strong> {currentProject?.description}</p>
            <p><strong>Адрес:</strong> {currentProject?.address}</p>
            <p><strong>Корпус:</strong> {currentProject?.buildingName}</p>
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
              label="Описание"
              name="description"
              rules={[{ required: true, message: 'Введите описание' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Адрес"
              name="address"
              rules={[{ required: true, message: 'Введите адрес' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Название корпуса"
              name="buildingName"
              rules={[
                { required: true, message: 'Введите название корпуса' },
                { max: 50, message: 'Максимум 50 символов' },
              ]}
            >
              <Input />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

