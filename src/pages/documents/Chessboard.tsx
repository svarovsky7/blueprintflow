import { useCallback, useMemo, useState, type Key } from 'react'
import { App, Badge, Button, Card, Checkbox, Drawer, Dropdown, Input, List, Modal, Popconfirm, Select, Space, Table, Typography, Upload } from 'antd'
import type { ColumnType, ColumnsType } from 'antd/es/table'
import { ArrowDownOutlined, ArrowUpOutlined, BgColorsOutlined, CopyOutlined, DeleteOutlined, EditOutlined, InboxOutlined, PlusOutlined, SaveOutlined, SettingOutlined, FilterOutlined, CaretUpFilled, CaretDownFilled, UploadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { documentationApi } from '@/entities/documentation'
import { documentationTagsApi } from '@/entities/documentation-tags'

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
  floors: string
  color: RowColor
  documentationId?: string
  tagId?: string
  tagName?: string
  projectCode?: string
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
  floors: string
  color: RowColor
  documentationId?: string
  tagName?: string
  projectCode?: string
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
  floors?: string
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
  chessboard_documentation_mapping?: {
    documentation_id: string | null
    documentations?: {
      id: string
      code: string
      tag_id: number | null
      stage: string | null
      tag?: {
        id: number
        name: string
        tag_number: number | null
      } | null
    } | null
  } | null
}

// Функция для форматирования массива этажей в строку с диапазонами
const formatFloorsString = (floors: number[]): string => {
  if (floors.length === 0) return ''
  
  const sorted = [...floors].sort((a, b) => a - b)
  const ranges: string[] = []
  let start = sorted[0]
  let end = sorted[0]
  
  for (let i = 1; i <= sorted.length; i++) {
    if (i < sorted.length && sorted[i] === end + 1) {
      end = sorted[i]
    } else {
      if (start === end) {
        ranges.push(String(start))
      } else if (end - start === 1) {
        ranges.push(`${start},${end}`)
      } else {
        ranges.push(`${start}-${end}`)
      }
      if (i < sorted.length) {
        start = sorted[i]
        end = sorted[i]
      }
    }
  }
  
  return ranges.join(',')
}

