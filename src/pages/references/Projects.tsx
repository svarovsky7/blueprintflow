import { useMemo, useState } from 'react'
import {
  App,
  Button,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Space,
  Table,
} from 'antd'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

interface Project {
  id: string
  name: string
  address: string | null
  bottom_underground_floor: number | null
  top_ground_floor: number | null
  blocks_count: number | null
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
      return data as Project[]
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
      address: record.address,
      bottom_underground_floor: record.bottom_underground_floor,
      top_ground_floor: record.top_ground_floor,
      blocks_count: record.blocks_count,
    })
    setModalMode('edit')
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      const projectData = {
        name: values.name,
        address: values.address,
        bottom_underground_floor: values.bottom_underground_floor,
        top_ground_floor: values.top_ground_floor,
        blocks_count: values.blocks_count,
      }
      if (modalMode === 'add') {
        const { error } = await supabase.from('projects').insert(projectData)
        if (error) throw error
        message.success('Проект добавлен')
      }
      if (modalMode === 'edit' && currentProject) {
        const { error } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', currentProject.id)
        if (error) throw error
        message.success('Проект обновлён')
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
      message.success('Проект удалён')
      refetch()
    }
  }

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [projects],
  )

  const addressFilters = useMemo(
    () =>
      Array.from(
        new Set((projects ?? []).map((p) => p.address).filter((a): a is string => !!a)),
      ).map((a) => ({
        text: a,
        value: a,
      })),
    [projects],
  )

  const bottomFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (projects ?? [])
            .map((p) => p.bottom_underground_floor)
            .filter((n): n is number => n !== null),
        ),
      ).map((n) => ({ text: n.toString(), value: n })),
    [projects],
  )

  const topFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (projects ?? [])
            .map((p) => p.top_ground_floor)
            .filter((n): n is number => n !== null),
        ),
      ).map((n) => ({ text: n.toString(), value: n })),
    [projects],
  )

  const blockCountFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (projects ?? [])
            .map((p) => p.blocks_count)
            .filter((n): n is number => n !== null),
        ),
      ).map((n) => ({ text: n.toString(), value: n })),
    [projects],
  )

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: Project) => record.name === value,
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      sorter: (a: Project, b: Project) => (a.address ?? '').localeCompare(b.address ?? ''),
      filters: addressFilters,
      onFilter: (value: unknown, record: Project) => record.address === value,
    },
    {
      title: 'Нижний этаж',
      dataIndex: 'bottom_underground_floor',
      sorter: (a: Project, b: Project) =>
        (a.bottom_underground_floor ?? 0) - (b.bottom_underground_floor ?? 0),
      filters: bottomFilters,
      onFilter: (value: unknown, record: Project) =>
        record.bottom_underground_floor === value,
    },
    {
      title: 'Верхний этаж',
      dataIndex: 'top_ground_floor',
      sorter: (a: Project, b: Project) =>
        (a.top_ground_floor ?? 0) - (b.top_ground_floor ?? 0),
      filters: topFilters,
      onFilter: (value: unknown, record: Project) => record.top_ground_floor === value,
    },
    {
      title: 'Корпуса',
      dataIndex: 'blocks_count',
      sorter: (a: Project, b: Project) => (a.blocks_count ?? 0) - (b.blocks_count ?? 0),
      filters: blockCountFilters,
      onFilter: (value: unknown, record: Project) => record.blocks_count === value,
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: Project) => (
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
            <p>Название: {currentProject?.name}</p>
            <p>Адрес: {currentProject?.address}</p>
            <p>Нижний этаж: {currentProject?.bottom_underground_floor ?? ''}</p>
            <p>Верхний этаж: {currentProject?.top_ground_floor ?? ''}</p>
            <p>Количество корпусов: {currentProject?.blocks_count ?? ''}</p>
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
              label="Адрес"
              name="address"
              rules={[{ required: true, message: 'Введите адрес' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Нижний этаж"
              name="bottom_underground_floor"
              rules={[{ required: true, message: 'Введите нижний этаж' }]}
            >
              <InputNumber />
            </Form.Item>
            <Form.Item
              label="Верхний этаж"
              name="top_ground_floor"
              rules={[{ required: true, message: 'Введите верхний этаж' }]}
            >
              <InputNumber />
            </Form.Item>
            <Form.Item
              label="Количество корпусов"
              name="blocks_count"
              rules={[{ required: true, message: 'Введите количество корпусов' }]}
            >
              <InputNumber min={1} />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  )
}

