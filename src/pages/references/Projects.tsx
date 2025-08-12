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
import { EyeOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'

interface Project {
  id: string
  name: string
  address: string
  bottomFloor: number
  topFloor: number
  buildingCount: number
  blockNames: string[]
  created_at: string
}

interface ProjectRow {
  id: string
  name: string
  address?: string | null
  bottom_underground_floor?: number | null
  top_ground_floor?: number | null
  building_count?: number | null
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

  const blockCount = Form.useWatch('buildingCount', form) || 0

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []

      const { data: projectRows, error: projectError } = await supabase
        .from('projects')
        .select('*')
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

      return ((projectRows ?? []) as ProjectRow[]).map((p) => {
        const names = map.get(p.id) ?? []
        return {
          id: p.id,
          name: p.name,
          address: p.address ?? '',
          bottomFloor: p.bottom_underground_floor ?? 0,
          topFloor: p.top_ground_floor ?? 0,
          buildingCount: p.building_count ?? names.length,
          blockNames: names,
          created_at: p.created_at,
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
      address: record.address,
      bottomFloor: record.bottomFloor,
      topFloor: record.topFloor,
      buildingCount: record.buildingCount,
      blocks: record.blockNames,
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
          .insert([
            {
              name: values.name,
              address: values.address,
              bottom_underground_floor: values.bottomFloor,
              top_ground_floor: values.topFloor,
              building_count: values.buildingCount,
            },
          ])
          .select('id')
          .single()
        if (projectError) throw projectError

        const blockNames = (values.blocks || []).slice(0, values.buildingCount)
        if (blockNames.length) {
          const { data: blocks, error: blocksError } = await supabase
            .from('blocks')
            .insert(blockNames.map((name: string) => ({ name })))
            .select()
          if (blocksError) throw blocksError
          const { error: mapError } = await supabase
            .from('projects_blocks')
            .insert(
              (blocks as { id: string }[]).map((b) => ({
                project_id: project.id,
                block_id: b.id,
              })),
            )
          if (mapError) throw mapError
        }

        message.success('Проект добавлен')
      }

      if (modalMode === 'edit' && currentProject) {
        const { error: projectError } = await supabase
          .from('projects')
          .update({
            name: values.name,
            address: values.address,
            bottom_underground_floor: values.bottomFloor,
            top_ground_floor: values.topFloor,
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

        const blockNames = (values.blocks || []).slice(0, values.buildingCount)
        if (blockNames.length) {
          const { data: blocks, error: blocksError } = await supabase
            .from('blocks')
            .insert(blockNames.map((name: string) => ({ name })))
            .select()
          if (blocksError) throw blocksError
          const { error: mapError } = await supabase
            .from('projects_blocks')
            .insert(
              (blocks as { id: string }[]).map((b) => ({
                project_id: currentProject.id,
                block_id: b.id,
              })),
            )
          if (mapError) throw mapError
        }

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
      Array.from(new Set((projects ?? []).map((p) => p.address))).map((a) => ({
        text: a,
        value: a,
      })),
    [projects],
  )

  const floorFilters = useMemo(
    () =>
      Array.from(
        new Set((projects ?? []).map((p) => `${p.bottomFloor}:${p.topFloor}`)),
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

  const blockNameFilters = useMemo(() => {
    const names = new Set<string>()
    ;(projects ?? []).forEach((p) => p.blockNames.forEach((n) => names.add(n)))
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
      render: (_: unknown, record: Project) => `${record.bottomFloor}:${record.topFloor}`,
      sorter: (a: Project, b: Project) =>
        a.bottomFloor - b.bottomFloor || a.topFloor - b.topFloor,
      filters: floorFilters,
      onFilter: (value: unknown, record: Project) =>
        `${record.bottomFloor}:${record.topFloor}` === value,
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
      dataIndex: 'blockNames',
      render: (names: string[]) => names.join('; '),
      sorter: (a: Project, b: Project) =>
        a.blockNames.join('; ').localeCompare(b.blockNames.join('; ')),
      filters: blockNameFilters,
      onFilter: (value: unknown, record: Project) =>
        record.blockNames.includes(value as string),
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
          <Popconfirm title="Удалить проект?" onConfirm={() => handleDelete(record)}>
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
            <p>
              <strong>Проект:</strong> {currentProject?.name}
            </p>
            <p>
              <strong>Адрес:</strong> {currentProject?.address}
            </p>
            <p>
              <strong>Этажи:</strong> {currentProject?.bottomFloor}:{currentProject?.topFloor}
            </p>
            <p>
              <strong>Кол-во корпусов:</strong> {currentProject?.buildingCount}
            </p>
            <p>
              <strong>Корпуса:</strong> {currentProject?.blockNames.join('; ')}
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
              name="bottomFloor"
              rules={[{ required: true, message: 'Введите нижний этаж' }]}
            >
              <InputNumber />
            </Form.Item>
            <Form.Item
              label="Верхний этаж"
              name="topFloor"
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
            {Array.from({ length: blockCount }).map((_, index) => (
              <Form.Item
                key={index}
                label={`Корпус ${index + 1}`}
                name={['blocks', index]}
                rules={[{ required: true, message: 'Введите название корпуса' }]}
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

