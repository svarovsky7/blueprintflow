import { useMemo, useState } from 'react'
import { App, Button, Input, Select, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface RowData {
  key: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unitId: string
  costCategoryCode: string
  costTypeCode: string
  locationId: string
}

interface ViewRow {
  key: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unit: string
  costCategory: string
  costType: string
  location: string
}

interface ProjectOption { id: string; name: string }
interface UnitOption { id: string; name: string }
interface CostCategoryOption { code: string; name: string }
interface CostTypeOption { code: string; name: string; cost_category_code: string }
interface LocationOption { id: string; name: string }

interface DbRow {
  id: string
  material: string | null
  quantityPd: number | null
  quantitySpec: number | null
  quantityRd: number | null
  unit_id: string | null
  cost_category_code: string | null
  cost_type_code: string | null
  location_id: string | null
  units?: { name: string | null } | null
  cost_categories?: { name: string | null } | null
  detail_cost_categories?: { name: string | null } | null
  location?: { name: string | null } | null
}

const emptyRow = (defaults: Partial<RowData>): RowData => ({
  key: Math.random().toString(36).slice(2),
  material: '',
  quantityPd: '',
  quantitySpec: '',
  quantityRd: '',
  unitId: '',
  costCategoryCode: defaults.costCategoryCode ?? '',
  costTypeCode: defaults.costTypeCode ?? '',
  locationId: '',
})

export default function Chessboard() {
  const { message } = App.useApp()
  const [filters, setFilters] = useState<{ projectId?: string; categoryCode?: string; typeCode?: string }>({})
  const [appliedFilters, setAppliedFilters] = useState<{ projectId: string; categoryCode?: string; typeCode?: string } | null>(
    null,
  )
  const [mode, setMode] = useState<'view' | 'add'>('view')
  const [rows, setRows] = useState<RowData[]>([])

  const { data: projects } = useQuery<ProjectOption[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('projects').select('id, name').order('name')
      if (error) throw error
      return data as ProjectOption[]
    },
  })

  const { data: units } = useQuery<UnitOption[]>({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('units').select('id, name').order('name')
      if (error) throw error
      return data as UnitOption[]
    },
  })

  const { data: costCategories } = useQuery<CostCategoryOption[]>({
    queryKey: ['costCategories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('cost_categories')
        .select('code, name')
        .order('code')
      if (error) throw error
      return data as CostCategoryOption[]
    },
  })

  const { data: costTypes } = useQuery<CostTypeOption[]>({
    queryKey: ['costTypes'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('code, name, cost_category_code')
      if (error) throw error
      return data as CostTypeOption[]
    },
  })

  const { data: locations } = useQuery<LocationOption[]>({
    queryKey: ['locations'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('location').select('id, name').order('name')
      if (error) throw error
      return data as LocationOption[]
    },
  })

  const { data: tableData, refetch } = useQuery<DbRow[]>({
    queryKey: ['chessboard', appliedFilters],
    enabled: !!appliedFilters?.projectId,
    queryFn: async () => {
      if (!supabase || !appliedFilters) return []
      const query = supabase
        .from('chessboard')
        .select(
          'id, material, quantityPd, quantitySpec, quantityRd, unit_id, cost_category_code, cost_type_code, location_id, units(name), cost_categories(name), detail_cost_categories(name), location(name)',
        )
        .eq('project_id', appliedFilters.projectId)
      if (appliedFilters.categoryCode) query.eq('cost_category_code', appliedFilters.categoryCode)
      if (appliedFilters.typeCode) query.eq('cost_type_code', appliedFilters.typeCode)
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      return (data as unknown as DbRow[]) ?? []
    },
  })

  const viewRows = useMemo<ViewRow[]>(
    () =>
      (tableData ?? []).map((item) => ({
        key: item.id,
        material: item.material ?? '',
        quantityPd: item.quantityPd !== null && item.quantityPd !== undefined ? String(item.quantityPd) : '',
        quantitySpec: item.quantitySpec !== null && item.quantitySpec !== undefined ? String(item.quantitySpec) : '',
        quantityRd: item.quantityRd !== null && item.quantityRd !== undefined ? String(item.quantityRd) : '',
        unit: item.units?.name ?? '',
        costCategory: item.cost_categories?.name ?? '',
        costType: item.detail_cost_categories?.name ?? '',
        location: item.location?.name ?? '',
      })),
    [tableData],
  )

  const handleApply = () => {
    if (!filters.projectId) {
      message.warning('Выберите проект')
      return
    }
    setAppliedFilters({ ...filters } as { projectId: string; categoryCode?: string; typeCode?: string })
    setMode('view')
  }

  const addRow = () => {
    if (!appliedFilters) return
    setRows((prev) => [
      ...prev,
      emptyRow({
        costCategoryCode: appliedFilters.categoryCode ?? '',
        costTypeCode: appliedFilters.typeCode ?? '',
      }),
    ])
  }

  const handleRowChange = (key: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }

  const startAdd = () => {
    if (!appliedFilters) return
    setRows([
      emptyRow({
        costCategoryCode: appliedFilters.categoryCode ?? '',
        costTypeCode: appliedFilters.typeCode ?? '',
      }),
    ])
    setMode('add')
  }

  const handleSave = async () => {
    if (!supabase || !appliedFilters) return
    const payload = rows.map((r) => ({
      project_id: appliedFilters.projectId,
      material: r.material,
      quantityPd: r.quantityPd ? Number(r.quantityPd) : null,
      quantitySpec: r.quantitySpec ? Number(r.quantitySpec) : null,
      quantityRd: r.quantityRd ? Number(r.quantityRd) : null,
      unit_id: r.unitId || null,
      cost_category_code: r.costCategoryCode,
      cost_type_code: r.costTypeCode || null,
      location_id: r.locationId || null,
    }))
    const { error } = await supabase.from('chessboard').insert(payload)
    if (error) {
      message.error(`Не удалось сохранить данные: ${error.message}`)
      return
    }
    message.success('Данные успешно сохранены')
    setMode('view')
    setRows([])
    await refetch()
  }

  const columns: ColumnsType<RowData> = [
    {
      title: 'Материал',
      dataIndex: 'material',
      width: 300,
      render: (_, record) => (
        <Input
          style={{ width: 300 }}
          value={record.material}
          onChange={(e) => handleRowChange(record.key, 'material', e.target.value)}
        />
      ),
    },
    {
      title: 'Кол-во по ПД',
      dataIndex: 'quantityPd',
      render: (_, record) => (
        <Input
          style={{ width: '10ch' }}
          value={record.quantityPd}
          onChange={(e) => handleRowChange(record.key, 'quantityPd', e.target.value)}
        />
      ),
    },
    {
      title: 'Кол-во по спеке РД',
      dataIndex: 'quantitySpec',
      render: (_, record) => (
        <Input
          style={{ width: '10ch' }}
          value={record.quantitySpec}
          onChange={(e) => handleRowChange(record.key, 'quantitySpec', e.target.value)}
        />
      ),
    },
    {
      title: 'Кол-во по пересчету РД',
      dataIndex: 'quantityRd',
      render: (_, record) => (
        <Input
          style={{ width: '10ch' }}
          value={record.quantityRd}
          onChange={(e) => handleRowChange(record.key, 'quantityRd', e.target.value)}
        />
      ),
    },
    {
      title: 'Ед.изм.',
      dataIndex: 'unitId',
      render: (_, record) => (
        <Select
          style={{ width: 160 }}
          value={record.unitId}
          onChange={(value) => handleRowChange(record.key, 'unitId', value)}
          options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
        />
      ),
    },
    {
      title: 'Категория затрат',
      dataIndex: 'costCategoryCode',
      render: (_, record) => (
        <Select
          style={{ width: 200 }}
          value={record.costCategoryCode}
          onChange={(value) => {
            handleRowChange(record.key, 'costCategoryCode', value)
            handleRowChange(record.key, 'costTypeCode', '')
          }}
          options={costCategories?.map((c) => ({ value: c.code, label: `${c.code} ${c.name}` })) ?? []}
        />
      ),
    },
    {
      title: 'Вид затрат',
      dataIndex: 'costTypeCode',
      render: (_, record) => (
        <Select
          style={{ width: 200 }}
          value={record.costTypeCode}
          onChange={(value) => handleRowChange(record.key, 'costTypeCode', value)}
          options={
            costTypes
              ?.filter((t) => t.cost_category_code === record.costCategoryCode)
              .map((t) => ({ value: t.code, label: t.name })) ?? []
          }
        />
      ),
    },
    {
      title: 'Локализация',
      dataIndex: 'locationId',
      render: (_, record) => (
        <Select
          style={{ width: 200 }}
          value={record.locationId}
          onChange={(value) => handleRowChange(record.key, 'locationId', value)}
          options={locations?.map((l) => ({ value: l.id, label: l.name })) ?? []}
        />
      ),
    },
    {
      title: '',
      dataIndex: 'actions',
      render: (_, __, index) =>
        index === rows.length - 1 ? (
          <Button type="text" icon={<PlusOutlined />} onClick={addRow} />
        ) : null,
    },
  ]

  const viewColumns: ColumnsType<ViewRow> = useMemo(() => {
    const base: Array<{ title: string; dataIndex: keyof ViewRow; width?: number }> = [
      { title: 'Материал', dataIndex: 'material', width: 300 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec' },
      { title: 'Кол-во по пересчету РД', dataIndex: 'quantityRd' },
      { title: 'Ед.изм.', dataIndex: 'unit' },
      { title: 'Категория затрат', dataIndex: 'costCategory' },
      { title: 'Вид затрат', dataIndex: 'costType' },
      { title: 'Локализация', dataIndex: 'location' },
    ]

    return base.map((col) => {
      const values = Array.from(new Set(viewRows.map((row) => row[col.dataIndex]).filter((v) => v)))
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
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Проект"
          style={{ width: 200 }}
          value={filters.projectId}
          onChange={(value) => setFilters((f) => ({ ...f, projectId: value }))}
          options={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
        />
        <Select
          placeholder="Категория затрат"
          style={{ width: 200 }}
          value={filters.categoryCode}
          onChange={(value) => setFilters((f) => ({ ...f, categoryCode: value, typeCode: undefined }))}
          options={costCategories?.map((c) => ({ value: c.code, label: `${c.code} ${c.name}` })) ?? []}
        />
        <Select
          placeholder="Вид затрат"
          style={{ width: 200 }}
          value={filters.typeCode}
          onChange={(value) => setFilters((f) => ({ ...f, typeCode: value }))}
          options={
            costTypes
              ?.filter((t) => t.cost_category_code === filters.categoryCode)
              .map((t) => ({ value: t.code, label: t.name })) ?? []
          }
          disabled={!filters.categoryCode}
        />
        <Button type="primary" onClick={handleApply} disabled={!filters.projectId}>
          Применить
        </Button>
        {appliedFilters && mode === 'view' && <Button onClick={startAdd}>Добавить</Button>}
      </Space>
      {appliedFilters && mode === 'add' && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleSave}>Сохранить</Button>
          </Space>
          <Table<RowData> dataSource={rows} columns={columns} pagination={false} rowKey="key" />
        </>
      )}
      {appliedFilters && mode === 'view' && (
        <Table<ViewRow> dataSource={viewRows} columns={viewColumns} pagination={false} rowKey="key" />
      )}
    </div>
  )
}

