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
  description: string
  address: string
  buildingCount: number
  buildingNames: string[]
  created_at: string
}

export default function Projects() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [form] = Form.useForm()

  const buildingCount = Form.useWatch('buildingCount', form) || 0

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
        building_count: number | null
        building_names: string[] | null
        created_at: string
      }[]).map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          address: p.address,
          buildingCount: p.building_count ?? 0,
          buildingNames: p.building_names ?? [],
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
      buildingCount: record.buildingCount,
      buildingNames: record.buildingNames,
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
          building_count: values.buildingCount,
          building_names: (values.buildingNames || []).slice(0, values.buildingCount),
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
            building_count: values.buildingCount,
            building_names: (values.buildingNames || []).slice(0, values.buildingCount),
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

  const nameFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.name))).map((n) => ({
        text: n,
        value: n,
      })),
    [projects],
  )

  const descriptionFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.description))).map((d) => ({
        text: d,
        value: d,
      })),
    [projects],
  )

  const addressFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.address))).map((a) => ({
        text: a,
        value: a,
      })),
    [projects],
  )

  const buildingCountFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.buildingCount))).map((c) => ({
        text: String(c),
        value: c,
      })),
    [projects],
  )

  const buildingNameFilters = useMemo(() => {
    const names = new Set<string>()
    ;(projects ?? []).forEach((p) => p.buildingNames.forEach((n) => names.add(n)))
    return Array.from(names).map((n) => ({ text: n, value: n }))
  }, [projects])

  const columns = [
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: Project) => record.name === value,
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      sorter: (a: Project, b: Project) => a.description.localeCompare(b.description),
      filters: descriptionFilters,
      onFilter: (value: unknown, record: Project) => record.description === value,
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      sorter: (a: Project, b: Project) => a.address.localeCompare(b.address),
      filters: addressFilters,
      onFilter: (value: unknown, record: Project) => record.address === value,
    },
    {
      title: 'Количество корпусов',
      dataIndex: 'buildingCount',
      sorter: (a: Project, b: Project) => a.buildingCount - b.buildingCount,
      filters: buildingCountFilters,
      onFilter: (value: unknown, record: Project) => record.buildingCount === value,
    },
    {
      title: 'Корпуса',
      dataIndex: 'buildingNames',
      render: (names: string[]) => names.join(', '),
      sorter: (a: Project, b: Project) =>
        a.buildingNames.join(', ').localeCompare(b.buildingNames.join(', ')),
      filters: buildingNameFilters,
      onFilter: (value: unknown, record: Project) =>
        record.buildingNames.includes(value as string),
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
            <p><strong>Название:</strong> {currentProject?.name}</p>
            <p><strong>Описание:</strong> {currentProject?.description}</p>
            <p><strong>Адрес:</strong> {currentProject?.address}</p>
            <p><strong>Количество корпусов:</strong> {currentProject?.buildingCount}</p>
            <p>
              <strong>Корпуса:</strong> {currentProject?.buildingNames.join(', ')}
            </p>
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
              label="Количество корпусов"
              name="buildingCount"
              rules={[{ required: true, message: 'Введите количество корпусов' }]}
            >
              <InputNumber min={1} />
            </Form.Item>
            {Array.from({ length: buildingCount }).map((_, index) => (
              <Form.Item
                key={index}
                label={`Название корпуса ${index + 1}`}
                name={['buildingNames', index]}
                rules={[
                  { required: true, message: 'Введите название корпуса' },
                  { max: 50, message: 'Максимум 50 символов' },
                ]}
              >
                <Input />
              </Form.Item>
            ))}
          </Form>
        )}
      </Modal>
    </div>
  )
}

