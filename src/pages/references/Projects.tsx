import { useState, useMemo } from 'react'
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
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface Project {
  id: string
  name: string
  address: string
  bottomUndergroundFloor: number
  topGroundFloor: number
  buildingCount: number
  buildingNames: string[]
  created_at: string
}

interface ProjectRow {
  id: string
  name: string
  address: string
  bottom_underground_floor: number | null
  top_ground_floor: number | null
  building_count: number | null
  created_at: string
}

interface ProjectBlockRow {
  project_id: string
  blocks: { name: string | null } | null
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

      const { data: projectRows, error: projectError } = await supabase
        .from('projects')
        .select(
          'id, name, address, bottom_underground_floor, top_ground_floor, building_count, created_at',
        )
        .order('created_at', { ascending: false })

      if (projectError) {
        message.error('Не удалось загрузить данные')
        throw projectError
      }

      const ids = (projectRows ?? []).map((p: ProjectRow) => p.id)
      const { data: blockRows, error: blockError } = ids.length
        ? await supabase
            .from('projects_blocks')
            .select('project_id, blocks(name)')
            .in('project_id', ids)
        : { data: [], error: null }

      if (blockError) {
        message.error('Не удалось загрузить данные')
        throw blockError
      }

      const map = new Map<string, string[]>()
      ;(blockRows as ProjectBlockRow[]).forEach((row) => {
        const arr = map.get(row.project_id) ?? []
        if (row.blocks?.name) arr.push(row.blocks.name)
        map.set(row.project_id, arr)
      })

