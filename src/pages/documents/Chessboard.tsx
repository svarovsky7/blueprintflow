import { useCallback, useMemo, useState, type Key } from 'react'
import { App, Button, Card, Checkbox, Drawer, Dropdown, Input, List, Modal, Popconfirm, Select, Space, Table, Typography, Upload } from 'antd'
import type { ColumnType, ColumnsType } from 'antd/es/table'
import { ArrowDownOutlined, ArrowUpOutlined, BgColorsOutlined, CopyOutlined, DeleteOutlined, DownOutlined, EditOutlined, InboxOutlined, PlusOutlined, SettingOutlined, UpOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'

type RowColor = '' | 'green' | 'yellow' | 'blue' | 'red'

const colorMap: Record<RowColor, string> = {
  green: '#d9f7be',
  yellow: '#fff1b8',
  blue: '#e6f7ff',
  red: '#ffa39e',
  '': '',
}

const RowColorPicker = ({
  value,
  onChange,
}: {
  value: RowColor
  onChange: (c: RowColor) => void
}) => (
  <Dropdown
    trigger={['click']}
    menu={{
      items: (['', 'green', 'yellow', 'blue', 'red'] as RowColor[]).map((c) => ({
        key: c,
        label: (
          <div
            style={{
              width: 16,
              height: 16,
              background: colorMap[c],
              border: c ? undefined : '1px solid #d9d9d9',
            }}
          />
        ),
      })),
      onClick: ({ key }) => onChange(key as RowColor),
    }}
  >
    <Button
      type="text"
      icon={<BgColorsOutlined />}
      style={{ background: value ? colorMap[value] : undefined }}
    />
  </Dropdown>
)

interface RowData {
  key: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unitId: string
  blockId: string
  block: string
  costCategoryId: string
  costTypeId: string
  locationId: string
  color: RowColor
}

interface ViewRow {
  key: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  unit: string
  blockId: string
  block: string
  costCategory: string
  costType: string
  location: string
  color: RowColor
}

interface TableRow extends RowData {
  isExisting?: boolean
}

interface ProjectOption { id: string; name: string }
interface BlockOption { id: string; name: string }
interface UnitOption { id: string; name: string }
interface CostCategoryOption { id: number; number: number | null; name: string }
interface CostTypeOption {
  id: number
  name: string
  cost_category_id: number
  location_id: number
}
interface LocationOption { id: number; name: string }

interface DbRow {
  id: string
  material: string | null
  quantityPd: number | null
  quantitySpec: number | null
  quantityRd: number | null
  unit_id: string | null
  color: string | null
  units?: { name: string | null } | null
  chessboard_mapping?: {
    block_id: string | null
    blocks?: { name: string | null } | null
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
  blockId: defaults.blockId ?? '',
  block: defaults.block ?? '',
  costCategoryId: defaults.costCategoryId ?? '',
  costTypeId: defaults.costTypeId ?? '',
  locationId: defaults.locationId ?? '',
  color: '',
})

type HiddenColKey = 'block' | 'costCategory' | 'costType' | 'location'

const collapseMap: Record<string, HiddenColKey> = {
  block: 'block',
  costCategory: 'costCategory',
  costCategoryId: 'costCategory',
  costType: 'costType',
  costTypeId: 'costType',
  location: 'location',
  locationId: 'location',
}

export default function Chessboard() {
  const { message } = App.useApp()
  const [filters, setFilters] = useState<{ projectId?: string; blockId?: string; categoryId?: string; typeId?: string }>({})
  const [appliedFilters, setAppliedFilters] = useState<
    { projectId: string; blockId?: string; categoryId?: string; typeId?: string } | null
  >(null)
  const [mode, setMode] = useState<'view' | 'add'>('view')
  const [rows, setRows] = useState<RowData[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, RowData>>({})
  const [hiddenCols] = useState({
    block: false,
    costCategory: false,
    costType: false,
    location: false,
  })
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [columnsSettingsOpen, setColumnsSettingsOpen] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importState, setImportState] = useState<{
    projectId?: string
    blockId?: string
    categoryId?: string
    typeId?: string
    locationId?: string
  }>({})


  const { data: projects } = useQuery<ProjectOption[]>({
    queryKey: ['projects'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('projects').select('id, name').order('name')
      if (error) throw error
      return data as ProjectOption[]
    },
  })

  const { data: blocks } = useQuery<BlockOption[]>({
    queryKey: ['blocks', filters.projectId],
    enabled: !!filters.projectId,
    queryFn: async () => {
      if (!supabase || !filters.projectId) return []
      const { data, error } = await supabase
        .from('projects_blocks')
        .select('blocks(id, name)')
        .eq('project_id', filters.projectId)
      if (error) throw error
      const rows = (data as { blocks: BlockOption | BlockOption[] | null }[] | null) ?? []
      return rows
        .map((r) => r.blocks)
        .flat()
        .filter((b): b is BlockOption => !!b)
    },
  })

  const { data: importBlocks } = useQuery<BlockOption[]>({
    queryKey: ['importBlocks', importState.projectId],
    enabled: !!importState.projectId,
    queryFn: async () => {
      if (!supabase || !importState.projectId) return []
      const { data, error } = await supabase
        .from('projects_blocks')
        .select('blocks(id, name)')
        .eq('project_id', importState.projectId)
      if (error) throw error
      const rows = (data as { blocks: BlockOption | BlockOption[] | null }[] | null) ?? []
      return rows
        .map((r) => r.blocks)
        .flat()
        .filter((b): b is BlockOption => !!b)
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
        .select('id, name, cost_category_id, location_id')
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
        appliedFilters.blockId || appliedFilters.categoryId || appliedFilters.typeId
          ? 'chessboard_mapping!inner'
          : 'chessboard_mapping'
      const query = supabase
        .from('chessboard')
        .select(
          `id, material, quantityPd, quantitySpec, quantityRd, unit_id, color, units(name), ${relation}(block_id, blocks(name), cost_category_id, cost_type_id, location_id, cost_categories(name), detail_cost_categories(name), location(name))`,
        )
        .eq('project_id', appliedFilters.projectId)
      if (appliedFilters.blockId)
        query.eq('chessboard_mapping.block_id', appliedFilters.blockId)
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
        blockId: item.chessboard_mapping?.block_id ?? '',
        block: item.chessboard_mapping?.blocks?.name ?? '',
        costCategory: item.chessboard_mapping?.cost_categories?.name ?? '',
        costType: item.chessboard_mapping?.detail_cost_categories?.name ?? '',
        location: item.chessboard_mapping?.location?.name ?? '',
        color: (item.color as RowColor | null) ?? '',
      })),
    [tableData],
  )

  const tableRows = useMemo<TableRow[]>(
    () => [
      ...rows.map((r) => ({ ...r })),
      ...viewRows.map((v) => ({
        key: v.key,
        material: v.material,
        quantityPd: v.quantityPd,
        quantitySpec: v.quantitySpec,
        quantityRd: v.quantityRd,
        unitId: v.unit,
        blockId: v.blockId,
        block: v.block,
        costCategoryId: v.costCategory,
        costTypeId: v.costType,
        locationId: v.location,
        color: v.color,
        isExisting: true,
      })),
    ],
    [rows, viewRows],
  )

  const handleApply = () => {
    if (!filters.projectId) {
      message.warning('Выберите проект')
      return
    }
    setAppliedFilters({ ...filters } as {
      projectId: string
      blockId?: string
      categoryId?: string
      typeId?: string
    })
    setMode('view')
  }

  const addRow = useCallback(
    (index: number) => {
      if (!appliedFilters) return
      const defaultLocationId = appliedFilters.typeId
        ? String(
            costTypes?.find((t) => String(t.id) === appliedFilters.typeId)?.location_id ?? '',
          )
        : ''
      const blockName = appliedFilters.blockId
        ? blocks?.find((b) => b.id === appliedFilters.blockId)?.name ?? ''
        : ''
      setRows((prev) => {
        const newRow = emptyRow({
          blockId: appliedFilters.blockId ?? '',
          costCategoryId: appliedFilters.categoryId ?? '',
          costTypeId: appliedFilters.typeId ?? '',
          locationId: defaultLocationId,
          block: blockName,
        })
        const next = [...prev]
        next.splice(index + 1, 0, newRow)
        return next
      })
    },
    [appliedFilters, costTypes, blocks],
  )

  const copyRow = useCallback((index: number) => {
    setRows((prev) => {
      const source = prev[index]
      if (!source) return prev
      const newRow: RowData = { ...source, key: Math.random().toString(36).slice(2) }
      const next = [...prev]
      next.splice(index + 1, 0, newRow)
      return next
    })
  }, [])
  
  const deleteRow = useCallback((key: string) => {
    setRows((prev) => prev.filter((r) => r.key !== key))
  }, [])
  
  const handleDeleteSelected = useCallback(async () => {
    if (!supabase || selectedRows.size === 0) return
    
    const idsToDelete = Array.from(selectedRows)
    
    try {
      // Параллельное удаление связей и записей
      const deletePromises = idsToDelete.map(async (id) => {
        await supabase!.from('chessboard_mapping').delete().eq('chessboard_id', id)
        await supabase!.from('chessboard').delete().eq('id', id)
      })
      
      await Promise.all(deletePromises)
      message.success(`Удалено строк: ${idsToDelete.length}`)
      setSelectedRows(new Set())
      setDeleteMode(false)
      await refetch()
    } catch (error: any) {
      message.error(`Не удалось удалить строки: ${error.message}`)
    }
  }, [selectedRows, message, refetch])
  
  const toggleRowSelection = useCallback((key: string) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(key)) {
        newSet.delete(key)
      } else {
        newSet.add(key)
      }
      return newSet
    })
  }, [])

  const handleRowChange = useCallback((key: string, field: keyof RowData, value: string) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)))
  }, [])

  const handleEditChange = useCallback(
    (key: string, field: keyof RowData, value: string) => {
      setEditingRows((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }))
    },
    [],
  )

  const startAdd = useCallback(() => {
    if (!appliedFilters) return
    const defaultLocationId = appliedFilters.typeId
      ? String(
          costTypes?.find((t) => String(t.id) === appliedFilters.typeId)?.location_id ?? '',
        )
      : ''
    const blockName = appliedFilters.blockId
      ? blocks?.find((b) => b.id === appliedFilters.blockId)?.name ?? ''
      : ''
    setRows([
      emptyRow({
        blockId: appliedFilters.blockId ?? '',
        costCategoryId: appliedFilters.categoryId ?? '',
        costTypeId: appliedFilters.typeId ?? '',
        locationId: defaultLocationId,
        block: blockName,
      }),
    ])
    setMode('add')
  }, [appliedFilters, costTypes, blocks])

  const startEdit = useCallback(
    (id: string) => {
      const dbRow = tableData?.find((r) => r.id === id)
      if (!dbRow) return
      setEditingRows((prev) => {
        if (prev[id]) return prev
        return {
          ...prev,
          [id]: {
            key: id,
            material: dbRow.material ?? '',
            quantityPd:
              dbRow.quantityPd !== null && dbRow.quantityPd !== undefined
                ? String(dbRow.quantityPd)
                : '',
            quantitySpec:
              dbRow.quantitySpec !== null && dbRow.quantitySpec !== undefined
                ? String(dbRow.quantitySpec)
                : '',
            quantityRd:
              dbRow.quantityRd !== null && dbRow.quantityRd !== undefined
                ? String(dbRow.quantityRd)
                : '',
            unitId: dbRow.unit_id ?? '',
            blockId: dbRow.chessboard_mapping?.block_id ?? '',
            block: dbRow.chessboard_mapping?.blocks?.name ?? '',
            costCategoryId: dbRow.chessboard_mapping?.cost_category_id
              ? String(dbRow.chessboard_mapping.cost_category_id)
              : '',
            costTypeId: dbRow.chessboard_mapping?.cost_type_id
              ? String(dbRow.chessboard_mapping.cost_type_id)
              : '',
            locationId: dbRow.chessboard_mapping?.location_id
              ? String(dbRow.chessboard_mapping.location_id)
              : '',
            color: (dbRow.color as RowColor | null) ?? '',
          },
        }
      })
    },
    [tableData],
  )

  const handleUpdate = useCallback(async () => {
    if (!supabase || Object.keys(editingRows).length === 0) return
    
    // Параллельное выполнение всех обновлений
    const updatePromises = Object.values(editingRows).map(async (r) => {
      const updateChessboard = supabase!
        .from('chessboard')
        .update({
          material: r.material,
          quantityPd: r.quantityPd ? Number(r.quantityPd) : null,
          quantitySpec: r.quantitySpec ? Number(r.quantitySpec) : null,
          quantityRd: r.quantityRd ? Number(r.quantityRd) : null,
          unit_id: r.unitId || null,
          color: r.color || null,
        })
        .eq('id', r.key)
      
      const updateMapping = supabase!.from('chessboard_mapping').upsert(
        {
          chessboard_id: r.key,
          block_id: r.blockId || null,
          cost_category_id: Number(r.costCategoryId),
          cost_type_id: r.costTypeId ? Number(r.costTypeId) : null,
          location_id: r.locationId ? Number(r.locationId) : null,
        },
        { onConflict: 'chessboard_id' },
      )
      
      return Promise.all([updateChessboard, updateMapping])
    })
    
    try {
      await Promise.all(updatePromises)
      message.success('Изменения сохранены')
      setEditingRows({})
      await refetch()
    } catch (error: any) {
      message.error(`Не удалось сохранить изменения: ${error.message}`)
    }
  }, [editingRows, message, refetch])

  const handleCancelEdit = useCallback(() => {
    setEditingRows({})
  }, [])

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

  const openImport = useCallback(() => {
    const loc = appliedFilters?.typeId
      ? costTypes?.find((t) => String(t.id) === appliedFilters.typeId)?.location_id
      : undefined
    setImportState({
      projectId: appliedFilters?.projectId,
      blockId: appliedFilters?.blockId,
      categoryId: appliedFilters?.categoryId,
      typeId: appliedFilters?.typeId,
      locationId: loc ? String(loc) : undefined,
    })
    setImportOpen(true)
  }, [appliedFilters, costTypes])

  const handleImport = useCallback(async () => {
    if (!supabase || !importFile || !importState.projectId || !importState.blockId) {
      message.error('Выберите проект, корпус и файл')
      return
    }
    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })
      const payload: {
        project_id: string
        material: string
        quantitySpec: number | null
        unit_id: string | null
      }[] = []
      const header = rows[0]?.map((h) => String(h || '').toLowerCase()) ?? []
      const materialIdx = header.findIndex((h) => h.includes('материал'))
      const quantityIdx = header.findIndex((h) => h.includes('кол'))
      const unitIdx = header.findIndex((h) => h.includes('ед'))
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const materialCol = materialIdx >= 0 ? materialIdx : 0
        const material = row[materialCol] != null ? String(row[materialCol]).trim() : ''
        if (!material) continue

        const quantityCell = quantityIdx >= 0 ? row[quantityIdx] : undefined
        const unitName = unitIdx >= 0 ? String(row[unitIdx] ?? '').trim() : ''

        const quantityValue =
          quantityCell != null && String(quantityCell).trim() !== ''
            ? Number(String(quantityCell).replace(',', '.'))
            : null
        const quantity = Number.isNaN(quantityValue) ? null : quantityValue
        const unitId = unitName
          ? units?.find((u) => u.name.toLowerCase() === unitName.toLowerCase())?.id || null
          : null

        payload.push({
          project_id: importState.projectId,
          material,
          quantitySpec: quantity,
          unit_id: unitId,
        })
      }
      if (payload.length === 0) {
        message.error('Нет данных для импорта')
        return
      }
      const { data: inserted, error } = await supabase
        .from('chessboard')
        .insert(payload)
        .select('id')
      if (error || !inserted) throw error
      const mappings = inserted.map((d) => ({
        chessboard_id: d.id,
        block_id: importState.blockId,
        cost_category_id: importState.categoryId ? Number(importState.categoryId) : null,
        cost_type_id: importState.typeId ? Number(importState.typeId) : null,
        location_id: importState.locationId ? Number(importState.locationId) : null,
      }))
      const { error: mapError } = await supabase!
        .from('chessboard_mapping')
        .insert(mappings)
      if (mapError) throw mapError
      message.success('Импорт завершен')
      setImportOpen(false)
      setImportFile(null)
      setImportState({})
      await refetch()
    } catch (e) {
      message.error(`Не удалось импортировать: ${(e as Error).message}`)
    }
  }, [importFile, importState, message, refetch, units])

  const handleSave = async () => {
    if (!supabase || !appliedFilters) return
    const payload = rows.map((r) => ({
      project_id: appliedFilters.projectId,
      material: r.material,
      quantityPd: r.quantityPd ? Number(r.quantityPd) : null,
      quantitySpec: r.quantitySpec ? Number(r.quantitySpec) : null,
      quantityRd: r.quantityRd ? Number(r.quantityRd) : null,
      unit_id: r.unitId || null,
      color: r.color || null,
    }))
    const { data, error } = await supabase.from('chessboard').insert(payload).select('id')
    if (error || !data) {
      message.error(`Не удалось сохранить данные: ${error?.message}`)
      return
    }
    const mappings = data.map((d, idx) => ({
      chessboard_id: d.id,
      block_id: rows[idx].blockId || null,
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

  const handleCancel = useCallback(() => {
    setRows([])
    setMode('view')
  }, [])


  const addColumns: ColumnsType<TableRow> = useMemo(() => {
    const map: Record<string, keyof ViewRow> = {
      material: 'material',
      quantityPd: 'quantityPd',
      quantitySpec: 'quantitySpec',
      quantityRd: 'quantityRd',
      unitId: 'unit',
      block: 'block',
      costCategoryId: 'costCategory',
      costTypeId: 'costType',
      locationId: 'location',
    }

    const base: Array<{ title: string; dataIndex: keyof TableRow; width?: number }> = [
      { title: 'Материал', dataIndex: 'material', width: 300 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec' },
      { title: 'Кол-во по пересчету РД', dataIndex: 'quantityRd' },
      { title: 'Ед.изм.', dataIndex: 'unitId' },
      { title: 'Корпус', dataIndex: 'block' },
      { title: 'Категория затрат', dataIndex: 'costCategoryId' },
      { title: 'Вид затрат', dataIndex: 'costTypeId' },
      { title: 'Локализация', dataIndex: 'locationId' },
    ]

    const dataColumns = base
      .filter((col) => {
        const key = collapseMap[col.dataIndex as string]
        return key ? !hiddenCols[key] : true
      })
      .map((col) => {
      const values = Array.from(
        new Set(viewRows.map((row) => row[map[col.dataIndex] as keyof ViewRow]).filter((v) => v)),
      )
      const filters =
        col.dataIndex === 'costCategoryId' || col.dataIndex === 'costTypeId' || col.dataIndex === 'block'
          ? [{ text: 'НЕТ', value: '' }, ...values.map((v) => ({ text: String(v), value: String(v) }))]
          : values.map((v) => ({ text: String(v), value: String(v) }))

      const sorter = (a: TableRow, b: TableRow) => {
        const aVal = a[col.dataIndex]
        const bVal = b[col.dataIndex]
        const aNum = Number(aVal)
        const bNum = Number(bVal)
        if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum
        return String(aVal ?? '').localeCompare(String(bVal ?? ''))
      }

      const onFilter = (value: boolean | Key, record: TableRow) =>
        String(record[col.dataIndex] ?? '') === String(value)

      const render: ColumnType<TableRow>['render'] = (_, record) => {
        if (record.isExisting) return record[col.dataIndex] as string
        switch (col.dataIndex) {
          case 'material':
            return (
              <Input
                style={{ width: 300 }}
                value={record.material}
                onChange={(e) => handleRowChange(record.key, 'material', e.target.value)}
              />
            )
          case 'quantityPd':
            return (
              <Input
                style={{ width: '10ch' }}
                value={record.quantityPd}
                onChange={(e) => handleRowChange(record.key, 'quantityPd', e.target.value)}
              />
            )
          case 'quantitySpec':
            return (
              <Input
                style={{ width: '10ch' }}
                value={record.quantitySpec}
                onChange={(e) => handleRowChange(record.key, 'quantitySpec', e.target.value)}
              />
            )
          case 'quantityRd':
            return (
              <Input
                style={{ width: '10ch' }}
                value={record.quantityRd}
                onChange={(e) => handleRowChange(record.key, 'quantityRd', e.target.value)}
              />
            )
          case 'unitId':
            return (
              <Select
                style={{ width: 160 }}
                value={record.unitId}
                onChange={(value) => handleRowChange(record.key, 'unitId', value)}
                options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
              />
            )
          case 'block':
            return (
              <Select
                style={{ width: 200 }}
                value={record.blockId}
                onChange={(value) => {
                  handleRowChange(record.key, 'blockId', value)
                  const name = blocks?.find((b) => b.id === value)?.name ?? ''
                  handleRowChange(record.key, 'block', name)
                }}
                options={[
                  { value: '', label: 'НЕТ' },
                  ...(blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []),
                ]}
              />
            )
          case 'costCategoryId':
            return (
              <Select
                style={{ width: 200 }}
                value={record.costCategoryId}
                onChange={(value) => {
                  handleRowChange(record.key, 'costCategoryId', value)
                  handleRowChange(record.key, 'costTypeId', '')
                  handleRowChange(record.key, 'locationId', '')
                }}
                options={
                  costCategories
                    ?.filter(
                      (c) => !appliedFilters?.categoryId || String(c.id) === appliedFilters.categoryId,
                    )
                    .map((c) => ({
                      value: String(c.id),
                      label: c.number ? `${c.number} ${c.name}` : c.name,
                    })) ?? []
                }
              />
            )
          case 'costTypeId':
            return (
              <Select
                style={{ width: 200 }}
                value={record.costTypeId}
                onChange={(value) => {
                  handleRowChange(record.key, 'costTypeId', value)
                  const loc = costTypes?.find((t) => t.id === Number(value))?.location_id
                  handleRowChange(record.key, 'locationId', loc ? String(loc) : '')
                }}
                options={
                  costTypes
                    ?.filter((t) => {
                      const categoryId = record.costCategoryId || appliedFilters?.categoryId
                      if (categoryId && t.cost_category_id !== Number(categoryId)) return false
                      if (appliedFilters?.typeId) return String(t.id) === appliedFilters.typeId
                      return true
                    })
                    .map((t) => ({ value: String(t.id), label: t.name })) ?? []
                }
              />
            )
          case 'locationId':
            return (
              <Select
                style={{ width: 200 }}
                value={record.locationId}
                onChange={(value) => handleRowChange(record.key, 'locationId', value)}
                options={
                  locations
                    ?.filter((l) => {
                      const locId =
                        record.locationId ||
                        (appliedFilters?.typeId
                          ? costTypes?.find((t) => String(t.id) === appliedFilters.typeId)?.location_id
                          : undefined)
                      return !locId || String(l.id) === String(locId)
                    })
                    .map((l) => ({ value: String(l.id), label: l.name })) ?? []
                }
              />
            )
          default:
            return null
        }
      }

      return { ...col, filters, sorter, onFilter, render }
    })

    return [
      {
        title: '',
        dataIndex: 'color',
        render: (_, record) =>
          record.isExisting ? null : (
            <RowColorPicker value={record.color} onChange={(c) => handleRowChange(record.key, 'color', c)} />
          ),
      },
      {
        title: '',
        dataIndex: 'add',
        render: (_, record, index) =>
          index < rows.length ? (
            <Space size="small">
              <Button type="text" icon={<PlusOutlined />} onClick={() => addRow(index)} />
              <Button type="text" icon={<CopyOutlined />} onClick={() => copyRow(index)} />
              {!record.isExisting && (
                <Button 
                  type="text" 
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => deleteRow(record.key)} 
                />
              )}
            </Space>
          ) : null,
      },
      ...dataColumns,
      {
        title: '',
        dataIndex: 'actions',
        render: (_, record) =>
          record.isExisting ? (
            <Space>
              <Button type="text" icon={<EditOutlined />} onClick={() => startEdit(record.key)} />
              <Popconfirm title="Удалить строку?" onConfirm={() => handleDelete(record.key)}>
                <Button type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ) : null,
      },
    ]
  }, [
    viewRows,
    handleRowChange,
    units,
    costCategories,
    costTypes,
    locations,
    blocks,
    appliedFilters,
    startEdit,
    handleDelete,
    addRow,
    copyRow,
    rows,
    hiddenCols,
  ])

  const viewColumns: ColumnsType<ViewRow> = useMemo(() => {
    // Чекбокс колонка для режима удаления
    const checkboxColumn: ColumnType<ViewRow> | null = deleteMode ? {
      title: '',
      dataIndex: 'checkbox',
      width: 50,
      fixed: 'left',
      render: (_: any, record: ViewRow) => (
        <Checkbox
          checked={selectedRows.has(record.key)}
          onChange={() => toggleRowSelection(record.key)}
        />
      ),
    } : null
    
    const base: Array<{ title: string; dataIndex: string; width?: number }> = [
      { title: 'Материал', dataIndex: 'material', width: 300 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec' },
      { title: 'Кол-во по пересчету РД', dataIndex: 'quantityRd' },
      { title: 'Ед.изм.', dataIndex: 'unit' },
      { title: 'Корпус', dataIndex: 'block' },
      { title: 'Категория затрат', dataIndex: 'costCategory' },
      { title: 'Вид затрат', dataIndex: 'costType' },
      { title: 'Локализация', dataIndex: 'location' },
    ]

    const dataColumns = base
      .filter((col) => {
        const key = collapseMap[col.dataIndex as string]
        return key ? !hiddenCols[key] : true
      })
      .map((col) => {
      const values = Array.from(
        new Set(viewRows.map((row) => row[col.dataIndex as keyof ViewRow]).filter((v) => v)),
      )
      const filters =
        col.dataIndex === 'costCategory' || col.dataIndex === 'costType' || col.dataIndex === 'block'
          ? [{ text: 'НЕТ', value: '' }, ...values.map((v) => ({ text: String(v), value: String(v) }))]
          : values.map((v) => ({ text: String(v), value: String(v) }))

      const render: ColumnType<ViewRow>['render'] = (_, record) => {
        const edit = editingRows[record.key]
        if (!edit) return record[col.dataIndex as keyof ViewRow]
        switch (col.dataIndex) {
          case 'material':
            return (
              <Input
                style={{ width: 300 }}
                value={edit.material}
                onChange={(e) => handleEditChange(record.key, 'material', e.target.value)}
              />
            )
          case 'quantityPd':
            return (
              <Input
                style={{ width: '10ch' }}
                value={edit.quantityPd}
                onChange={(e) => handleEditChange(record.key, 'quantityPd', e.target.value)}
              />
            )
          case 'quantitySpec':
            return (
              <Input
                style={{ width: '10ch' }}
                value={edit.quantitySpec}
                onChange={(e) => handleEditChange(record.key, 'quantitySpec', e.target.value)}
              />
            )
          case 'quantityRd':
            return (
              <Input
                style={{ width: '10ch' }}
                value={edit.quantityRd}
                onChange={(e) => handleEditChange(record.key, 'quantityRd', e.target.value)}
              />
            )
          case 'unit':
            return (
              <Select
                style={{ width: 160 }}
                value={edit.unitId}
                onChange={(value) => handleEditChange(record.key, 'unitId', value)}
                options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
              />
            )
          case 'block':
            return (
              <Select
                style={{ width: 200 }}
                value={edit.blockId}
                onChange={(value) => {
                  handleEditChange(record.key, 'blockId', value)
                  const name = blocks?.find((b) => b.id === value)?.name ?? ''
                  handleEditChange(record.key, 'block', name)
                }}
                options={[
                  { value: '', label: 'НЕТ' },
                  ...(blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []),
                ]}
              />
            )
          case 'costCategory':
            return (
              <Select
                style={{ width: 200 }}
                value={edit.costCategoryId}
                onChange={(value) => {
                  handleEditChange(record.key, 'costCategoryId', value)
                  handleEditChange(record.key, 'costTypeId', '')
                  handleEditChange(record.key, 'locationId', '')
                }}
                options={
                  costCategories?.map((c) => ({
                    value: String(c.id),
                    label: c.number ? `${c.number} ${c.name}` : c.name,
                  })) ?? []
                }
              />
            )
          case 'costType':
            return (
              <Select
                style={{ width: 200 }}
                value={edit.costTypeId}
                onChange={(value) => {
                  handleEditChange(record.key, 'costTypeId', value)
                  const loc = costTypes?.find((t) => t.id === Number(value))?.location_id
                  handleEditChange(record.key, 'locationId', loc ? String(loc) : '')
                }}
                options={
                  costTypes
                    ?.filter((t) => t.cost_category_id === Number(edit.costCategoryId))
                    .map((t) => ({ value: String(t.id), label: t.name })) ?? []
                }
              />
            )
          case 'location':
            return (
              <Select
                style={{ width: 200 }}
                value={edit.locationId}
                onChange={(value) => handleEditChange(record.key, 'locationId', value)}
                options={locations?.map((l) => ({ value: String(l.id), label: l.name })) ?? []}
              />
            )
          default:
            return (record as any)[col.dataIndex]
        }
      }

      return {
        ...col,
        sorter: (a: ViewRow, b: ViewRow) => {
          const aVal = (a as any)[col.dataIndex]
          const bVal = (b as any)[col.dataIndex]
          const aNum = Number(aVal)
          const bNum = Number(bVal)
          if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum
          return String(aVal ?? '').localeCompare(String(bVal ?? ''))
        },
        filters,
        onFilter: (value: boolean | Key, record: ViewRow) => {
          const dataIndex = col.dataIndex as keyof ViewRow
          return String(record[dataIndex] ?? '') === String(value)
        },
        render,
      }
    })

    const finalColumns = [
      {
        title: '',
        dataIndex: 'color',
        render: (_: any, record: ViewRow) => {
          const edit = editingRows[record.key]
          return edit ? (
            <RowColorPicker value={edit.color} onChange={(c) => handleEditChange(record.key, 'color', c)} />
          ) : null
        },
      },
      ...dataColumns,
      {
        title: '',
        dataIndex: 'actions',
        render: (_: any, record: ViewRow) => {
          const isEditing = !!editingRows[record.key]
          return (
            <Space>
              {!isEditing && (
                <Button type="text" icon={<EditOutlined />} onClick={() => startEdit(record.key)} />
              )}
              <Popconfirm title="Удалить строку?" onConfirm={() => handleDelete(record.key)}>
                <Button type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          )
        },
      },
    ]
    
    // Добавляем checkbox колонку в начало если включен режим удаления
    return checkboxColumn ? [checkboxColumn, ...finalColumns] : finalColumns
  }, [
    viewRows,
    editingRows,
    handleEditChange,
    startEdit,
    handleDelete,
    units,
    blocks,
    costCategories,
    costTypes,
    locations,
    hiddenCols,
    deleteMode,
    selectedRows,
    toggleRowSelection,
  ])

  const { Text } = Typography

  // Инициализация порядка и видимости столбцов
  const allColumns = useMemo(() => [
    { key: 'checkbox', title: '' },
    { key: 'block', title: 'Корпус' },
    { key: 'costCategory', title: 'Категория затрат' },
    { key: 'costType', title: 'Вид затрат' },
    { key: 'location', title: 'Локализация' },
    { key: 'material', title: 'Материал' },
    { key: 'quantityPd', title: 'Кол. ПД' },
    { key: 'quantitySpec', title: 'Кол. Спец.' },
    { key: 'quantityRd', title: 'Кол. РД' },
    { key: 'unit', title: 'Ед. изм.' },
    { key: 'color', title: 'Цвет' },
    { key: 'actions', title: 'Действия' },
  ], [])

  // Инициализация состояния видимости столбцов при первой загрузке
  useMemo(() => {
    // Попытка загрузить из sessionStorage
    const savedVisibility = sessionStorage.getItem('chessboard-column-visibility')
    const savedOrder = sessionStorage.getItem('chessboard-column-order')
    
    if (savedVisibility && Object.keys(columnVisibility).length === 0) {
      try {
        setColumnVisibility(JSON.parse(savedVisibility))
      } catch {
        const initialVisibility: Record<string, boolean> = {}
        allColumns.forEach(col => {
          initialVisibility[col.key] = true
        })
        setColumnVisibility(initialVisibility)
      }
    } else if (Object.keys(columnVisibility).length === 0) {
      const initialVisibility: Record<string, boolean> = {}
      allColumns.forEach(col => {
        initialVisibility[col.key] = true
      })
      setColumnVisibility(initialVisibility)
    }
    
    if (savedOrder && columnOrder.length === 0) {
      try {
        setColumnOrder(JSON.parse(savedOrder))
      } catch {
        setColumnOrder(allColumns.map(c => c.key))
      }
    } else if (columnOrder.length === 0) {
      setColumnOrder(allColumns.map(c => c.key))
    }
  }, [allColumns, columnVisibility, columnOrder])
  
  // Сохранение в sessionStorage при изменении
  useMemo(() => {
    if (Object.keys(columnVisibility).length > 0) {
      sessionStorage.setItem('chessboard-column-visibility', JSON.stringify(columnVisibility))
    }
  }, [columnVisibility])
  
  useMemo(() => {
    if (columnOrder.length > 0) {
      sessionStorage.setItem('chessboard-column-order', JSON.stringify(columnOrder))
    }
  }, [columnOrder])

  const moveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnOrder(prev => {
      const index = prev.indexOf(key)
      if (index === -1) return prev
      
      const newOrder = [...prev]
      if (direction === 'up' && index > 0) {
        [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      } else if (direction === 'down' && index < prev.length - 1) {
        [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      }
      return newOrder
    })
  }, [])

  const toggleColumnVisibility = useCallback((key: string) => {
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }, [])
  
  const selectAllColumns = useCallback((select: boolean) => {
    const newVisibility: Record<string, boolean> = {}
    allColumns.forEach(col => {
      newVisibility[col.key] = select
    })
    setColumnVisibility(newVisibility)
  }, [allColumns])

  // Применение порядка и видимости к столбцам таблицы
  const orderedViewColumns = useMemo(() => {
    const columnsMap: Record<string, any> = {}
    
    viewColumns.forEach(col => {
      if (col && 'dataIndex' in col) {
        columnsMap[col.dataIndex as string] = col
      }
    })

    // Сначала фильтруем столбцы по видимости и порядку
    const orderedCols = columnOrder
      .filter(key => {
        // Checkbox колонка всегда скрыта из порядка, но будет добавлена отдельно
        if (key === 'checkbox') return false
        return columnVisibility[key] !== false
      })
      .map(key => columnsMap[key])
      .filter(Boolean)
    
    // Если включен режим удаления, добавляем checkbox колонку в начало
    if (deleteMode && columnsMap['checkbox']) {
      return [columnsMap['checkbox'], ...orderedCols]
    }
    
    return orderedCols
  }, [viewColumns, columnOrder, columnVisibility, deleteMode])

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Space align="center" size="middle">
            <Text style={{ fontSize: '16px' }}>Объект:</Text>
            <Select
              placeholder="Выберите проект"
              style={{ width: 280 }}
              size="large"
              value={filters.projectId}
              onChange={(value) => setFilters({ projectId: value })}
              options={projects?.map((p) => ({ 
                value: p.id, 
                label: <span style={{ fontWeight: 'bold' }}>{p.name}</span> 
              })) ?? []}
              showSearch
              filterOption={(input, option) => {
                const label = option?.label
                if (!label) return false
                // Handle React elements (like bold text)
                if (typeof label === 'object' && 'props' in label) {
                  const text = (label as any).props?.children || ''
                  if (typeof text === 'string') {
                    return text.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }
                // Handle string labels
                if (typeof label === 'string') {
                  return (label as string).toLowerCase().includes(input.toLowerCase())
                }
                return false
              }}
            />
            <Button 
              type="primary" 
              size="large"
              onClick={handleApply} 
              disabled={!filters.projectId}
            >
              Применить
            </Button>
            <Button
              type="text"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              icon={filtersExpanded ? <UpOutlined /> : <DownOutlined />}
            >
              {
                filtersExpanded ? 'Скрыть фильтры' : 'Показать фильтры'
              }
            </Button>
          </Space>
          {appliedFilters && mode === 'view' &&
            (Object.keys(editingRows).length > 0 ? (
              <Space>
                <Button onClick={handleUpdate}>Сохранить</Button>
                <Button onClick={handleCancelEdit}>Отмена</Button>
              </Space>
            ) : (
              <Space>
                <Button onClick={openImport}>Импорт</Button>
                <Button onClick={startAdd}>Добавить</Button>
              </Space>
            ))}
          {appliedFilters && mode === 'add' && (
            <Space>
              <Button onClick={handleSave}>Сохранить</Button>
              <Button onClick={handleCancel}>Отменить</Button>
            </Space>
          )}
        </div>
        
        {filtersExpanded && (
          <Card size="small" style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <Space wrap>
                <Select
                placeholder="Корпус"
                style={{ width: 200 }}
                value={filters.blockId}
                onChange={(value) => setFilters((f) => ({ ...f, blockId: value }))}
                options={[
                  { value: '', label: 'НЕТ' },
                  ...(blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []),
                ]}
                disabled={!filters.projectId}
                allowClear
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
                allowClear
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
                allowClear
              />
              </Space>
              <Space>
                {appliedFilters && (
                  <>
                    <Button
                      style={{ 
                        borderColor: deleteMode && selectedRows.size > 0 ? '#fa8c16' : '#fa8c16', 
                        color: deleteMode && selectedRows.size > 0 ? '#fff' : deleteMode ? '#fff' : '#fa8c16', 
                        backgroundColor: deleteMode && selectedRows.size > 0 ? '#fa8c16' : deleteMode ? '#fa8c16' : 'transparent' 
                      }}
                      icon={<DeleteOutlined />}
                      onClick={() => {
                        if (deleteMode && selectedRows.size > 0) {
                          handleDeleteSelected()
                        } else {
                          setDeleteMode(!deleteMode)
                          setSelectedRows(new Set())
                        }
                      }}
                    >
                      {deleteMode && selectedRows.size > 0 ? `Удалить (${selectedRows.size})` : deleteMode ? 'Выйти из режима' : 'Удалить'}
                    </Button>
                    {deleteMode && selectedRows.size > 0 && (
                      <Button
                        onClick={() => {
                          setSelectedRows(new Set())
                        }}
                      >
                        Отмена
                      </Button>
                    )}
                  </>
                )}
                <Button
                  type="primary"
                  icon={<SettingOutlined />}
                  onClick={() => setColumnsSettingsOpen(true)}
                  title="Настройка столбцов"
                >
                  Настройка столбцов
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </div>
      {appliedFilters &&
        (mode === 'add' ? (
          <Table<TableRow>
            dataSource={tableRows}
            columns={addColumns}
            pagination={false}
            rowKey="key"
            scroll={{ scrollToFirstRowOnChange: false }}
            rowClassName={(record) => (record.color ? `row-${record.color}` : '')}
          />
        ) : (
          <Table<ViewRow>
            dataSource={viewRows}
            columns={orderedViewColumns}
            pagination={false}
            rowKey="key"
            scroll={{ scrollToFirstRowOnChange: false }}
            rowClassName={(record) => {
              const color = editingRows[record.key]?.color ?? record.color
              return color ? `row-${color}` : ''
            }}
          />
        ))}
      <Modal
        title="Импорт из Excel"
        open={importOpen}
        onCancel={() => {
          setImportOpen(false)
          setImportFile(null)
          setImportState({})
        }}
        onOk={handleImport}
        okText="Импорт"
        cancelText="Отмена"
        okButtonProps={{ disabled: !importFile || !importState.projectId || !importState.blockId }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Upload.Dragger
            beforeUpload={(file) => {
              setImportFile(file)
              return false
            }}
            onRemove={() => {
              setImportFile(null)
              return true
            }}
            maxCount={1}
            accept=".xlsx,.xls"
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Перетащите файл или нажмите для выбора
            </p>
          </Upload.Dragger>
          <Select
            placeholder="Проект"
            style={{ width: '100%' }}
            value={importState.projectId}
            onChange={(value) =>
              setImportState({ projectId: value })
            }
            options={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
          />
          <Select
            placeholder="Корпус"
            style={{ width: '100%' }}
            value={importState.blockId}
            onChange={(value) =>
              setImportState((s) => ({ ...s, blockId: value }))
            }
            options={importBlocks?.map((b) => ({ value: b.id, label: b.name })) ?? []}
            disabled={!importState.projectId}
          />
          <Select
            placeholder="Категория затрат"
            style={{ width: '100%' }}
            value={importState.categoryId}
            onChange={(value) =>
              setImportState((s) => ({
                ...s,
                categoryId: value || undefined,
                typeId: undefined,
                locationId: undefined,
              }))
            }
            options={[
              { value: '', label: 'НЕТ' },
              ...(costCategories?.map((c) => ({
                value: String(c.id),
                label: c.number ? `${c.number} ${c.name}` : c.name,
              })) ?? []),
            ]}
          />
          <Select
            placeholder="Вид затрат"
            style={{ width: '100%' }}
            value={importState.typeId}
            onChange={(value) => {
              const loc = costTypes?.find((t) => String(t.id) === value)?.location_id
              setImportState((s) => ({
                ...s,
                typeId: value || undefined,
                locationId: loc ? String(loc) : undefined,
              }))
            }}
            options={[
              { value: '', label: 'НЕТ' },
              ...(costTypes
                ?.filter((t) => String(t.cost_category_id) === importState.categoryId)
                .map((t) => ({ value: String(t.id), label: t.name })) ?? []),
            ]}
            disabled={!importState.categoryId}
          />
          <Select
            placeholder="Локализация"
            style={{ width: '100%' }}
            value={importState.locationId ?? ''}
            onChange={(value) =>
              setImportState((s) => ({ ...s, locationId: value || undefined }))
            }
            options={[
              { value: '', label: 'НЕТ' },
              ...(locations?.map((l) => ({ value: String(l.id), label: l.name })) ?? []),
            ]}
          />
        </Space>
      </Modal>
      
      <Drawer
        title="Настройка столбцов"
        placement="right"
        onClose={() => setColumnsSettingsOpen(false)}
        open={columnsSettingsOpen}
        width={350}
      >
        <div style={{ marginBottom: 16 }}>
          <Checkbox
            checked={allColumns.every(col => columnVisibility[col.key] !== false)}
            indeterminate={allColumns.some(col => columnVisibility[col.key]) && !allColumns.every(col => columnVisibility[col.key] !== false)}
            onChange={(e) => selectAllColumns(e.target.checked)}
          >
            Выделить все
          </Checkbox>
        </div>
        <List
          dataSource={columnOrder.map(key => {
            const col = allColumns.find(c => c.key === key)
            return col ? { ...col, visible: columnVisibility[key] !== false } : null
          }).filter(Boolean)}
          renderItem={(item, index) => item && (
            <List.Item
              actions={[
                <Button
                  type="text"
                  icon={<ArrowUpOutlined />}
                  onClick={() => moveColumn(item.key, 'up')}
                  disabled={index === 0}
                  size="small"
                />,
                <Button
                  type="text"
                  icon={<ArrowDownOutlined />}
                  onClick={() => moveColumn(item.key, 'down')}
                  disabled={index === columnOrder.length - 1}
                  size="small"
                />
              ]}
            >
              <Checkbox
                checked={item.visible}
                onChange={() => toggleColumnVisibility(item.key)}
              >
                {item.title}
              </Checkbox>
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  )
}

