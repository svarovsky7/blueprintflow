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
  undergroundFloor: number
  abovegroundFloor: number
  buildingNames: string[]
  blockIds: string[]
  buildingCount: number
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
        .select('id, name, description, address, underground_floor, aboveground_floor, created_at, projects_blocks(blocks(id, name))')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return (data as any[]).map((p) => {
          const blocks = (p.projects_blocks ?? []).map((pb: any) => pb.blocks).filter(Boolean)
          const buildingNames = blocks.map((b: any) => b.name as string)
          const blockIds = blocks.map((b: any) => b.id as string)
          return {
            id: p.id as string,
            name: p.name as string,
            description: p.description as string,
            address: p.address as string,
            undergroundFloor: (p.underground_floor as number | null) ?? 0,
            abovegroundFloor: (p.aboveground_floor as number | null) ?? 0,
            buildingNames,
            blockIds,
            buildingCount: buildingNames.length,
            created_at: p.created_at as string,
          }
        })
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
      undergroundFloor: record.undergroundFloor,
      abovegroundFloor: record.abovegroundFloor,
      buildingCount: record.buildingCount,
      buildingNames: record.buildingNames,
    })
    setModalMode('edit')
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      const names: string[] = (values.buildingNames || []).slice(0, values.buildingCount)
      if (modalMode === 'add') {
        const { data: projectData, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: values.name,
            description: values.description,
            address: values.address,
            underground_floor: values.undergroundFloor,
            aboveground_floor: values.abovegroundFloor,
          })
          .select('id')
          .single()
        if (projectError) throw projectError
        for (const name of names) {
          const { data: blockData, error: blockError } = await supabase
            .from('blocks')
            .insert({ name })
            .select('id')
            .single()
          if (blockError) throw blockError
          const { error: mapError } = await supabase
            .from('projects_blocks')
            .insert({ project_id: projectData.id, block_id: blockData.id })
          if (mapError) throw mapError
        }
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentProject) {
        const { error: updateError } = await supabase
          .from('projects')
          .update({
            name: values.name,
            description: values.description,
            address: values.address,
            underground_floor: values.undergroundFloor,
            aboveground_floor: values.abovegroundFloor,
          })
          .eq('id', currentProject.id)
        if (updateError) throw updateError
        if (currentProject.blockIds.length > 0) {
          await supabase.from('projects_blocks').delete().eq('project_id', currentProject.id)
          await supabase.from('blocks').delete().in('id', currentProject.blockIds)
        }
        for (const name of names) {
          const { data: blockData, error: blockError } = await supabase
            .from('blocks')
            .insert({ name })
            .select('id')
            .single()
          if (blockError) throw blockError
          const { error: mapError } = await supabase
            .from('projects_blocks')
            .insert({ project_id: currentProject.id, block_id: blockData.id })
          if (mapError) throw mapError
        }
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
    try {
      if (record.blockIds.length > 0) {
        await supabase.from('projects_blocks').delete().eq('project_id', record.id)
        await supabase.from('blocks').delete().in('id', record.blockIds)
      }
      const { error } = await supabase.from('projects').delete().eq('id', record.id)
      if (error) throw error
      message.success('Запись удалена')
      refetch()
    } catch {
      message.error('Не удалось удалить')
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

  const undergroundFloorFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.undergroundFloor))).map((f) => ({
        text: String(f),
        value: f,
      })),
    [projects],
  )

  const abovegroundFloorFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.abovegroundFloor))).map((f) => ({
        text: String(f),
        value: f,
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
    ;(projects ?? []).forEach((p) => p.buildingNames.forEach((n: string) => names.add(n)))
    return Array.from(names).map((n: string) => ({ text: n, value: n }))
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
      title: 'Нижний подземный этаж',
      dataIndex: 'undergroundFloor',
      sorter: (a: Project, b: Project) => a.undergroundFloor - b.undergroundFloor,
      filters: undergroundFloorFilters,
      onFilter: (value: unknown, record: Project) => record.undergroundFloor === value,
    },
    {
      title: 'Верхний надземный этаж',
      dataIndex: 'abovegroundFloor',
      sorter: (a: Project, b: Project) => a.abovegroundFloor - b.abovegroundFloor,
      filters: abovegroundFloorFilters,
      onFilter: (value: unknown, record: Project) => record.abovegroundFloor === value,
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
            <p>
              <strong>Нижний подземный этаж:</strong> {currentProject?.undergroundFloor}
            </p>
            <p>
              <strong>Верхний надземный этаж:</strong> {currentProject?.abovegroundFloor}
            </p>
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
              label="Нижний подземный этаж"
              name="undergroundFloor"
              rules={[{ required: true, message: 'Введите нижний этаж' }]}
            >
              <InputNumber />
            </Form.Item>
            <Form.Item
              label="Верхний надземный этаж"
              name="abovegroundFloor"
              rules={[{ required: true, message: 'Введите верхний этаж' }]}
            >
              <InputNumber />
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

