import { useMemo, useState } from 'react'
import { App, Button, Input, Select, Space, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { PlusOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
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
  costTypeCode: string
  localization: string
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
  localization: string
}

interface ProjectOption {
  id: string
  name: string
}

interface UnitOption {
  id: string
  name: string
}

interface CategoryOption {
  id: string
  code: string
  name: string
}

interface CostTypeOption {
  id: string
  code: string
  name: string
  parentId: string | null
}

interface DbRow {
  id: string
  material: string | null
  quantityPd: number | null
  quantitySpec: number | null
  quantityRd: number | null
  unit_id: string | null
  cost_category_code: string | null
  cost_type_code: string | null
  localization: string | null
  units?: { name: string | null } | null
}

const emptyRow = (
  projectId: string,
  category?: string,
  type?: string,
): RowData => ({
  key: Math.random().toString(36).slice(2),
  projectId,
  material: '',
  quantityPd: '',
  quantitySpec: '',
  quantityRd: '',
  unitId: '',
  costCategoryCode: category ?? '',
  costTypeCode: type ?? '',
  localization: '',
})

export default function Chessboard() {
  const { message } = App.useApp()
  const [mode, setMode] = useState<'init' | 'add' | 'show'>('init')
  const [rows, setRows] = useState<RowData[]>([])
  const [selectedProject, setSelectedProject] = useState<string>()
  const [selectedCategory, setSelectedCategory] = useState<string>()
  const [selectedType, setSelectedType] = useState<string>()
  const [filters, setFilters] = useState<{
    project: string
    category?: string
    type?: string
  } | null>(null)

  const { data: projects = [] } = useQuery<ProjectOption[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('projects').select('id, name')
      if (error) {
        message.error('Не удалось загрузить проекты')
        throw error
      }
      return data as ProjectOption[]
    },
  })

  const { data: units = [] } = useQuery<UnitOption[]>({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('units').select('id, name')
      if (error) {
        message.error('Не удалось загрузить единицы измерения')
        throw error
      }
      return data as UnitOption[]
    },
  })

  const { data: categories = [] } = useQuery<CategoryOption[]>({
    queryKey: ['cost-categories'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, code, name')
        .eq('level', 1)
        .order('code', { ascending: true })
      if (error) {
        message.error('Не удалось загрузить категории затрат')
        throw error
      }
      return data as CategoryOption[]
    },
  })

  const { data: costTypes = [] } = useQuery<CostTypeOption[]>({
    queryKey: ['cost-types'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('cost_categories')
        .select('id, code, name, parent_id')
        .eq('level', 2)
        .order('code', { ascending: true })
      if (error) {
        message.error('Не удалось загрузить виды затрат')
        throw error
      }
      return (data as (CostTypeOption & { parent_id: string | null })[]).map(
        (t) => ({ ...t, parentId: t.parent_id }),
      )
    },
  })

  const categoriesMap = useMemo(
    () => new Map(categories.map((c) => [c.code, c.id])),
    [categories],
  )

  const filterTypeOptions = useMemo(() => {
    if (!selectedCategory) return []
    const parentId = categoriesMap.get(selectedCategory)
    return costTypes
      .filter((t) => t.parentId === parentId)
      .map((t) => ({ value: t.code, label: `${t.code} ${t.name}` }))
  }, [selectedCategory, categoriesMap, costTypes])

  const { data: viewRows = [], refetch } = useQuery<ViewRow[]>({
    queryKey: ['chessboard', filters],
    enabled: mode === 'show' && !!filters,
    queryFn: async () => {
      if (!supabase || !filters) return []
      const { project, category, type } = filters
      let query = supabase
        .from('chessboard')
        .select(
          'id, material, quantityPd, quantitySpec, quantityRd, unit_id, cost_category_code, cost_type_code, localization, units(name)',
        )
        .eq('project_id', project)
      if (category) query = query.eq('cost_category_code', category)
      if (type) query = query.eq('cost_type_code', type)
      query = query.limit(100)
      const { data, error } = await query
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      const rows = (data as unknown as DbRow[]) ?? []
      return rows.map((item) => ({
        key: String(item.id),
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
        costType: item.cost_type_code ?? '',
        localization: item.localization ?? '',
      }))
    },
  })

  const handleApply = () => {
    if (!selectedProject) {
      message.error('Выберите проект')
      return
    }
    setFilters({ project: selectedProject, category: selectedCategory, type: selectedType })
    setMode('show')
  }

  const addRow = () => {
    if (!filters) return
    setRows([...rows, emptyRow(filters.project, filters.category, filters.type)])
  }

  const handleRowChange = (key: string, field: keyof RowData, value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              [field]: value,
              ...(field === 'costCategoryCode' ? { costTypeCode: '' } : {}),
            }
          : r,
      ),
    )
  }

  const handleAddClick = () => {
    if (!filters) return
    setMode('add')
    setRows([emptyRow(filters.project, filters.category, filters.type)])
  }

  const handleSave = async () => {
    if (!filters) return
    for (const row of rows) {
      if (!row.material || !row.unitId || !row.costCategoryCode) {
        message.error('Заполните обязательные поля')
        return
      }
    }
    const payload = rows.map(
      ({
        key,
        material,
        quantityPd,
        quantitySpec,
        quantityRd,
        unitId,
        costCategoryCode,
        costTypeCode,
        localization,
      }) => {
        void key
        return {
          project_id: filters.project,
          material,
          quantityPd: quantityPd ? Number(quantityPd) : null,
          quantitySpec: quantitySpec ? Number(quantitySpec) : null,
          quantityRd: quantityRd ? Number(quantityRd) : null,
          unit_id: unitId || null,
          cost_category_code: costCategoryCode,
          cost_type_code: costTypeCode || null,
          localization: localization || null,
        }
      },
    )
    if (!supabase) {
      message.error('Клиент базы данных не настроен')
      return
    }
    const { error } = await supabase.from('chessboard').insert(payload)
    if (error) {
      message.error(`Не удалось сохранить данные: ${error.message}`)
      return
    }
    message.success('Данные успешно сохранены')
    setMode('show')
    setRows([])
    void refetch()
  }

  const addColumns: ColumnsType<RowData> = [
    {
      title: 'Материал',
      dataIndex: 'material',
      render: (_: unknown, record) => (
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
      render: (_: unknown, record) => (
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
      render: (_: unknown, record) => (
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
      render: (_: unknown, record) => (
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
      render: (_: unknown, record) => (
        <Select
          style={{ width: 200 }}
          value={record.unitId}
          onChange={(value) => handleRowChange(record.key, 'unitId', value)}
          options={units.map((u) => ({ value: u.id, label: u.name }))}
        />
      ),
    },
    {
      title: 'Категория затрат',
      dataIndex: 'costCategoryCode',
      render: (_: unknown, record) => (
        <Select
          style={{ width: 200 }}
          value={record.costCategoryCode}
          onChange={(value) => handleRowChange(record.key, 'costCategoryCode', value)}
          options={categories.map((c) => ({ value: c.code, label: `${c.code} ${c.name}` }))}
        />
      ),
    },
    {
      title: 'Вид затрат',
      dataIndex: 'costTypeCode',
      render: (_: unknown, record) => {
        const parentId = categoriesMap.get(record.costCategoryCode)
        const options = costTypes
          .filter((t) => t.parentId === parentId)
          .map((t) => ({ value: t.code, label: `${t.code} ${t.name}` }))
        return (
          <Select
            style={{ width: 200 }}
            value={record.costTypeCode}
            onChange={(value) => handleRowChange(record.key, 'costTypeCode', value)}
            options={options}
            allowClear
          />
        )
      },
    },
    {
      title: 'Локализация',
      dataIndex: 'localization',
      render: (_: unknown, record) => (
        <Input
          style={{ width: 200 }}
          value={record.localization}
          onChange={(e) => handleRowChange(record.key, 'localization', e.target.value)}
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
      { title: 'Материал', dataIndex: 'material', width: 400 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec' },
      { title: 'Кол-во по пересчету РД', dataIndex: 'quantityRd' },
      { title: 'Ед.изм.', dataIndex: 'unit' },
      { title: 'Категория затрат', dataIndex: 'costCategory' },
      { title: 'Вид затрат', dataIndex: 'costType' },
      { title: 'Локализация', dataIndex: 'localization' },
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

  const handleCategoryChange = (value: string | undefined) => {
    setSelectedCategory(value)
    setSelectedType(undefined)
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>Проект</span>
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
            onChange={handleCategoryChange}
            options={categories.map((c) => ({ value: c.code, label: `${c.code} ${c.name}` }))}
            allowClear
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span>Вид затрат</span>
          <Select
            style={{ width: 200 }}
            value={selectedType}
            onChange={setSelectedType}
            options={filterTypeOptions}
            disabled={!selectedCategory}
            allowClear
          />
        </div>
        <Button onClick={handleApply}>Применить</Button>
        {filters && mode !== 'add' && <Button onClick={handleAddClick}>Добавить</Button>}
      </Space>
      {mode === 'add' && (
        <>
          <Space style={{ marginBottom: 16 }}>
            <Button onClick={handleSave}>Сохранить</Button>
          </Space>
          <Table<RowData> dataSource={rows} columns={addColumns} pagination={false} rowKey="key" />
        </>
      )}
      {mode === 'show' && filters && (
        <Table<ViewRow> dataSource={viewRows} columns={viewColumns} pagination={false} rowKey="key" />
      )}
    </div>
  )
}

