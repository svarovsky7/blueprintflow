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
  bottomUndergroundFloor: number
  topGroundFloor: number
  buildingCount: number
  buildingNames: string[]
  created_at: string
}

interface ProjectRow {
  id: string
  name: string
  description: string | null
  address: string | null
  bottom_underground_floor: number | null
  top_ground_floor: number | null
  created_at: string
  projects_blocks: { blocks: { name: string | null } | null }[] | null
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
        .select(
          'id, name, description, address, bottom_underground_floor, top_ground_floor, created_at, projects_blocks(blocks(name))',
        )
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return ((data ?? []) as unknown[]).map((p) => {
        const row = p as ProjectRow
        return {
          id: row.id,
          name: row.name,
          description: row.description ?? '',
          address: row.address ?? '',
          bottomUndergroundFloor: row.bottom_underground_floor ?? 0,
          topGroundFloor: row.top_ground_floor ?? 0,
          buildingNames:
            row.projects_blocks
              ?.map((pb) => pb.blocks?.name ?? '')
              .filter((n): n is string => !!n) ?? [],
          buildingCount: row.projects_blocks?.length ?? 0,
          created_at: row.created_at,
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
      bottomUndergroundFloor: record.bottomUndergroundFloor,
      topGroundFloor: record.topGroundFloor,
      buildingCount: record.buildingNames.length,
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
            description: values.description,
            address: values.address,
            bottom_underground_floor: values.bottomUndergroundFloor,
            top_ground_floor: values.topGroundFloor,
          })
          .select()
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
            .insert(
              (blocks as { id: string }[]).map((b) => ({
                project_id: project.id,
                block_id: b.id,
              })),
            )
          if (mapError) throw mapError
        }
        message.success('Запись добавлена')
      }
      if (modalMode === 'edit' && currentProject) {
        const { error: projectError } = await supabase
          .from('projects')
          .update({
            name: values.name,
            description: values.description,
            address: values.address,
            bottom_underground_floor: values.bottomUndergroundFloor,
            top_ground_floor: values.topGroundFloor,
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
            .insert(
              (blocks as { id: string }[]).map((b) => ({
                project_id: currentProject.id,
                block_id: b.id,
              })),
            )
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

  const descriptionFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (projects ?? [])
            .map((p) => p.description)
            .filter((d): d is string => !!d),
        ),
      ).map((d) => ({
        text: d,
        value: d,
      })),
    [projects],
  )

  const addressFilters = useMemo(
    () =>
      Array.from(
        new Set(
          (projects ?? [])
            .map((p) => p.address)
            .filter((a): a is string => !!a),
        ),
      ).map((a) => ({
        text: a,
        value: a,
      })),
    [projects],
  )

  const bottomFloorFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.bottomUndergroundFloor))).map((f) => ({
        text: String(f),
        value: f,
      })),
    [projects],
  )

  const topFloorFilters = useMemo(
    () =>
      Array.from(new Set((projects ?? []).map((p) => p.topGroundFloor))).map((f) => ({
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
      ;(projects ?? []).forEach((p) =>
        p.buildingNames.forEach((n: string) => names.add(n)),
      )
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
      title: 'Нижний подземный этаж',
      dataIndex: 'bottomUndergroundFloor',
      sorter: (a: Project, b: Project) =>
        a.bottomUndergroundFloor - b.bottomUndergroundFloor,
      filters: bottomFloorFilters,
      onFilter: (value: unknown, record: Project) =>
        record.bottomUndergroundFloor === value,
    },
    {
      title: 'Верхний надземный этаж',
      dataIndex: 'topGroundFloor',
      sorter: (a: Project, b: Project) => a.topGroundFloor - b.topGroundFloor,
      filters: topFloorFilters,
      onFilter: (value: unknown, record: Project) => record.topGroundFloor === value,
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
              <strong>Нижний подземный этаж:</strong>{' '}
              {currentProject?.bottomUndergroundFloor}
            </p>
            <p>
              <strong>Верхний надземный этаж:</strong>{' '}
              {currentProject?.topGroundFloor}
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
              name="bottomUndergroundFloor"
              rules={[{ required: true, message: 'Введите нижний подземный этаж' }]}
            >
              <InputNumber min={-3} max={0} />
            </Form.Item>
            <Form.Item
              label="Верхний надземный этаж"
              name="topGroundFloor"
              rules={[{ required: true, message: 'Введите верхний надземный этаж' }]}
            >
              <InputNumber min={1} max={120} />
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