      return ((projectRows ?? []) as ProjectRow[]).map((p) => ({
        id: p.id,
        name: p.name,
        address: p.address,
        bottomUndergroundFloor: p.bottom_underground_floor ?? 0,
        topGroundFloor: p.top_ground_floor ?? 0,
        buildingCount: p.building_count ?? 0,
        buildingNames: map.get(p.id) ?? [],
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
      address: record.address,
      bottomUndergroundFloor: record.bottomUndergroundFloor,
      topGroundFloor: record.topGroundFloor,
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
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: values.name,
            address: values.address,
            bottom_underground_floor: values.bottomUndergroundFloor,
            top_ground_floor: values.topGroundFloor,
            building_count: values.buildingCount,
          })
          .select('id')
          .single()
        if (projectError) throw projectError

        const blockNames = (values.buildingNames || []).slice(0, values.buildingCount)
        if (blockNames.length) {
          const { data: blocks, error: blocksError } = await supabase
            .from('blocks')
            .insert(blockNames.map((name: string) => ({ name })))
            .select()
          if (blocksError) throw blocksError
          const { error: mapError } = await supabase
            .from('projects_blocks')
            .insert((blocks as { id: string }[]).map((b) => ({ project_id: project.id, block_id: b.id })))
          if (mapError) throw mapError
        }
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentProject) {
        const { error: projectError } = await supabase
          .from('projects')
          .update({
            name: values.name,
            address: values.address,
            bottom_underground_floor: values.bottomUndergroundFloor,
            top_ground_floor: values.topGroundFloor,
            building_count: values.buildingCount,
          })
          .eq('id', currentProject.id)
        if (projectError) throw projectError

        const { data: existing, error: existingError } = await supabase
          .from('projects_blocks')
          .select('block_id')
          .eq('project_id', currentProject.id)
        if (existingError) throw existingError
        const existingIds = existing?.map((e: { block_id: string }) => e.block_id) ?? []
        if (existingIds.length) {
          await supabase.from('projects_blocks').delete().eq('project_id', currentProject.id)
          await supabase.from('blocks').delete().in('id', existingIds)
        }

        const blockNames = (values.buildingNames || []).slice(0, values.buildingCount)
        if (blockNames.length) {
          const { data: blocks, error: blocksError } = await supabase
            .from('blocks')
            .insert(blockNames.map((name: string) => ({ name })))
            .select()
          if (blocksError) throw blocksError
          const { error: mapError } = await supabase
            .from('projects_blocks')
            .insert((blocks as { id: string }[]).map((b) => ({ project_id: currentProject.id, block_id: b.id })))
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
    const { data: mappings } = await supabase
      .from('projects_blocks')
      .select('block_id')
      .eq('project_id', record.id)
    const blockIds = (mappings || []).map((m: { block_id: string }) => m.block_id)
    const { error } = await supabase.from('projects').delete().eq('id', record.id)
    if (error) {
      message.error('Не удалось удалить')
    } else {
      if (blockIds.length) {
        await supabase.from('blocks').delete().in('id', blockIds)
      }
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

  const addressFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.address))).map((a) => ({
        text: a,
        value: a,
      })),
    [projects],
  )

  const floorFilters = useMemo(
    () =>
      Array.from(
        new Set((projects ?? []).map((p) => `${p.bottomUndergroundFloor}:${p.topGroundFloor}`)),
      ).map((f) => ({ text: f, value: f })),
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
      title: 'Проект',
      dataIndex: 'name',
      sorter: (a: Project, b: Project) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: Project) => record.name === value,
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      sorter: (a: Project, b: Project) => a.address.localeCompare(b.address),
      filters: addressFilters,
      onFilter: (value: unknown, record: Project) => record.address === value,
    },
    {
      title: 'Этажи',
      dataIndex: 'floors',
      render: (_: unknown, record: Project) =>
        `${record.bottomUndergroundFloor}:${record.topGroundFloor}`,
      sorter: (a: Project, b: Project) =>
        a.bottomUndergroundFloor - b.bottomUndergroundFloor ||
        a.topGroundFloor - b.topGroundFloor,
      filters: floorFilters,
      onFilter: (value: unknown, record: Project) =>
        `${record.bottomUndergroundFloor}:${record.topGroundFloor}` === value,
    },
    {
      title: 'Кол-во корпусов',
      dataIndex: 'buildingCount',
      sorter: (a: Project, b: Project) => a.buildingCount - b.buildingCount,
      filters: buildingCountFilters,
      onFilter: (value: unknown, record: Project) => record.buildingCount === value,
    },
    {
      title: 'Корпуса',
      dataIndex: 'buildingNames',
      render: (names: string[]) => names.join('; '),
      sorter: (a: Project, b: Project) =>
        a.buildingNames.join('; ').localeCompare(b.buildingNames.join('; ')),
      filters: buildingNameFilters,
      onFilter: (value: unknown, record: Project) =>
        record.buildingNames.includes(value as string),
    },
    {
      title: '',
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
      <Table<Project> dataSource={projects ?? []} columns={columns} rowKey="id" loading={isLoading} />

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
            <p>
              <strong>Проект:</strong> {currentProject?.name}
            </p>
            <p>
              <strong>Адрес:</strong> {currentProject?.address}
            </p>
            <p>
              <strong>Этажи:</strong>{' '}
              {currentProject &&
                `${currentProject.bottomUndergroundFloor}:${currentProject.topGroundFloor}`}
            </p>
            <p>
              <strong>Кол-во корпусов:</strong> {currentProject?.buildingCount}
            </p>
            <p>
              <strong>Корпуса:</strong> {currentProject?.buildingNames.join('; ')}
            </p>
          </div>
        ) : (
          <Form form={form} layout="vertical">
            <Form.Item
              label="Название проекта"
              name="name"
              rules={[{ required: true, message: 'Введите название проекта' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Адрес проекта"
              name="address"
              rules={[{ required: true, message: 'Введите адрес проекта' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Нижний этаж"
              name="bottomUndergroundFloor"
              rules={[{ required: true, message: 'Введите нижний этаж' }]}
            >
              <InputNumber min={-3} max={0} />
            </Form.Item>
            <Form.Item
              label="Верхний этаж"
              name="topGroundFloor"
              rules={[{ required: true, message: 'Введите верхний этаж' }]}
            >
              <InputNumber min={1} max={120} />
            </Form.Item>
            <Form.Item
              label="Кол-во корпусов"
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

