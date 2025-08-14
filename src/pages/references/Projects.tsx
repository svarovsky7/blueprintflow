import { useCallback, useMemo, useState } from 'react'
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

interface BlockInfo {
  name: string
  bottom_underground_floor: number | null
  top_ground_floor: number | null
}

interface Project {
  id: string
  name: string
  address: string | null
  created_at: string
  projects_blocks?: { block_id: string; blocks: BlockInfo | null }[] | null
}

interface ProjectRow extends Project {
  blocks: BlockInfo[]
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
        .select('id, name, address, created_at, projects_blocks(block_id, blocks(name, bottom_underground_floor, top_ground_floor))')
        .order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return data as unknown as Project[]
    },
  })

  const projectRows = useMemo<ProjectRow[]>(
    () =>
      (projects ?? []).map((p) => {
        const blocks =
          p.projects_blocks?.map((b) => b.blocks).filter((b): b is BlockInfo => !!b) ?? []
        return {
          ...p,
          blocks,
          blockNames: blocks.map((b) => b.name),
        }
      }),
    [projects],
  )

  const openAddModal = useCallback(() => {
    form.resetFields()
    setBlocksCount(0)
    setExistingBlockIds([])
    setModalMode('add')
  }, [form])

  const openViewModal = useCallback((record: ProjectRow) => {
    setCurrentProject(record)
    setModalMode('view')
  }, [])

  const openEditModal = useCallback(
    (record: ProjectRow) => {
      setCurrentProject(record)
      const blocks = record.blocks
      const blockIds = record.projects_blocks?.map((b) => b.block_id) ?? []
      setExistingBlockIds(blockIds)
      setBlocksCount(blocks.length)
      form.setFieldsValue({
        name: record.name,
        address: record.address,
        blocksCount: blocks.length,
        blocks,
      })
      setModalMode('edit')
    },
    [form],
  )

  const handleBlocksCountChange = (value: number | null) => {
    const count = value ?? 0
    const current = form.getFieldValue('blocks') || []
    const updated = Array.from({ length: count }, (_, i) =>
      current[i] || { name: '', bottom_underground_floor: null, top_ground_floor: null },
    )
    form.setFieldsValue({ blocks: updated })
    setBlocksCount(count)
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      if (!supabase) return
      const blocks: BlockInfo[] = values.blocks ?? []
      const projectData = {
        name: values.name,
        address: values.address,
      }
      if (modalMode === 'add') {
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .insert(projectData)
          .select('id')
          .single()
        if (projectError) throw projectError
        const projectRow = project as { id: string }
        if (blocks.length) {
          const { data: blocksData, error: blocksError } = await supabase
            .from('blocks')
            .insert(blocks)
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
        if (blocks.length) {
          const { data: blocksData, error: blocksError } = await supabase
            .from('blocks')
            .insert(blocks)
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

  const handleDelete = useCallback(
    async (record: ProjectRow) => {
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
    },
    [message, refetch],
  )

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

  const blockNameFilters = useMemo(
    () =>
      Array.from(new Set(projectRows.flatMap((p) => p.blockNames))).map((n) => ({
        text: n,
        value: n,
      })),
    [projectRows],
  )

  const columns: TableProps<ProjectRow>['columns'] = useMemo(
    () => [
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
        title: 'Корпуса',
        dataIndex: 'blockNames',
        sorter: (a: ProjectRow, b: ProjectRow) =>
          a.blockNames.join(';').localeCompare(b.blockNames.join(';')),
        filters: blockNameFilters,
        onFilter: (value: unknown, record: ProjectRow) =>
          record.blockNames.includes(value as string),
        render: (_: unknown, record: ProjectRow) =>
          record.blocks
            .map(
              (b) =>
                `${b.name} (${b.bottom_underground_floor ?? ''}; ${b.top_ground_floor ?? ''})`,
            )
            .join('; '),
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
    ],
    [nameFilters, addressFilters, blockNameFilters, openViewModal, openEditModal, handleDelete],
  )

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
            <p>Количество корпусов: {currentProject?.blocks.length ?? 0}</p>
            <p>
              Корпуса:{' '}
              {currentProject?.blocks
                .map(
                  (b) =>
                    `${b.name} (от ${b.bottom_underground_floor ?? ''} до ${b.top_ground_floor ?? ''})`,
                )
                .join('; ')}
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
              label="Адрес"
              name="address"
              rules={[{ required: true, message: 'Введите адрес' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              label="Количество корпусов"
              name="blocksCount"
              rules={[{ required: true, message: 'Введите количество корпусов' }]}
            >
              <InputNumber min={1} onChange={handleBlocksCountChange} />
            </Form.Item>
            {Array.from({ length: blocksCount }).map((_, index) => (
              <Space key={index} direction="vertical" style={{ width: '100%' }}>
                <Form.Item
                  label={`Название корпуса ${index + 1}`}
                  name={['blocks', index, 'name']}
                  rules={[{ required: true, message: 'Введите название корпуса' }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  label="Нижний этаж"
                  name={['blocks', index, 'bottom_underground_floor']}
                  rules={[{ required: true, message: 'Введите нижний этаж' }]}
                >
                  <InputNumber />
                </Form.Item>
                <Form.Item
                  label="Верхний этаж"
                  name={['blocks', index, 'top_ground_floor']}
                  rules={[{ required: true, message: 'Введите верхний этаж' }]}
                >
                  <InputNumber />
                </Form.Item>
              </Space>
            ))}
          </Form>
        )}
      </Modal>
    </div>
  )
}

