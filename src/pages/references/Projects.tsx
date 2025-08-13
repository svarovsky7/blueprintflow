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
import type { TableProps } from 'antd'
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
  projects_blocks?: { block_id: string; blocks: { name: string } | null }[] | null
}

interface ProjectRow extends Project {
  blockNames: string[]
}

interface BlockRow {
  id: string
}

export default function Projects() {
  const { message } = App.useApp()
  const [modalMode, setModalMode] = useState<'add' | 'edit' | 'view' | null>(null)
  const [currentProject, setCurrentProject] = useState<ProjectRow | null>(null)
  const [blocksCount, setBlocksCount] = useState(0)
  const [existingBlockIds, setExistingBlockIds] = useState<string[]>([])
  const [form] = Form.useForm()

  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('projects')
        .select('*, projects_blocks(block_id, blocks(name))')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as Project[]
    },
  })

  const projectRows = useMemo<ProjectRow[]>(
    () =>
      (projects ?? []).map((p) => ({
        ...p,
        blockNames:
          p.projects_blocks?.map((b) => b.blocks?.name).filter((n): n is string => !!n) ?? [],
      })),
    [projects],
  )

  const openAddModal = () => {
    form.resetFields()
    setBlocksCount(0)
    setExistingBlockIds([])
    setModalMode('add')
  }

  const openViewModal = (record: ProjectRow) => {
    setCurrentProject(record)
    setModalMode('view')
  }

  const openEditModal = (record: ProjectRow) => {
    setCurrentProject(record)
    const blockNames = record.blockNames
    const blockIds = record.projects_blocks?.map((b) => b.block_id) ?? []
    setExistingBlockIds(blockIds)
    setBlocksCount(blockNames.length)
    form.setFieldsValue({
      name: record.name,
      address: record.address,
      bottom_underground_floor: record.bottom_underground_floor,
      top_ground_floor: record.top_ground_floor,
      blocks_count: blockNames.length || record.blocks_count,
      blockNames,
    })
    setModalMode('edit')
  }

  const handleBlocksCountChange = (value: number | null) => {
    const count = value ?? 0
    const current = form.getFieldValue('blockNames') || []
    const updated = Array.from({ length: count }, (_, i) => current[i] || '')
    form.setFieldsValue({ blockNames: updated })
    setBlocksCount(count)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      const blockNames: string[] = values.blockNames ?? []
      const projectData = {
        name: values.name,
        address: values.address,
        bottom_underground_floor: values.bottom_underground_floor,
        top_ground_floor: values.top_ground_floor,
        blocks_count: values.blocks_count,
      }
      if (modalMode === 'add') {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert(projectData)
          .select('id')
          .single()
        if (projectError) throw projectError
        const projectRow = project as { id: string }
        if (blockNames.length) {
          const { data: blocksData, error: blocksError } = await supabase
            .from('blocks')
            .insert(blockNames.map((name) => ({ name })))
            .select('id')
          if (blocksError) throw blocksError
          const rows = blocksData as BlockRow[] | null
          const projectBlocks = (rows ?? []).map((b) => ({
            project_id: projectRow.id,
            block_id: b.id,
          }))
          const { error: linkError } = await supabase
            .from('projects_blocks')
            .insert(projectBlocks)
          if (linkError) throw linkError
        }
        message.success('Проект добавлен')
      }
      if (modalMode === 'edit' && currentProject) {
        const { error: projectError } = await supabase
          .from('projects')
          .update(projectData)
          .eq('id', currentProject.id)
        if (projectError) throw projectError
        if (existingBlockIds.length) {
          const { error: delError } = await supabase
            .from('blocks')
            .delete()
            .in('id', existingBlockIds)
          if (delError) throw delError
        }
        if (blockNames.length) {
          const { data: blocksData, error: blocksError } = await supabase
            .from('blocks')
            .insert(blockNames.map((name) => ({ name })))
            .select('id')
          if (blocksError) throw blocksError
          const rows = blocksData as BlockRow[] | null
          const projectBlocks = (rows ?? []).map((b) => ({
            project_id: currentProject.id,
            block_id: b.id,
          }))
          const { error: linkError } = await supabase
            .from('projects_blocks')
            .insert(projectBlocks)
          if (linkError) throw linkError
        }
        message.success('Проект обновлён')
      }
      setModalMode(null)
      setCurrentProject(null)
      setBlocksCount(0)
      setExistingBlockIds([])
      await refetch()
    } catch {
      message.error('Не удалось сохранить')
    }
  }

  const handleDelete = async (record: ProjectRow) => {
    if (!supabase) return
    const { data } = await supabase
      .from('projects_blocks')
      .select('block_id')
      .eq('project_id', record.id)
    const idsData = data as { block_id: string }[] | null
    const blockIds = idsData?.map((b) => b.block_id) ?? []
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

  const blockNameFilters = useMemo(
    () =>
      Array.from(new Set(projectRows.flatMap((p) => p.blockNames))).map((n) => ({
        text: n,
        value: n,
      })),
    [projectRows],
  )

  const columns: TableProps<ProjectRow>['columns'] = [
    {
      title: 'Название',
      dataIndex: 'name',
      sorter: (a: ProjectRow, b: ProjectRow) => a.name.localeCompare(b.name),
      filters: nameFilters,
      onFilter: (value: unknown, record: ProjectRow) => record.name === value,
    },
    {
      title: 'Адрес',
      dataIndex: 'address',
      sorter: (a: ProjectRow, b: ProjectRow) =>
        (a.address ?? '').localeCompare(b.address ?? ''),
      filters: addressFilters,
      onFilter: (value: unknown, record: ProjectRow) => record.address === value,
    },
    {
      title: 'Нижний этаж',
      dataIndex: 'bottom_underground_floor',
      sorter: (a: ProjectRow, b: ProjectRow) =>
        (a.bottom_underground_floor ?? 0) - (b.bottom_underground_floor ?? 0),
      filters: bottomFilters,
      onFilter: (value: unknown, record: ProjectRow) =>
        record.bottom_underground_floor === value,
    },
    {
      title: 'Верхний этаж',
      dataIndex: 'top_ground_floor',
      sorter: (a: ProjectRow, b: ProjectRow) =>
        (a.top_ground_floor ?? 0) - (b.top_ground_floor ?? 0),
      filters: topFilters,
      onFilter: (value: unknown, record: ProjectRow) => record.top_ground_floor === value,
    },
    {
      title: 'Кол-во корпусов',
      dataIndex: 'blocks_count',
      sorter: (a: ProjectRow, b: ProjectRow) =>
        (a.blocks_count ?? 0) - (b.blocks_count ?? 0),
      filters: blockCountFilters,
      onFilter: (value: unknown, record: ProjectRow) => record.blocks_count === value,
    },
    {
      title: 'Корпуса',
      dataIndex: 'blockNames',
      sorter: (a: ProjectRow, b: ProjectRow) =>
        a.blockNames.join(';').localeCompare(b.blockNames.join(';')),
      filters: blockNameFilters,
      onFilter: (value: unknown, record: ProjectRow) =>
        record.blockNames.includes(value as string),
      render: (names: string[]) => names.join('; '),
    },
    {
      title: 'Действия',
      dataIndex: 'actions',
      render: (_: unknown, record: ProjectRow) => (
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
      <Table<ProjectRow>
        dataSource={projectRows}
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
          setBlocksCount(0)
          setExistingBlockIds([])
          form.resetFields()
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
              <InputNumber min={1} onChange={handleBlocksCountChange} />
            </Form.Item>
            {Array.from({ length: blocksCount }).map((_, index) => (
              <Form.Item
                key={index}
                label={`Название корпуса ${index + 1}`}
                name={['blockNames', index]}
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