// Функция для парсинга строки этажей в массив чисел
const parseFloorsString = (floorsStr: string): number[] => {
  if (!floorsStr || !floorsStr.trim()) return []
  
  const floors = new Set<number>()
  const parts = floorsStr.split(',').map(s => s.trim())
  
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()))
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = Math.min(start, end); i <= Math.max(start, end); i++) {
          floors.add(i)
        }
      }
    } else {
      const num = parseInt(part)
      if (!isNaN(num)) {
        floors.add(num)
      }
    }
  }
  
  return Array.from(floors).sort((a, b) => a - b)
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
  floors: defaults.floors ?? '',
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
  
  
  const [filters, setFilters] = useState<{ projectId?: string; blockId?: string; categoryId?: string; typeId?: string; tagId?: string; documentationId?: string }>({})
  const [appliedFilters, setAppliedFilters] = useState<
    { projectId: string; blockId?: string; categoryId?: string; typeId?: string; tagId?: string; documentationId?: string } | null
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

  // Загрузка тэгов документации
  const { data: documentationTags } = useQuery({
    queryKey: ['documentation-tags'],
    queryFn: documentationTagsApi.getAll,
  })

  // Загрузка документации для выбранного проекта  
  const { data: documentations } = useQuery<any[]>({
    queryKey: ['documentations', appliedFilters?.projectId],
    queryFn: async () => {
      console.log('📚 DOCUMENTATION QUERY - Executing:', { 
        projectId: appliedFilters?.projectId,
        enabled: !!appliedFilters?.projectId 
      })
      if (!appliedFilters?.projectId) {
        console.log('⚠️ DOCUMENTATION QUERY - No project ID, returning empty array')
        return []
      }
      const fetchFilters: any = { project_id: appliedFilters.projectId }
      const result = await documentationApi.getDocumentation(fetchFilters)
      
      console.log('✅ DOCUMENTATION QUERY - Loaded:', {
        projectId: appliedFilters.projectId,
        totalCount: result.length,
        uniqueTagIds: [...new Set(result.map(doc => doc.tag_id))],
        sampleData: result.slice(0, 5).map(doc => ({
          id: doc.id,
          code: doc.project_code,
          tag_id: doc.tag_id,
          tag_name: doc.tag_name,
          tag_number: doc.tag_number
        }))
      })
      return result
    },
    enabled: !!appliedFilters?.projectId,
  })

  // Логируем состояние каждый рендер
  console.log('🎯 CHESSBOARD STATE:', {
    appliedFiltersProjectId: appliedFilters?.projectId,
    queryEnabled: !!appliedFilters?.projectId,
    documentationsLoaded: !!documentations,
    documentationsCount: documentations?.length ?? 'undefined',
    mode,
    editingRowsCount: Object.keys(editingRows).length,
    addRowsCount: rows.length
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
          `id, material, quantityPd, quantitySpec, quantityRd, unit_id, color, units(name), 
          ${relation}(block_id, blocks(name), cost_category_id, cost_type_id, location_id, cost_categories(name), detail_cost_categories(name), location(name)),
          chessboard_documentation_mapping(documentation_id, documentations(id, code, tag_id, stage, tag:documentation_tags(id, name, tag_number)))`,
        )
        .eq('project_id', appliedFilters.projectId)
      if (appliedFilters.blockId)
        query.eq('chessboard_mapping.block_id', appliedFilters.blockId)
      if (appliedFilters.categoryId)
        query.eq('chessboard_mapping.cost_category_id', Number(appliedFilters.categoryId))
      if (appliedFilters.typeId)
        query.eq('chessboard_mapping.cost_type_id', Number(appliedFilters.typeId))
      // Фильтрация по документации
      if (appliedFilters.documentationId) {
        query.eq('chessboard_documentation_mapping.documentation_id', appliedFilters.documentationId)
      } else if (appliedFilters.tagId) {
        query.eq('chessboard_documentation_mapping.documentations.tag_id', Number(appliedFilters.tagId))
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }
      
      // Загружаем этажи для всех записей
      const chessboardIds = (data as any[])?.map(item => item.id) || []
      let floorsMap: Record<string, string> = {}
      
      if (chessboardIds.length > 0) {
        const { data: floorsData } = await supabase
          .from('chessboard_floor_mapping')
          .select('chessboard_id, floor_number')
          .in('chessboard_id', chessboardIds)
          .order('floor_number', { ascending: true })
        
        // Группируем этажи по chessboard_id и преобразуем в строки с диапазонами
        if (floorsData) {
          const grouped: Record<string, number[]> = {}
          floorsData.forEach((item: any) => {
            if (!grouped[item.chessboard_id]) {
              grouped[item.chessboard_id] = []
            }
            grouped[item.chessboard_id].push(item.floor_number)
          })
          
          // Преобразуем массивы этажей в строки с диапазонами
          for (const [id, floors] of Object.entries(grouped)) {
            floorsMap[id] = formatFloorsString(floors)
          }
        }
      }
      
      // Добавляем этажи к результатам
      const result = (data as unknown as DbRow[]) ?? []
      return result.map(item => ({
        ...item,
        floors: floorsMap[item.id] || ''
      }))
    },
  })

  const viewRows = useMemo<ViewRow[]>(
    () =>
      (tableData ?? []).map((item) => {
        const documentation = item.chessboard_documentation_mapping?.documentations
        const tag = documentation?.tag
        return {
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
          floors: item.floors ?? '',
          color: (item.color as RowColor | null) ?? '',
          documentationId: documentation?.id,
          tagName: tag ? `${tag.tag_number || ''} ${tag.name}`.trim() : '',
          projectCode: documentation?.code ?? '',
        }
      }),
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
        floors: v.floors,
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
      tagId?: string
      documentationId?: string
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
            floors: dbRow.floors ?? '',
            color: (dbRow.color as RowColor | null) ?? '',
            documentationId: dbRow.chessboard_documentation_mapping?.documentation_id ?? '',
            tagId: dbRow.chessboard_documentation_mapping?.documentations?.tag_id 
              ? String(dbRow.chessboard_documentation_mapping.documentations.tag_id) 
              : '',
            tagName: dbRow.chessboard_documentation_mapping?.documentations?.tag
              ? `${dbRow.chessboard_documentation_mapping.documentations.tag.tag_number || ''} ${dbRow.chessboard_documentation_mapping.documentations.tag.name}`.trim()
              : '',
            projectCode: dbRow.chessboard_documentation_mapping?.documentations?.code ?? '',
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
      
      // Обновляем этажи
      const updateFloors = async () => {
        // Сначала удаляем старые связи
        await supabase!.from('chessboard_floor_mapping')
          .delete()
          .eq('chessboard_id', r.key)
        
        // Парсим строку этажей и добавляем новые
        const floors = parseFloorsString(r.floors)
        if (floors.length > 0) {
          const floorMappings = floors.map(floor => ({
            chessboard_id: r.key,
            floor_number: floor
          }))
          await supabase!.from('chessboard_floor_mapping')
            .insert(floorMappings)
        }
      }
      
      // Обновляем связь с документацией
      const updateDocumentationMapping = async () => {
        if (r.documentationId) {
          await supabase!.from('chessboard_documentation_mapping').upsert(
            {
              chessboard_id: r.key,
              documentation_id: r.documentationId,
            },
            { onConflict: 'chessboard_id' }
          )
        } else {
          // Если документация не выбрана, удаляем связь
          await supabase!.from('chessboard_documentation_mapping')
            .delete()
            .eq('chessboard_id', r.key)
        }
      }
      
      return Promise.all([updateChessboard, updateMapping, updateFloors(), updateDocumentationMapping()])
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
    
    // Сохраняем этажи
    for (let idx = 0; idx < data.length; idx++) {
      const floors = parseFloorsString(rows[idx].floors)
      if (floors.length > 0) {
        const floorMappings = floors.map(floor => ({
          chessboard_id: data[idx].id,
          floor_number: floor
        }))
        const { error: floorError } = await supabase.from('chessboard_floor_mapping').insert(floorMappings)
        if (floorError) {
          console.error(`Не удалось сохранить этажи: ${floorError.message}`)
        }
      }
    }
    
    // Сохраняем связь с документацией
    for (let idx = 0; idx < data.length; idx++) {
      if (rows[idx].documentationId) {
        const { error: docError } = await supabase.from('chessboard_documentation_mapping').insert({
          chessboard_id: data[idx].id,
          documentation_id: rows[idx].documentationId
        })
        if (docError) {
          console.error(`Не удалось сохранить связь с документацией: ${docError.message}`)
        }
      }
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
      { title: 'Раздел', dataIndex: 'tagName', width: 200 },
      { title: 'Шифр проекта', dataIndex: 'projectCode', width: 150 },
      { title: 'Материал', dataIndex: 'material', width: 300 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd', width: 120 },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec', width: 150 },
      { title: 'Кол-во по пересчету РД', dataIndex: 'quantityRd', width: 180 },
      { title: 'Ед.изм.', dataIndex: 'unitId', width: 160 },
      { title: 'Корпус', dataIndex: 'block', width: 120 },
      { title: 'Этажи', dataIndex: 'floors', width: 150 },
      { title: 'Категория затрат', dataIndex: 'costCategoryId', width: 200 },
      { title: 'Вид затрат', dataIndex: 'costTypeId', width: 200 },
      { title: 'Локализация', dataIndex: 'locationId', width: 200 },
    ]

    const dataColumns = base
      .filter((col) => {
        // Проверяем видимость столбца
        if (columnVisibility[col.dataIndex] === false) {
          return false
        }
        // Старая логика для обратной совместимости
        const key = collapseMap[col.dataIndex as string]
        return key ? !hiddenCols[key] : true
      })
      .sort((a, b) => {
        // Сортируем столбцы согласно columnOrder
        const aIndex = columnOrder.indexOf(a.dataIndex)
        const bIndex = columnOrder.indexOf(b.dataIndex)
        if (aIndex === -1 && bIndex === -1) return 0
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
      .map((col) => {
      const values = Array.from(
        new Set(viewRows.map((row) => row[map[col.dataIndex] as keyof ViewRow]).filter((v) => v)),
      )
      const filters = values.map((v) => ({ text: String(v), value: String(v) }))

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
          case 'tagName':
            return (
              <Select
                style={{ width: 200 }}
                value={record.tagId}
                onChange={(value) => {
                  handleRowChange(record.key, 'tagId', value)
                  const tag = documentationTags?.find((t) => String(t.id) === value)
                  handleRowChange(record.key, 'tagName', tag ? `${tag.tag_number || ''} ${tag.name}`.trim() : '')
                  // Сбрасываем выбранный документ при смене тэга
                  handleRowChange(record.key, 'documentationId', '')
                  handleRowChange(record.key, 'projectCode', '')
                }}
                options={
                  documentationTags?.map((tag) => ({
                    value: String(tag.id),
                    label: `${tag.tag_number || ''} ${tag.name}`.trim()
                  })) ?? []
                }
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label
                  if (typeof label === 'string') {
                    return label.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }}
              />
            )
          case 'projectCode':
            return (
              <Select
                style={{ width: 150 }}
                value={record.documentationId}
                onDropdownVisibleChange={(open) => {
                  if (open) {
                    const filteredDocs = documentations?.filter((doc: any) => !record.tagId || String(doc.tag_id) === record.tagId) ?? []
                    console.log('🔽 ADD MODE - Project Code dropdown opened:', {
                      recordKey: record.key,
                      tagId: record.tagId,
                      totalDocs: documentations?.length ?? 0,
                      filteredDocs: filteredDocs.length,
                      availableOptions: filteredDocs.length
                    })
                  }
                }}
                onChange={(value) => {
                  console.log('✏️ ADD MODE - Project Code selected:', { value, recordKey: record.key })
                  handleRowChange(record.key, 'documentationId', value)
                  const doc = documentations?.find((d: any) => d.id === value)
                  handleRowChange(record.key, 'projectCode', doc?.project_code ?? '')
                }}
                options={
                  documentations
                    ?.filter((doc: any) => {
                      const matches = !record.tagId || String(doc.tag_id) === record.tagId
                      console.log('🔍 ADD MODE - Filtering documentation:', {
                        docId: doc.id,
                        docCode: doc.project_code,
                        docTagId: doc.tag_id,
                        recordTagId: record.tagId,
                        matches,
                        docTagName: doc.tag_name
                      })
                      return matches
                    })
                    .map((doc: any) => ({
                      value: doc.id,
                      label: doc.project_code
                    })) ?? []
                }
                disabled={!record.tagId}
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label
                  if (typeof label === 'string') {
                    return label.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }}
              />
            )
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
                style={{ width: 120 }}
                value={record.blockId}
                onChange={(value) => {
                  handleRowChange(record.key, 'blockId', value)
                  const name = blocks?.find((b) => b.id === value)?.name ?? ''
                  handleRowChange(record.key, 'block', name)
                }}
                options={blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []}
              />
            )
          case 'floors':
            return (
              <Input
                style={{ width: 150 }}
                value={record.floors}
                onChange={(e) => handleRowChange(record.key, 'floors', e.target.value)}
                placeholder="1,2,3 или 1-5"
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
                      // Если выбран вид затрат, показываем только локализации, доступные для этого вида
                      if (record.costTypeId) {
                        const selectedType = costTypes?.find((t) => String(t.id) === record.costTypeId)
                        if (selectedType) {
                          // Находим все виды затрат с таким же названием
                          const sameNameTypes = costTypes?.filter((t) => t.name === selectedType.name)
                          // Получаем все location_id для этих видов затрат
                          const availableLocationIds = sameNameTypes?.map((t) => String(t.location_id))
                          return availableLocationIds?.includes(String(l.id))
                        }
                      }
                      // Если вид затрат не выбран, показываем все локализации
                      return true
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
        dataIndex: 'actions',
        width: 120,
        render: (_, record, index) =>
          index < rows.length ? (
            record.isExisting ? null : (
              <Space size={0}>
                <RowColorPicker value={record.color} onChange={(c) => handleRowChange(record.key, 'color', c)} />
                <Button type="text" size="small" icon={<PlusOutlined />} onClick={() => addRow(index)} style={{ padding: '2px 4px' }} />
                <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copyRow(index)} style={{ padding: '2px 4px' }} />
                <Button 
                  type="text" 
                  size="small"
                  danger 
                  icon={<DeleteOutlined />} 
                  onClick={() => deleteRow(record.key)} 
                  style={{ padding: '2px 4px' }}
                />
              </Space>
            )
          ) : null,
      },
      ...dataColumns,
      {
        title: '',
        dataIndex: 'editActions',
        width: 80,
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
    documentationTags,
    documentations,
    appliedFilters,
    startEdit,
    handleDelete,
    addRow,
    copyRow,
    rows,
    hiddenCols,
    columnVisibility,
    columnOrder,
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
      { title: 'Раздел', dataIndex: 'tagName', width: 200 },
      { title: 'Шифр проекта', dataIndex: 'projectCode', width: 150 },
      { title: 'Материал', dataIndex: 'material', width: 300 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd', width: 120 },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec', width: 150 },
      { title: 'Кол-во по пересчету РД', dataIndex: 'quantityRd', width: 180 },
      { title: 'Ед.изм.', dataIndex: 'unit', width: 160 },
      { title: 'Корпус', dataIndex: 'block', width: 120 },
      { title: 'Этажи', dataIndex: 'floors', width: 150 },
      { title: 'Категория затрат', dataIndex: 'costCategory', width: 200 },
      { title: 'Вид затрат', dataIndex: 'costType', width: 200 },
      { title: 'Локализация', dataIndex: 'location', width: 200 },
    ]

    const dataColumns = base
      .filter((col) => {
        // Проверяем видимость столбца
        if (columnVisibility[col.dataIndex] === false) {
          return false
        }
        // Старая логика для обратной совместимости
        const key = collapseMap[col.dataIndex as string]
        return key ? !hiddenCols[key] : true
      })
      .sort((a, b) => {
        // Сортируем столбцы согласно columnOrder
        const aIndex = columnOrder.indexOf(a.dataIndex)
        const bIndex = columnOrder.indexOf(b.dataIndex)
        if (aIndex === -1 && bIndex === -1) return 0
        if (aIndex === -1) return 1
        if (bIndex === -1) return -1
        return aIndex - bIndex
      })
      .map((col) => {
      const values = Array.from(
        new Set(viewRows.map((row) => row[col.dataIndex as keyof ViewRow]).filter((v) => v)),
      )
      const filters = values.map((v) => ({ text: String(v), value: String(v) }))

      const render: ColumnType<ViewRow>['render'] = (_, record) => {
        const edit = editingRows[record.key]
        if (!edit) return record[col.dataIndex as keyof ViewRow]
        switch (col.dataIndex) {
          case 'tagName':
            return (
              <Select
                style={{ width: 200 }}
                value={edit.tagId}
                onChange={(value) => {
                  handleEditChange(record.key, 'tagId', value)
                  const tag = documentationTags?.find((t) => String(t.id) === value)
                  handleEditChange(record.key, 'tagName', tag ? `${tag.tag_number || ''} ${tag.name}`.trim() : '')
                  // Сбрасываем выбранный документ при смене тэга
                  handleEditChange(record.key, 'documentationId', '')
                  handleEditChange(record.key, 'projectCode', '')
                }}
                options={
                  documentationTags?.map((tag) => ({
                    value: String(tag.id),
                    label: `${tag.tag_number || ''} ${tag.name}`.trim()
                  })) ?? []
                }
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label
                  if (typeof label === 'string') {
                    return label.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }}
              />
            )
          case 'projectCode':
            return (
              <Select
                style={{ width: 150 }}
                value={edit.documentationId}
                onDropdownVisibleChange={(open) => {
                  if (open) {
                    const filteredDocs = documentations?.filter((doc: any) => !edit.tagId || String(doc.tag_id) === edit.tagId) ?? []
                    console.log('🔽 EDIT MODE - Project Code dropdown opened:', {
                      recordKey: record.key,
                      tagId: edit.tagId,
                      totalDocs: documentations?.length ?? 0,
                      filteredDocs: filteredDocs.length,
                      availableOptions: filteredDocs.length
                    })
                  }
                }}
                onChange={(value) => {
                  console.log('✏️ EDIT MODE - Project Code selected:', { value, recordKey: record.key })
                  handleEditChange(record.key, 'documentationId', value)
                  const doc = documentations?.find((d: any) => d.id === value)
                  handleEditChange(record.key, 'projectCode', doc?.project_code ?? '')
                }}
                options={
                  documentations
                    ?.filter((doc: any) => {
                      const matches = !edit.tagId || String(doc.tag_id) === edit.tagId
                      console.log('🔍 EDIT MODE - Filtering documentation:', {
                        docId: doc.id,
                        docCode: doc.project_code,
                        docTagId: doc.tag_id,
                        editTagId: edit.tagId,
                        matches,
                        docTagName: doc.tag_name
                      })
                      return matches
                    })
                    .map((doc: any) => ({
                      value: doc.id,
                      label: doc.project_code
                    })) ?? []
                }
                disabled={!edit.tagId}
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label
                  if (typeof label === 'string') {
                    return label.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }}
              />
            )
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
                style={{ width: 120 }}
                value={edit.blockId}
                onChange={(value) => {
                  handleEditChange(record.key, 'blockId', value)
                  const name = blocks?.find((b) => b.id === value)?.name ?? ''
                  handleEditChange(record.key, 'block', name)
                }}
                options={blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []}
              />
            )
          case 'floors':
            return (
              <Input
                style={{ width: 150 }}
                value={edit.floors}
                onChange={(e) => handleEditChange(record.key, 'floors', e.target.value)}
                placeholder="1,2,3 или 1-5"
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
                popupMatchSelectWidth={false}
                options={
                  costCategories
                    ?.sort((a, b) => {
                      // Сортируем по номеру, если он есть
                      if (a.number !== undefined && a.number !== null && 
                          b.number !== undefined && b.number !== null) {
                        // Числовое сравнение для правильной сортировки
                        return Number(a.number) - Number(b.number)
                      }
                      return a.name.localeCompare(b.name)
                    })
                    .map((c) => ({
                      value: String(c.id),
                      label: c.name, // Отображаем только название без номера
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
                options={
                  locations
                    ?.filter((l) => {
                      // Если выбран вид затрат, показываем только локализации, доступные для этого вида
                      if (edit.costTypeId) {
                        const selectedType = costTypes?.find((t) => String(t.id) === edit.costTypeId)
                        if (selectedType) {
                          // Находим все виды затрат с таким же названием
                          const sameNameTypes = costTypes?.filter((t) => t.name === selectedType.name)
                          // Получаем все location_id для этих видов затрат
                          const availableLocationIds = sameNameTypes?.map((t) => String(t.location_id))
                          return availableLocationIds?.includes(String(l.id))
                        }
                      }
                      // Если вид затрат не выбран, показываем все локализации
                      return true
                    })
                    .map((l) => ({ value: String(l.id), label: l.name })) ?? []
                }
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
        width: Object.keys(editingRows).length > 0 ? 35 : 5,
        render: (_: any, record: ViewRow) => {
          const edit = editingRows[record.key]
          return edit ? (
            <RowColorPicker value={edit.color} onChange={(c) => handleEditChange(record.key, 'color', c)} />
          ) : (
            <div
              style={{
                width: 4,
                height: 16,
                background: record.color ? colorMap[record.color] : undefined,
              }}
            />
          )
        },
      },
      ...dataColumns,
      {
        title: '',
        dataIndex: 'actions',
        width: 100,
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
    documentationTags,
    documentations,
    hiddenCols,
    deleteMode,
    selectedRows,
    toggleRowSelection,
    columnVisibility,
    columnOrder,
  ])

  const { Text } = Typography

  // Инициализация порядка и видимости столбцов
  const allColumns = useMemo(() => [
    { key: 'tagName', title: 'Раздел' },
    { key: 'projectCode', title: 'Шифр проекта' },
    { key: 'block', title: 'Корпус' },
    { key: 'floors', title: 'Этажи' },
    { key: 'costCategory', title: 'Категория затрат' },
    { key: 'costType', title: 'Вид затрат' },
    { key: 'location', title: 'Локализация' },
    { key: 'material', title: 'Материал' },
    { key: 'quantityPd', title: 'Кол-во по ПД' },
    { key: 'quantitySpec', title: 'Кол-во по спеке РД' },
    { key: 'quantityRd', title: 'Кол-во по пересчету РД' },
    { key: 'unit', title: 'Ед.изм.' },
  ], [])

  // Инициализация состояния видимости столбцов при первой загрузке
  useMemo(() => {
    // Попытка загрузить из localStorage
    const savedVisibility = localStorage.getItem('chessboard-column-visibility')
    const savedOrder = localStorage.getItem('chessboard-column-order')
    
    if (savedVisibility && Object.keys(columnVisibility).length === 0) {
      try {
        const parsed = JSON.parse(savedVisibility)
        // Проверяем, есть ли новые столбцы, которых нет в сохраненных настройках
        let hasNewColumns = false
        allColumns.forEach(col => {
          if (!(col.key in parsed)) {
            parsed[col.key] = true
            hasNewColumns = true
          }
        })
        setColumnVisibility(parsed)
        // Если были добавлены новые столбцы, обновляем localStorage
        if (hasNewColumns) {
          localStorage.setItem('chessboard-column-visibility', JSON.stringify(parsed))
        }
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
        const parsed = JSON.parse(savedOrder)
        // Добавляем новые столбцы, которых нет в сохраненном порядке
        const missingColumns = allColumns.filter(col => !parsed.includes(col.key))
        // Добавляем новые столбцы в начало (tagName и projectCode должны быть первыми)
        if (missingColumns.length > 0) {
          const tagNameCol = missingColumns.find(c => c.key === 'tagName')
          const projectCodeCol = missingColumns.find(c => c.key === 'projectCode')
          const newOrder = []
          
          // Добавляем tagName и projectCode в начало
          if (tagNameCol) {
            newOrder.push('tagName')
            missingColumns.splice(missingColumns.indexOf(tagNameCol), 1)
          }
          if (projectCodeCol) {
            newOrder.push('projectCode')
            missingColumns.splice(missingColumns.indexOf(projectCodeCol), 1)
          }
          
          // Затем все остальные существующие столбцы
          newOrder.push(...parsed)
          
          // И оставшиеся новые столбцы в конец
          newOrder.push(...missingColumns.map(c => c.key))
          
          setColumnOrder(newOrder)
          // Обновляем localStorage
          localStorage.setItem('chessboard-column-order', JSON.stringify(newOrder))
        } else {
          setColumnOrder(parsed)
        }
      } catch {
        setColumnOrder(allColumns.map(c => c.key))
      }
    } else if (columnOrder.length === 0) {
      setColumnOrder(allColumns.map(c => c.key))
    }
  }, [allColumns, columnVisibility, columnOrder])
  
  // Сохранение в localStorage при изменении
  useMemo(() => {
    if (Object.keys(columnVisibility).length > 0) {
      localStorage.setItem('chessboard-column-visibility', JSON.stringify(columnVisibility))
    }
  }, [columnVisibility])
  
  useMemo(() => {
    if (columnOrder.length > 0) {
      localStorage.setItem('chessboard-column-order', JSON.stringify(columnOrder))
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
  
  const resetToDefaults = useCallback(() => {
    // Сброс видимости - все столбцы видимы
    const defaultVisibility: Record<string, boolean> = {}
    allColumns.forEach(col => {
      defaultVisibility[col.key] = true
    })
    setColumnVisibility(defaultVisibility)
    
    // Сброс порядка - исходный порядок
    setColumnOrder(allColumns.map(c => c.key))
    
    // Очистка localStorage
    localStorage.removeItem('chessboard-column-visibility')
    localStorage.removeItem('chessboard-column-order')
  }, [allColumns])

  // Применение порядка и видимости к столбцам таблицы
  const orderedViewColumns = useMemo(() => {
    const columnsMap: Record<string, any> = {}
    
    viewColumns.forEach(col => {
      if (col && 'dataIndex' in col) {
        columnsMap[col.dataIndex as string] = col
      }
    })

    // Служебные столбцы
    const actionsColumn = columnsMap['actions']
    const colorColumn = columnsMap['color']
    
    // Сначала фильтруем столбцы по видимости и порядку
    const orderedCols = columnOrder
      .filter(key => {
        // Служебные колонки не включаем в основную сортировку
        if (key === 'checkbox' || key === 'color' || key === 'actions' || key === 'add') return false
        return columnVisibility[key] !== false
      })
      .map(key => columnsMap[key])
      .filter(Boolean)
    
    // Собираем результат
    const result = []
    
    // Если включен режим удаления, добавляем checkbox колонку в начало
    if (deleteMode && columnsMap['checkbox']) {
      result.push(columnsMap['checkbox'])
    }
    
    // Добавляем цветовую колонку если она есть
    if (colorColumn) {
      result.push(colorColumn)
    }
    
    // Добавляем отсортированные колонки данных
    result.push(...orderedCols)
    
    // Добавляем колонку действий в конец
    if (actionsColumn) {
      result.push(actionsColumn)
    }
    
    return result
  }, [viewColumns, columnOrder, columnVisibility, deleteMode])

  // Применение порядка и видимости к addColumns
  const orderedAddColumns = useMemo(() => {
    const columnsMap: Record<string, any> = {}
    
    addColumns.forEach(col => {
      if (col && 'dataIndex' in col) {
        const dataIndex = col.dataIndex as string
        // Маппинг для соответствия между addColumns и настройками столбцов
        const mappedKey = dataIndex === 'unitId' ? 'unit' :
                          dataIndex === 'costCategoryId' ? 'costCategory' :
                          dataIndex === 'costTypeId' ? 'costType' :
                          dataIndex === 'locationId' ? 'location' :
                          dataIndex
        columnsMap[mappedKey] = col
      }
    })

    // Служебные колонки (действия) всегда добавляются в начало и конец
    const actionsColumn = columnsMap['actions']
    const editActionsColumn = columnsMap['editActions']
    
    // Применяем порядок и видимость к остальным колонкам
    const orderedDataCols = columnOrder
      .filter(key => {
        return columnVisibility[key] !== false && columnsMap[key] && 
               key !== 'actions' && key !== 'editActions'
      })
      .map(key => columnsMap[key])
      .filter(Boolean)
    
    // Собираем итоговый массив колонок
    const result = []
    if (actionsColumn) result.push(actionsColumn)
    result.push(...orderedDataCols)
    if (editActionsColumn) result.push(editActionsColumn)
    
    return result
  }, [addColumns, columnOrder, columnVisibility])

  return (
    <>
      <style>
        {`
          /* Контейнер страницы должен заполнять всю высоту */
          .chessboard-page-container {
            height: calc(100vh - 96px);
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          
          .chessboard-filters-section {
            flex-shrink: 0;
            margin-bottom: 16px;
          }
          
          .chessboard-table-section {
            flex: 1 1 auto;
            overflow: auto;
            min-height: 0;
            position: relative;
          }
          
          /* Убираем прокрутку у всех внутренних элементов таблицы */
          .chessboard-table-section .ant-table-wrapper {
            height: auto !important;
            overflow: visible !important;
          }
          
          .chessboard-table-section .ant-table {
            height: auto !important;
          }
          
          .chessboard-table-section .ant-table-container {
            overflow: visible !important;
            height: auto !important;
          }
          
          .chessboard-table-section .ant-table-content {
            overflow: visible !important;
            height: auto !important;
          }
          
          .chessboard-table-section .ant-table-body {
            overflow: visible !important;
            height: auto !important;
          }
          
          /* Убираем стандартные стили Ant Design для прокрутки */
          .chessboard-table-section .ant-table-content table {
            width: auto !important;
            min-width: 100% !important;
          }
          
          .chessboard-table-section .ant-table-scroll {
            overflow: visible !important;
          }
          
          .chessboard-table-section .ant-table-hide-scrollbar {
            overflow: visible !important;
          }
        `}
      </style>
      <div className="chessboard-page-container">
        <div className="chessboard-filters-section">
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
            <Badge 
              count={[filters.blockId, filters.categoryId, filters.typeId, filters.tagId, filters.documentationId].filter(Boolean).length} 
              size="small"
              style={{ marginRight: '8px' }}
            >
              <Button
                type={filtersExpanded ? 'default' : 'text'}
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                icon={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FilterOutlined style={{ fontSize: '16px', color: filtersExpanded ? '#1890ff' : undefined }} />
                    {filtersExpanded ? 
                      <CaretUpFilled style={{ fontSize: '10px', color: '#1890ff' }} /> : 
                      <CaretDownFilled style={{ fontSize: '10px' }} />
                    }
                  </span>
                }
                title={filtersExpanded ? 'Скрыть фильтры' : 'Показать фильтры'}
                style={{ 
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  borderColor: filtersExpanded ? '#1890ff' : undefined
                }}
              >
                Фильтры
              </Button>
            </Badge>
          </Space>
          <Space>
            {appliedFilters && !Object.keys(editingRows).length && mode === 'view' && !deleteMode && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={startAdd}
              >
                Добавить
              </Button>
            )}
            {Object.keys(editingRows).length > 0 && (
              <>
                <Button 
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleUpdate}
                >
                  Сохранить
                </Button>
                <Button
                  onClick={handleCancelEdit}
                >
                  Отмена
                </Button>
              </>
            )}
            {appliedFilters && mode === 'add' && (
              <>
                <Button 
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={handleSave}
                >
                  Сохранить
                </Button>
                <Button
                  onClick={handleCancel}
                >
                  Отменить
                </Button>
              </>
            )}
            {appliedFilters && !Object.keys(editingRows).length && mode === 'view' && (
              <Button
                danger={deleteMode}
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
                {deleteMode && selectedRows.size > 0 
                  ? `Удалить (${selectedRows.size})` 
                  : deleteMode 
                  ? 'Выйти из режима' 
                  : 'Удалить'}
              </Button>
            )}
            {deleteMode && selectedRows.size === 0 && (
              <Button
                onClick={() => {
                  setDeleteMode(false)
                  setSelectedRows(new Set())
                }}
              >
                Отмена
              </Button>
            )}
            {appliedFilters && mode === 'view' && (
              <Button
                icon={<UploadOutlined />}
                onClick={openImport}
                disabled={deleteMode || Object.keys(editingRows).length > 0}
              >
                Импорт
              </Button>
            )}
          </Space>
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
                options={blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []}
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
                popupMatchSelectWidth={false}
                options={
                  costCategories
                    ?.sort((a, b) => {
                      // Сортируем по номеру, если он есть
                      if (a.number !== undefined && a.number !== null && 
                          b.number !== undefined && b.number !== null) {
                        // Числовое сравнение для правильной сортировки
                        return Number(a.number) - Number(b.number)
                      }
                      return a.name.localeCompare(b.name)
                    })
                    .map((c) => ({
                      value: String(c.id),
                      label: c.name, // Отображаем только название без номера
                    })) ?? []
                }
                allowClear
              />
              <Select
                placeholder="Вид затрат"
                style={{ width: 200 }}
                value={filters.typeId}
                onChange={(value) => setFilters((f) => ({ ...f, typeId: value }))}
                options={
                  costTypes
                    ?.filter((t) => String(t.cost_category_id) === filters.categoryId)
                    .map((t) => ({ value: String(t.id), label: t.name })) ?? []
                }
                disabled={!filters.categoryId}
                allowClear
              />
              <Select
                placeholder="Раздел"
                style={{ width: 200 }}
                value={filters.tagId}
                onChange={(value) => setFilters((f) => ({ ...f, tagId: value, documentationId: undefined }))}
                options={
                  documentationTags?.map((tag) => ({
                    value: String(tag.id),
                    label: `${tag.tag_number || ''} ${tag.name}`.trim()
                  })) ?? []
                }
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label
                  if (typeof label === 'string') {
                    return label.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }}
              />
              <Select
                placeholder="Шифр документа"
                style={{ width: 200 }}
                value={filters.documentationId}
                onChange={(value) => setFilters((f) => ({ ...f, documentationId: value }))}
                options={
                  documentations
                    ?.filter((doc: any) => !filters.tagId || String(doc.tag_id) === filters.tagId)
                    .map((doc: any) => ({
                      value: doc.id,
                      label: doc.project_code
                    })) ?? []
                }
                disabled={!filters.tagId}
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const label = option?.label
                  if (typeof label === 'string') {
                    return label.toLowerCase().includes(input.toLowerCase())
                  }
                  return false
                }}
              />
              </Space>
              <Button
                icon={<SettingOutlined />}
                onClick={() => setColumnsSettingsOpen(true)}
              >
                Настройка столбцов
              </Button>
            </div>
          </Card>
        )}
      </div>
      {appliedFilters && (
        <div className="chessboard-table-section">
          {mode === 'add' ? (
            <Table<TableRow>
            dataSource={tableRows}
            columns={orderedAddColumns}
            pagination={false}
            rowKey="key"
            scroll={{ 
              x: 'max-content'
            }}
            sticky={false}
            rowClassName={(record) => (record.color ? `row-${record.color}` : '')}
          />
        ) : (
          <Table<ViewRow>
            dataSource={viewRows}
            columns={orderedViewColumns}
            pagination={false}
            rowKey="key"
            scroll={{ 
              x: 'max-content'
            }}
            sticky={false}
            rowClassName={(record) => {
              const color = editingRows[record.key]?.color ?? record.color
              return color ? `row-${color}` : ''
            }}
          />
        )}
        </div>
      )}
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
            popupMatchSelectWidth={false}
            options={costCategories
                ?.sort((a, b) => {
                  // Сортируем по номеру, если он есть
                  if (a.number && b.number) {
                    const aNum = String(a.number)
                    const bNum = String(b.number)
                    return aNum.localeCompare(bNum)
                  }
                  return a.name.localeCompare(b.name)
                })
                .map((c) => ({
                  value: String(c.id),
                  label: c.name, // Отображаем только название без номера
                })) ?? []}
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
            options={costTypes
                ?.filter((t) => String(t.cost_category_id) === importState.categoryId)
                .map((t) => ({ value: String(t.id), label: t.name })) ?? []}
            disabled={!importState.categoryId}
          />
          <Select
            placeholder="Локализация"
            style={{ width: '100%' }}
            value={importState.locationId ?? ''}
            onChange={(value) =>
              setImportState((s) => ({ ...s, locationId: value || undefined }))
            }
            options={locations?.map((l) => ({ value: String(l.id), label: l.name })) ?? []}
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
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Checkbox
            checked={allColumns.every(col => columnVisibility[col.key] !== false)}
            indeterminate={allColumns.some(col => columnVisibility[col.key]) && !allColumns.every(col => columnVisibility[col.key] !== false)}
            onChange={(e) => selectAllColumns(e.target.checked)}
          >
            Выделить все
          </Checkbox>
          <Button
            type="link"
            onClick={resetToDefaults}
          >
            По умолчанию
          </Button>
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
    </>
  )
}

