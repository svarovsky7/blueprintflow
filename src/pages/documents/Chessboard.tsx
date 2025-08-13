import { useCallback, useMemo, useState, type Key } from 'react'
import { App, Button, Input, Popconfirm, Select, Space, Table } from 'antd'
import type { ColumnType, ColumnsType } from 'antd/es/table'
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

interface RowData {
  key: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unitId: string
  costCategoryId: string
  costTypeId: string
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
interface CostCategoryOption { id: number; number: number | null; name: string }
interface CostTypeOption { id: number; name: string; cost_category_id: number }
interface LocationOption { id: string; name: string }

interface DbRow {
  id: string
  material: string | null
  quantityPd: number | null
  quantitySpec: number | null
  quantityRd: number | null
  unit_id: string | null
  units?: { name: string | null } | null
  chessboard_mapping?: {
    cost_category_id: number | null
    cost_type_id: number | null
    location_id: number | null
    cost_categories?: { name: string | null } | null
    detail_cost_categories?: { name: string | null } | null
    location?: { name: string | null } | null
  } | null
}

const emptyRow = (defaults: Partial<RowData>): RowData => ({
  key: Math.random().toString(36).slice(2),
  material: '',
  quantityPd: '',
  quantitySpec: '',
  quantityRd: '',
  unitId: '',
  costCategoryId: defaults.costCategoryId ?? '',
  costTypeId: defaults.costTypeId ?? '',
  locationId: '',
})

export default function Chessboard() {
  const { message } = App.useApp()
  const [filters, setFilters] = useState<{ projectId?: string; categoryId?: string; typeId?: string }>({})
  const [appliedFilters, setAppliedFilters] = useState<{ projectId: string; categoryId?: string; typeId?: string } | null>(
    null,
  )
  const [mode, setMode] = useState<'view' | 'add' | 'edit'>('view')
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
        .select('id, number, name')
        .order('id')
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
        .select('id, name, cost_category_id')
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
      const relation =
        appliedFilters.categoryId || appliedFilters.typeId ? 'chessboard_mapping!inner' : 'chessboard_mapping'
      const query = supabase
        .from('chessboard')
        .select(
          `id, material, quantityPd, quantitySpec, quantityRd, unit_id, units(name), ${relation}(cost_category_id, cost_type_id, location_id, cost_categories(name), detail_cost_categories(name), location(name))`,
        )
        .eq('project_id', appliedFilters.projectId)
      if (appliedFilters.categoryId)
        query.eq('chessboard_mapping.cost_category_id', Number(appliedFilters.categoryId))
      if (appliedFilters.typeId)
        query.eq('chessboard_mapping.cost_type_id', Number(appliedFilters.typeId))
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
        costCategory: item.chessboard_mapping?.cost_categories?.name ?? '',
        costType: item.chessboard_mapping?.detail_cost_categories?.name ?? '',
        location: item.chessboard_mapping?.location?.name ?? '',
      })),
    [tableData],
  )

  const handleApply = () => {
    if (!filters.projectId) {
      message.warning('Выберите проект')
      return
    }
    setAppliedFilters({ ...filters } as { projectId: string; categoryId?: string; typeId?: string })
    setMode('view')
  }

  const addRow = useCallback(() => {
    if (!appliedFilters) return
    setRows((prev) => [
      ...prev,
      emptyRow({
        costCategoryId: appliedFilters.categoryId ?? '',
        costTypeId: appliedFilters.typeId ?? '',
      }),
    ])
  }, [appliedFilters])

  const handleRowChange = useCallback((key: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }, [])

  const startAdd = useCallback(() => {
    if (!appliedFilters) return
    setRows([
      emptyRow({
        costCategoryId: appliedFilters.categoryId ?? '',
        costTypeId: appliedFilters.typeId ?? '',
      }),
    ])
    setMode('add')
  }, [appliedFilters])

  const startEdit = useCallback(
    (id: string) => {
      const dbRow = tableData?.find((r) => r.id === id)
      if (!dbRow) return
      setRows([
        {
          key: id,
          material: dbRow.material ?? '',
          quantityPd: dbRow.quantityPd !== null && dbRow.quantityPd !== undefined ? String(dbRow.quantityPd) : '',
          quantitySpec: dbRow.quantitySpec !== null && dbRow.quantitySpec !== undefined ? String(dbRow.quantitySpec) : '',
          quantityRd: dbRow.quantityRd !== null && dbRow.quantityRd !== undefined ? String(dbRow.quantityRd) : '',
          unitId: dbRow.unit_id ?? '',
          costCategoryId: dbRow.chessboard_mapping?.cost_category_id
            ? String(dbRow.chessboard_mapping.cost_category_id)
            : '',
          costTypeId: dbRow.chessboard_mapping?.cost_type_id
            ? String(dbRow.chessboard_mapping.cost_type_id)
            : '',
          locationId: dbRow.chessboard_mapping?.location_id
            ? String(dbRow.chessboard_mapping.location_id)
            : '',
        },
      ])
      setMode('edit')
    },
    [tableData],
  )

  const handleUpdate = useCallback(async () => {
    if (!supabase || rows.length !== 1) return
    const r = rows[0]
    const { error } = await supabase
      .from('chessboard')
      .update({
        material: r.material,
        quantityPd: r.quantityPd ? Number(r.quantityPd) : null,
        quantitySpec: r.quantitySpec ? Number(r.quantitySpec) : null,
        quantityRd: r.quantityRd ? Number(r.quantityRd) : null,
        unit_id: r.unitId || null,
      })
      .eq('id', r.key)
    if (error) {
      message.error(`Не удалось обновить данные: ${error.message}`)
      return
    }
    const { error: mapError } = await supabase.from('chessboard_mapping').upsert(
      {
        chessboard_id: r.key,
        cost_category_id: Number(r.costCategoryId),
        cost_type_id: r.costTypeId ? Number(r.costTypeId) : null,
        location_id: r.locationId ? Number(r.locationId) : null,
      },
      { onConflict: 'chessboard_id' },
    )
    if (mapError) {
      message.error(`Не удалось обновить связи: ${mapError.message}`)
      return
    }
    message.success('Строка обновлена')
    setMode('view')
    setRows([])
    await refetch()
  }, [rows, message, refetch])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!supabase) return
      const { error: mapError } = await supabase.from('chessboard_mapping').delete().eq('chessboard_id', id)
      if (mapError) {
        message.error(`Не удалось удалить связи: ${mapError.message}`)
        return
      }
      const { error } = await supabase.from('chessboard').delete().eq('id', id)
      if (error) {
        message.error(`Не удалось удалить строку: ${error.message}`)
        return
      }
      message.success('Строка удалена')
      await refetch()
    },
    [message, refetch],
  )

  const handleSave = async () => {
    if (!supabase || !appliedFilters) return
    const payload = rows.map((r) => ({
      project_id: appliedFilters.projectId,
      material: r.material,
      quantityPd: r.quantityPd ? Number(r.quantityPd) : null,
      quantitySpec: r.quantitySpec ? Number(r.quantitySpec) : null,
      quantityRd: r.quantityRd ? Number(r.quantityRd) : null,
      unit_id: r.unitId || null,
    }))
    const { data, error } = await supabase.from('chessboard').insert(payload).select('id')
    if (error || !data) {
      message.error(`Не удалось сохранить данные: ${error?.message}`)
      return
    }
    const mappings = data.map((d, idx) => ({
      chessboard_id: d.id,
      cost_category_id: Number(rows[idx].costCategoryId),
      cost_type_id: rows[idx].costTypeId ? Number(rows[idx].costTypeId) : null,
      location_id: rows[idx].locationId ? Number(rows[idx].locationId) : null,
    }))
    const { error: mapError } = await supabase.from('chessboard_mapping').insert(mappings)
    if (mapError) {
      message.error(`Не удалось сохранить связи: ${mapError.message}`)
      return
    }
    message.success('Данные успешно сохранены')
    setMode('view')
    setRows([])
    await refetch()
  }

  const columns: ColumnType<RowData>[] = [
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
      dataIndex: 'costCategoryId',
      render: (_, record) => (
        <Select
          style={{ width: 200 }}
          value={record.costCategoryId}
          onChange={(value) => {
            handleRowChange(record.key, 'costCategoryId', value)
            handleRowChange(record.key, 'costTypeId', '')
          }}
          options={
            costCategories?.map((c) => ({
              value: String(c.id),
              label: c.number ? `${c.number} ${c.name}` : c.name,
            })) ?? []
          }
        />
      ),
    },
    {
      title: 'Вид затрат',
      dataIndex: 'costTypeId',
      render: (_, record) => (
        <Select
          style={{ width: 200 }}
          value={record.costTypeId}
          onChange={(value) => handleRowChange(record.key, 'costTypeId', value)}
          options={
            costTypes
              ?.filter((t) => t.cost_category_id === Number(record.costCategoryId))
              .map((t) => ({ value: String(t.id), label: t.name })) ?? []
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

  const editColumns = columns.filter((c) => c.dataIndex !== 'actions')

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

    const dataColumns = base.map((col) => {
      const values = Array.from(
        new Set(viewRows.map((row) => row[col.dataIndex]).filter((v) => v)),
      )
      const filters =
        col.dataIndex === 'costCategory' || col.dataIndex === 'costType'
          ? [{ text: 'НЕТ', value: '' }, ...values.map((v) => ({ text: String(v), value: String(v) }))]
          : values.map((v) => ({ text: String(v), value: String(v) }))
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
        filters,
        onFilter: (value: boolean | Key, record: ViewRow) =>
          String(record[col.dataIndex] ?? '') === String(value),
      }
    })

    return [
      ...dataColumns,
      {
        title: '',
        dataIndex: 'actions',
        render: (_, record) => (
          <Space>
            <Button type="text" icon={<EditOutlined />} onClick={() => startEdit(record.key)} />
            <Popconfirm title="Удалить строку?" onConfirm={() => handleDelete(record.key)}>
              <Button type="text" icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      },
    ]
  }, [viewRows, startEdit, handleDelete])

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Select
          placeholder="Проект"
          style={{ width: 200 }}
          value={filters.projectId}
          onChange={(value) => setFilters({ projectId: value })}
          options={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
        />
        <Select
          placeholder="Категория затрат"
          style={{ width: 200 }}
          value={filters.categoryId}
          onChange={(value) =>
            setFilters((f) => ({ ...f, categoryId: value, typeId: undefined }))
          }
          options={[
            { value: '', label: 'НЕТ' },
            ...(
              costCategories?.map((c) => ({
                value: String(c.id),
                label: c.number ? `${c.number} ${c.name}` : c.name,
              })) ?? []
            ),
          ]}
        />
        <Select
          placeholder="Вид затрат"
          style={{ width: 200 }}
          value={filters.typeId}
          onChange={(value) => setFilters((f) => ({ ...f, typeId: value }))}
          options={[
            { value: '', label: 'НЕТ' },
            ...(
              costTypes
                ?.filter((t) => String(t.cost_category_id) === filters.categoryId)
                .map((t) => ({ value: String(t.id), label: t.name })) ?? []
            ),
          ]}
          disabled={!filters.categoryId}
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
      {appliedFilters && mode === 'edit' && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleUpdate}>Сохранить</Button>
            <Button onClick={() => setMode('view')}>Отмена</Button>
          </Space>
          <Table<RowData> dataSource={rows} columns={editColumns} pagination={false} rowKey="key" />
        </>
      )}
      {appliedFilters && mode === 'view' && (
        <Table<ViewRow> dataSource={viewRows} columns={viewColumns} pagination={false} rowKey="key" />
      )}
    </div>
  )
}

