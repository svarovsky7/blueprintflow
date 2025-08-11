import { useEffect, useState } from 'react'
import { App, Button, Input, Select, Space, Table } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { supabase } from '../../lib/supabase'

interface RowData {
  key: string
  projectId: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unitId: string
}

interface ViewRow {
  key: string
  project: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unit: string
}

interface ProjectOption {
  id: string
  name: string
}

interface UnitOption {
  id: string
  name: string
}

interface DbRow {
  id: string
  material: string | null
  quantityPd: number | null
  quantitySpec: number | null
  quantityRd: number | null
  unit_id: string | null
  project_id: string | null
  projects?: { name: string | null } | null
  units?: { name: string | null } | null
}

const emptyRow = (): RowData => ({
  key: Math.random().toString(36).slice(2),
  projectId: '',
  material: '',
  quantityPd: '',
  quantitySpec: '',
  quantityRd: '',
  unitId: '',
})

export default function Chessboard() {
  const [mode, setMode] = useState<'add' | 'show' | null>(null)
  const [rows, setRows] = useState<RowData[]>([])
  const [viewRows, setViewRows] = useState<ViewRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const { message } = App.useApp()

  useEffect(() => {
    if (!supabase) return
    supabase
      .from('projects')
      .select('id, name')
      .then(({ data }) => setProjects((data as ProjectOption[]) ?? []))
    supabase
      .from('units')
      .select('id, name')
      .then(({ data }) => setUnits((data as UnitOption[]) ?? []))
  }, [])

  const addRow = () => setRows([...rows, emptyRow()])

  const handleChange = (key: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  const handleAddClick = () => {
    setMode('add')
    setRows([emptyRow()])
  }

  const handleShow = async () => {
    setMode('show')
    if (!supabase) {
      setViewRows([])
      return
    }
    const { data, error } = await supabase
      .from('chessboard')
      .select('id, material, quantityPd, quantitySpec, quantityRd, unit_id, project_id, projects(name), units(name)')
      .limit(100)
    if (error) {
      console.error('Error fetching chessboard data:', error)
      message.error('Не удалось загрузить данные')
      setViewRows([])
      return
    }
    const rows = (data as unknown as DbRow[] | null) ?? []
    setViewRows(
      rows.map((item) => ({
        key: item.id ? String(item.id) : Math.random().toString(36).slice(2),
        project: item.projects?.name ?? '',
        material: item.material ?? '',
        quantityPd:
          item.quantityPd !== null && item.quantityPd !== undefined
            ? String(item.quantityPd)
            : '',
        quantitySpec:
          item.quantitySpec !== null && item.quantitySpec !== undefined
            ? String(item.quantitySpec)
            : '',
        quantityRd:
          item.quantityRd !== null && item.quantityRd !== undefined
            ? String(item.quantityRd)
            : '',
        unit: item.units?.name ?? '',
      }))
    )
  }

  const handleSave = async () => {
    const tableName = 'chessboard'
    if (!supabase) {
      console.error('Supabase client is not configured')
      return
    }
    const payload = rows.map(({ key, projectId, quantityPd, quantitySpec, quantityRd, material, unitId }) => {
      void key
      return {
        project_id: projectId || null,
        material,
        quantityPd: quantityPd ? Number(quantityPd) : null,
        quantitySpec: quantitySpec ? Number(quantitySpec) : null,
        quantityRd: quantityRd ? Number(quantityRd) : null,
        unit_id: unitId || null,
      }
    })
    const { error } = await supabase.from(tableName).insert(payload)
    if (error) {
      console.error('Error inserting into chessboard:', error)
      message.error(`Не удалось сохранить данные: ${error.message}`)
    } else {
      message.success('Данные успешно сохранены')
    }
  }

  const columns = [
    {
      title: 'проект',
      dataIndex: 'projectId',
      render: (_: unknown, record: RowData) => (
        <Select
          style={{ width: 200 }}
          value={record.projectId}
          onChange={(value) => handleChange(record.key, 'projectId', value)}
          options={projects.map((p) => ({ value: p.id, label: p.name }))}
        />
      ),
    },
    {
      title: 'материал',
      dataIndex: 'material',
      render: (_: unknown, record: RowData) => (
        <Input value={record.material} onChange={(e) => handleChange(record.key, 'material', e.target.value)} />
      ),
    },
    {
      title: 'количество материала по проектной документации',
      dataIndex: 'quantityPd',
      render: (_: unknown, record: RowData) => (
        <Input value={record.quantityPd} onChange={(e) => handleChange(record.key, 'quantityPd', e.target.value)} />
      ),
    },
    {
      title: 'количество материала по спецификации',
      dataIndex: 'quantitySpec',
      render: (_: unknown, record: RowData) => (
        <Input value={record.quantitySpec} onChange={(e) => handleChange(record.key, 'quantitySpec', e.target.value)} />
      ),
    },
    {
      title: 'количество материала по рабочей документации',
      dataIndex: 'quantityRd',
      render: (_: unknown, record: RowData) => (
        <Input value={record.quantityRd} onChange={(e) => handleChange(record.key, 'quantityRd', e.target.value)} />
      ),
    },
    {
      title: 'единица измерения',
      dataIndex: 'unitId',
      render: (_: unknown, record: RowData) => (
        <Select
          style={{ width: 200 }}
          value={record.unitId}
          onChange={(value) => handleChange(record.key, 'unitId', value)}
          options={units.map((u) => ({ value: u.id, label: u.name }))}
        />
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      render: (_: unknown, __: RowData, index: number) =>
        index === rows.length - 1 ? (
          <Button type="text" icon={<PlusOutlined />} onClick={addRow} />
        ) : null,
    },
  ]

  const viewColumns = [
    { title: 'проект', dataIndex: 'project' },
    { title: 'материал', dataIndex: 'material' },
    { title: 'количество материала по проектной документации', dataIndex: 'quantityPd' },
    { title: 'количество материала по спецификации', dataIndex: 'quantitySpec' },
    { title: 'количество материала по рабочей документации', dataIndex: 'quantityRd' },
    { title: 'единица измерения', dataIndex: 'unit' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Space>
          <Button onClick={handleAddClick}>Добавить</Button>
          <Button onClick={handleShow}>Показать</Button>
        </Space>
      </div>
      {mode === 'add' && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleSave}>Сохранить</Button>
          </Space>
          <Table<RowData> dataSource={rows} columns={columns} pagination={false} rowKey="key" />
        </>
      )}
      {mode === 'show' && (
        <Table<ViewRow> dataSource={viewRows} columns={viewColumns} pagination={false} rowKey="key" />
      )}
    </div>
  )
}
