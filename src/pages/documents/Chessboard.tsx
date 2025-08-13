import { useEffect, useMemo, useState } from 'react'
import { App, Button, Input, Select, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
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
  costCategoryCode: string
}

interface ViewRow {
  key: string
  project: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unit: string
  costCategory: string
}

interface ProjectOption {
  id: string
  name: string
}

interface UnitOption {
  id: string
  name: string
}

interface CostCategoryOption {
  code: string
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
  cost_category_code: string | null
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
  costCategoryCode: '',
})

export default function Chessboard() {
  const [mode, setMode] = useState<'add' | 'show'>('show')
  const [rows, setRows] = useState<RowData[]>([])
  const [viewRows, setViewRows] = useState<ViewRow[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [units, setUnits] = useState<UnitOption[]>([])
  const [costCategories, setCostCategories] = useState<CostCategoryOption[]>([])
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedCategory, setSelectedCategory] = useState<string>()
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
    supabase
      .from('cost_categories')
      .select('code, name')
      .order('code', { ascending: true })
      .then(({ data }) => setCostCategories((data as CostCategoryOption[]) ?? []))
  }, [])

  const addRow = () => setRows([...rows, emptyRow()])

  const handleChange = (key: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  const handleAddClick = () => {
    setMode('add')
    setRows([emptyRow()])
  }

  useEffect(() => {
    if (mode !== 'show' || !supabase || !selectedProject || !selectedCategory) {
      setViewRows([])
      return
    }
    const load = async () => {
      if (!supabase) {
        setViewRows([])
        return
      }
      const { data, error } = await supabase
        .from('chessboard')
        .select(
          'id, material, quantityPd, quantitySpec, quantityRd, unit_id, project_id, cost_category_code, projects(name), units(name)'
        )
        .eq('project_id', selectedProject)
        .eq('cost_category_code', selectedCategory)
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
          costCategory: item.cost_category_code ?? '',
        }))
      )
    }
    void load()
  }, [mode, selectedProject, selectedCategory, message])

  const handleSave = async () => {
    const tableName = 'chessboard'
    if (!supabase) {
      console.error('Supabase client is not configured')
      return
    }
    const payload = rows.map(
      ({ key, projectId, quantityPd, quantitySpec, quantityRd, material, unitId, costCategoryCode }) => {
        void key
        return {
          project_id: projectId || null,
          material,
          quantityPd: quantityPd ? Number(quantityPd) : null,
          quantitySpec: quantitySpec ? Number(quantitySpec) : null,
          quantityRd: quantityRd ? Number(quantityRd) : null,
          unit_id: unitId || null,
          cost_category_code: costCategoryCode || '99',
        }
      }
    )
    const { error } = await supabase.from(tableName).insert(payload)
    if (error) {
      console.error('Error inserting into chessboard:', error)
      message.error(`Не удалось сохранить данные: ${error.message}`)
    } else {
      message.success('Данные успешно сохранены')
      setMode('show')
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
      width: 400,
      render: (_: unknown, record: RowData) => (
        <Input
          style={{ width: 400 }}
          value={record.material}
          onChange={(e) => handleChange(record.key, 'material', e.target.value)}
        />
      ),
    },
    {
      title: 'Кол-во по ПД',
      dataIndex: 'quantityPd',
      render: (_: unknown, record: RowData) => (
        <Input
          style={{ width: '10ch' }}
          value={record.quantityPd}
          onChange={(e) => handleChange(record.key, 'quantityPd', e.target.value)}
        />
      ),
    },
    {
      title: 'Кол-во по спеке РД',
      dataIndex: 'quantitySpec',
      render: (_: unknown, record: RowData) => (
        <Input
          style={{ width: '10ch' }}
          value={record.quantitySpec}
          onChange={(e) => handleChange(record.key, 'quantitySpec', e.target.value)}
        />
      ),
    },
    {
      title: 'Кол-во по пересчету РД',
      dataIndex: 'quantityRd',
      render: (_: unknown, record: RowData) => (
        <Input
          style={{ width: '10ch' }}
          value={record.quantityRd}
          onChange={(e) => handleChange(record.key, 'quantityRd', e.target.value)}
        />
      ),
    },
    {
      title: 'ед.изм.',
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
      title: 'категория затрат',
      dataIndex: 'costCategoryCode',
      render: (_: unknown, record: RowData) => (
        <Select
          style={{ width: 200 }}
          value={record.costCategoryCode}
          onChange={(value) => handleChange(record.key, 'costCategoryCode', value)}
          options={costCategories.map((c) => ({ value: c.code, label: `${c.code} ${c.name}` }))}
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

  const viewColumns: ColumnsType<ViewRow> = useMemo(() => {
    const base: Array<{ title: string; dataIndex: keyof ViewRow; width?: number }> = [
      { title: 'проект', dataIndex: 'project' },
      { title: 'материал', dataIndex: 'material', width: 400 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec' },
      { title: 'Кол-во по пересчету РД', dataIndex: 'quantityRd' },
      { title: 'ед.изм.', dataIndex: 'unit' },
      { title: 'категория затрат', dataIndex: 'costCategory' },
    ]

    return base.map((col) => {
      const values = Array.from(
        new Set(viewRows.map((row) => row[col.dataIndex]).filter((v) => v !== undefined && v !== '')),
      )

      return {
        ...col,
        sorter: (a: ViewRow, b: ViewRow) => {
          const aVal = a[col.dataIndex]
          const bVal = b[col.dataIndex]
          const aNum = Number(aVal)
          const bNum = Number(bVal)
          if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum
          return String(aVal ?? '').localeCompare(String(bVal ?? ''))
        },
        filters: values.map((v) => ({ text: String(v), value: String(v) })),
        onFilter: (value, record) => String(record[col.dataIndex]) === String(value),
      }
    })
  }, [viewRows])

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Объект</span>
            <Select
              style={{ width: 200 }}
              value={selectedProject}
              onChange={setSelectedProject}
              options={projects.map((p) => ({ value: p.id, label: p.name }))}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span>Категория затрат</span>
            <Select
              style={{ width: 200 }}
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={costCategories.map((c) => ({ value: c.code, label: `${c.code} ${c.name}` }))}
            />
          </div>
        </Space>
        <Button onClick={handleAddClick}>Добавить</Button>
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
