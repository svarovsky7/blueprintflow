import { useCallback, useMemo, useState, useEffect, type Key } from 'react'
import {
  App,
  Badge,
  Button,
  Card,
  Checkbox,
  Drawer,
  Dropdown,
  AutoComplete,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Typography,
  Upload,
} from 'antd'
import type { ColumnType, ColumnsType } from 'antd/es/table'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  BgColorsOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  SaveOutlined,
  SettingOutlined,
  FilterOutlined,
  CaretUpFilled,
  CaretDownFilled,
  UploadOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { documentationApi } from '@/entities/documentation'
import { documentationTagsApi } from '@/entities/documentation-tags'
import { materialsApi } from '@/entities/materials'
import { useScale } from '@/shared/contexts/ScaleContext'

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

interface FloorQuantity {
  quantityPd: string
  quantitySpec: string
  quantityRd: string
}

type FloorQuantities = Record<number, FloorQuantity>

interface RowData {
  key: string
  material: string
  materialId: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  nomenclatureId: string
  supplier?: string
  unitId: string
  blockId: string
  block: string
  costCategoryId: string
  costTypeId: string
  locationId: string
  rateId: string
  floors: string
  color: RowColor
  documentationId?: string
  tagId?: string
  tagName?: string
  projectCode?: string
  floorQuantities?: FloorQuantities
}

interface FloorModalRow {
  floor: number
  quantityPd: string
  quantitySpec: string
  quantityRd: string
}

interface FloorModalInfo {
  projectCode?: string
  workName?: string
  material: string
  unit: string
}

interface ViewRow {
  key: string
  materialId: string
  material: string
  quantityPd: string
  quantitySpec: string
  quantityRd: string
  nomenclatureId: string
  nomenclature: string
  supplier: string
  unit: string
  blockId: string
  block: string
  costCategory: string
  costType: string
  workName: string
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

interface ProjectOption {
  id: string
  name: string
}
interface BlockOption {
  id: string
  name: string
}
interface UnitOption {
  id: string
  name: string
}
interface NomenclatureOption {
  id: string
  name: string
}
interface DocumentationRecord {
  id: string
  project_code: string
  tag_id: number | null
  tag_name?: string | null
}
interface CostCategoryOption {
  id: number
  number: number | null
  name: string
}
interface CostTypeOption {
  id: number
  name: string
  cost_category_id: number
  location_id: number
}
interface LocationOption {
  id: number
  name: string
}

interface RateOption {
  id: string
  work_name: string
  rates_detail_cost_categories_mapping: { detail_cost_category_id: number }[] | null
}

type NomenclatureMapping = {
  nomenclature_id: string | null
  nomenclature?: { name: string | null } | null
  supplier_name: string | null
}

interface DbRow {
  id: string
  material: string | null
  materials?: { name: string | null } | null
  unit_id: string | null
  color: string | null
  floors?: string
  floorQuantities?: FloorQuantities
  units?: { name: string | null } | null
  chessboard_nomenclature_mapping?: NomenclatureMapping | NomenclatureMapping[] | null
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
  chessboard_rates_mapping?:
    | {
        rate_id: string | null
        rates?: { work_name: string | null } | null
      }[]
    | null
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

const getNomenclatureMapping = (
  mapping: NomenclatureMapping | NomenclatureMapping[] | null | undefined,
): NomenclatureMapping | null => (Array.isArray(mapping) ? (mapping[0] ?? null) : (mapping ?? null))

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
  const parts = floorsStr.split(',').map((s) => s.trim())

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map((s) => parseInt(s.trim()))
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
  materialId: '',
  quantityPd: '',
  quantitySpec: '',
  quantityRd: '',
  nomenclatureId: '',
  supplier: '',
  unitId: '',
  blockId: defaults.blockId ?? '',
  block: defaults.block ?? '',
  costCategoryId: defaults.costCategoryId ?? '',
  costTypeId: defaults.costTypeId ?? '',
  locationId: defaults.locationId ?? '',
  rateId: '',
  floors: defaults.floors ?? '',
  color: '',
  floorQuantities: undefined,
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
  const { scale } = useScale()

  const [filters, setFilters] = useState<{
    projectId?: string
    blockId?: string
    categoryId?: string
    typeId?: string
    tagId?: string
    documentationId?: string
  }>({})
  const [appliedFilters, setAppliedFilters] = useState<{
    projectId: string
    blockId?: string
    categoryId?: string
    typeId?: string
    tagId?: string
    documentationId?: string
  } | null>(null)
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

  const { data: materials, refetch: refetchMaterials } = useQuery({
    queryKey: ['materials'],
    queryFn: materialsApi.getAll,
  })

  const materialOptions = useMemo(
    () => materials?.map((m) => ({ value: m.uuid, label: m.name })) ?? [],
    [materials],
  )

  const { data: nomenclatures } = useQuery<NomenclatureOption[]>({
    queryKey: ['nomenclature'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase.from('nomenclature').select('id, name').order('name')
      if (error) throw error
      return data as NomenclatureOption[]
    },
  })
  const [nomenclatureOptions, setNomenclatureOptions] = useState<NomenclatureOption[]>([])
  useEffect(() => {
    setNomenclatureOptions(nomenclatures ?? [])
  }, [nomenclatures])
  const nomenclatureDropdownWidth = useMemo(() => {
    if (typeof document === 'undefined') return 200
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return 200
    context.font = getComputedStyle(document.body).font || '14px'
    let max = 0
    for (const n of nomenclatureOptions) {
      const width = context.measureText(n.name).width
      if (width > max) max = width
    }
    return Math.min(500, Math.ceil(max) + 64)
  }, [nomenclatureOptions])
  const handleNomenclatureSearch = async (value: string) => {
    if (!supabase) return
    const { data, error } = await supabase
      .from('nomenclature')
      .select('id, name')
      .ilike('name', `%${value}%`)
      .limit(50)
    if (!error && data) setNomenclatureOptions(data as NomenclatureOption[])
  }

  const getNomenclatureSelectOptions = useCallback(
    (currentId?: string, currentName?: string) => {
      const opts = [...nomenclatureOptions]
      if (currentId && currentName && !opts.some((n) => n.id === currentId)) {
        opts.push({ id: currentId, name: currentName })
      }
      return opts.map((n) => ({ value: n.id, label: n.name }))
    },
    [nomenclatureOptions],
  )

  const [supplierOptions, setSupplierOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({})
  const [supplierDropdownWidths, setSupplierDropdownWidths] = useState<Record<string, number>>({})

  const loadSupplierOptions = useCallback(
    async (nomenclatureId: string | undefined, key: string, currentSupplier?: string) => {
      if (!nomenclatureId) {
        setSupplierOptions((prev) => ({ ...prev, [key]: [] }))
        setSupplierDropdownWidths((prev) => ({ ...prev, [key]: 250 }))
        return
      }
      if (!supabase) return
      const { data, error } = await supabase
        .from('nomenclature_supplier_mapping')
        .select('supplier_names(name)')
        .eq('nomenclature_id', nomenclatureId)
      if (error) {
        console.error('Не удалось загрузить поставщиков:', error.message)
        setSupplierOptions((prev) => ({ ...prev, [key]: [] }))
        return
      }
      const options = (
        data as { supplier_names: { name: string | null } | { name: string | null }[] | null }[]
      )
        .map((d) =>
          Array.isArray(d.supplier_names) ? d.supplier_names[0]?.name : d.supplier_names?.name,
        )
        .filter((n): n is string => !!n)
        .map((name) => ({ value: name, label: name }))
      if (currentSupplier && !options.some((o) => o.value === currentSupplier)) {
        options.push({ value: currentSupplier, label: currentSupplier })
      }
      setSupplierOptions((prev) => ({ ...prev, [key]: options }))

      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        if (context) {
          context.font = getComputedStyle(document.body).font || '14px'
          let max = 0
          for (const o of options) {
            const width = context.measureText(o.label).width
            if (width > max) max = width
          }
          const width = Math.min(500, Math.ceil(max) + 64)
          setSupplierDropdownWidths((prev) => ({ ...prev, [key]: width }))
        } else {
          setSupplierDropdownWidths((prev) => ({ ...prev, [key]: 200 }))
        }
      }
    },
    [],
  )

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

  const { data: rates } = useQuery<RateOption[]>({
    queryKey: ['rates'],
    queryFn: async () => {
      if (!supabase) return []
      const { data, error } = await supabase
        .from('rates')
        .select('id, work_name, rates_detail_cost_categories_mapping(detail_cost_category_id)')
      if (error) throw error
      return data as RateOption[]
    },
  })

  const getRateOptions = useCallback(
    (costTypeId?: string, costCategoryId?: string) =>
      rates
        ?.filter((r) => {
          const detailIds =
            r.rates_detail_cost_categories_mapping?.map((m) => m.detail_cost_category_id) ?? []
          if (costTypeId) {
            return detailIds.includes(Number(costTypeId))
          }
          if (costCategoryId) {
            if (!costTypes) return true
            return detailIds.some((id) => {
              const ct = costTypes.find((c) => c.id === id)
              return ct?.cost_category_id === Number(costCategoryId)
            })
          }
          return true
        })
        .map((r) => ({ value: String(r.id), label: r.work_name })) ?? [],
    [rates, costTypes],
  )

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
  const { data: documentations } = useQuery<DocumentationRecord[]>({
    queryKey: ['documentations', appliedFilters?.projectId],
    queryFn: async () => {
      console.log('📚 DOCUMENTATION QUERY - Executing:', {
        projectId: appliedFilters?.projectId,
        enabled: !!appliedFilters?.projectId,
      })
      if (!appliedFilters?.projectId) {
        console.log('⚠️ DOCUMENTATION QUERY - No project ID, returning empty array')
        return []
      }
      const fetchFilters = { project_id: appliedFilters.projectId }
      const result = await documentationApi.getDocumentation(fetchFilters)

      console.log('✅ DOCUMENTATION QUERY - Loaded:', {
        projectId: appliedFilters.projectId,
        totalCount: result.length,
        uniqueTagIds: [...new Set(result.map((doc) => doc.tag_id))],
        sampleData: result.slice(0, 5).map((doc) => ({
          id: doc.id,
          code: doc.project_code,
          tag_id: doc.tag_id,
          tag_name: doc.tag_name,
          tag_number: doc.tag_number,
        })),
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
    addRowsCount: rows.length,
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
          `id, material, materials(name), unit_id, color, units(name),
          chessboard_nomenclature_mapping!left(nomenclature_id, supplier_name, nomenclature(name)),
          ${relation}(block_id, blocks(name), cost_category_id, cost_type_id, location_id, cost_categories(name), detail_cost_categories(name), location(name)),
          chessboard_rates_mapping(rate_id, rates(work_name)),
          chessboard_documentation_mapping(documentation_id, documentations(id, code, tag_id, stage, tag:documentation_tags(id, name, tag_number)))`,
        )
        .eq('project_id', appliedFilters.projectId)
      if (appliedFilters.blockId) query.eq('chessboard_mapping.block_id', appliedFilters.blockId)
      if (appliedFilters.categoryId)
        query.eq('chessboard_mapping.cost_category_id', Number(appliedFilters.categoryId))
      if (appliedFilters.typeId)
        query.eq('chessboard_mapping.cost_type_id', Number(appliedFilters.typeId))
      // Фильтрация по документации
      if (appliedFilters.documentationId) {
        query.eq(
          'chessboard_documentation_mapping.documentation_id',
          appliedFilters.documentationId,
        )
      } else if (appliedFilters.tagId) {
        query.eq(
          'chessboard_documentation_mapping.documentations.tag_id',
          Number(appliedFilters.tagId),
        )
      }
      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) {
        message.error('Не удалось загрузить данные')
        throw error
      }

      // Загружаем этажи для всех записей
      const chessboardIds = ((data as unknown as DbRow[] | null | undefined) ?? []).map(
        (item) => item.id,
      )
      const floorsMap: Record<string, { floors: string; quantities: FloorQuantities }> = {}

      if (chessboardIds.length > 0) {
        const { data: floorsData } = await supabase
          .from('chessboard_floor_mapping')
          .select(
            'chessboard_id, floor_number, location_id, "quantityPd", "quantitySpec", "quantityRd"',
          )
          .in('chessboard_id', chessboardIds)
          .order('floor_number', { ascending: true })

        // Группируем этажи или локации по chessboard_id и сохраняем количества
        if (floorsData) {
          const grouped: Record<string, { floors: number[]; quantities: FloorQuantities }> = {}
          floorsData.forEach(
            (item: {
              chessboard_id: string
              floor_number: number | null
              location_id: number | null
              quantityPd: number | null
              quantitySpec: number | null
              quantityRd: number | null
            }) => {
              if (!grouped[item.chessboard_id]) {
                grouped[item.chessboard_id] = { floors: [], quantities: {} }
              }
              if (item.floor_number !== null && item.floor_number !== undefined) {
                grouped[item.chessboard_id].floors.push(item.floor_number)
                grouped[item.chessboard_id].quantities[item.floor_number] = {
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
                }
              } else {
                grouped[item.chessboard_id].quantities[0] = {
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
                }
              }
            },
          )

          // Преобразуем массивы этажей в строки с диапазонами
          for (const [id, { floors, quantities }] of Object.entries(grouped)) {
            floorsMap[id] = {
              floors: formatFloorsString(floors),
              quantities,
            }
          }
        }
      }

      // Добавляем этажи и количества к результатам
      const result = (data as unknown as DbRow[]) ?? []

      return result.map((item) => {
        return {
          ...item,
          floors: floorsMap[item.id]?.floors || '',
          floorQuantities: floorsMap[item.id]?.quantities,
        }
      })
    },
  })

  const viewRows = useMemo<ViewRow[]>(
    () =>
      (tableData ?? []).map((item) => {
        const documentation = item.chessboard_documentation_mapping?.documentations
        const tag = documentation?.tag
        const sumPd = item.floorQuantities
          ? Object.values(item.floorQuantities).reduce(
              (s, q) => s + (parseFloat(q.quantityPd) || 0),
              0,
            )
          : null
        const sumSpec = item.floorQuantities
          ? Object.values(item.floorQuantities).reduce(
              (s, q) => s + (parseFloat(q.quantitySpec) || 0),
              0,
            )
          : null
        const sumRd = item.floorQuantities
          ? Object.values(item.floorQuantities).reduce(
              (s, q) => s + (parseFloat(q.quantityRd) || 0),
              0,
            )
          : null
        return {
          key: item.id,
          materialId: item.material ?? '',
          material: item.materials?.name ?? '',
          quantityPd: sumPd !== null ? String(sumPd) : '',
          quantitySpec: sumSpec !== null ? String(sumSpec) : '',
          quantityRd: sumRd !== null ? String(sumRd) : '',
          nomenclatureId:
            getNomenclatureMapping(item.chessboard_nomenclature_mapping)?.nomenclature_id ?? '',
          nomenclature:
            getNomenclatureMapping(item.chessboard_nomenclature_mapping)?.nomenclature?.name ?? '',
          supplier:
            getNomenclatureMapping(item.chessboard_nomenclature_mapping)?.supplier_name ?? '',
          unit: item.units?.name ?? '',
          blockId: item.chessboard_mapping?.block_id ?? '',
          block: item.chessboard_mapping?.blocks?.name ?? '',
          costCategory: item.chessboard_mapping?.cost_categories?.name ?? '',
          costType: item.chessboard_mapping?.detail_cost_categories?.name ?? '',
          workName: item.chessboard_rates_mapping?.[0]?.rates?.work_name ?? '',
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
        materialId: v.materialId,
        quantityPd: v.quantityPd,
        quantitySpec: v.quantitySpec,
        quantityRd: v.quantityRd,
        nomenclatureId: v.nomenclatureId,
        supplier: v.supplier,
        unitId: v.unit,
        blockId: v.blockId,
        block: v.block,
        costCategoryId: v.costCategory,
        costTypeId: v.costType,
        locationId: v.location,
        rateId: v.workName,
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
    setFiltersExpanded(false) // Сворачиваем блок фильтров после применения
  }

  const addRow = useCallback(
    (index: number) => {
      if (!appliedFilters) return
      const defaultLocationId = appliedFilters.typeId
        ? String(costTypes?.find((t) => String(t.id) === appliedFilters.typeId)?.location_id ?? '')
        : ''
      const blockName = appliedFilters.blockId
        ? (blocks?.find((b) => b.id === appliedFilters.blockId)?.name ?? '')
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
        await supabase!.from('chessboard_rates_mapping').delete().eq('chessboard_id', id)
        await supabase!.from('chessboard_mapping').delete().eq('chessboard_id', id)
        await supabase!.from('chessboard').delete().eq('id', id)
      })

      await Promise.all(deletePromises)
      message.success(`Удалено строк: ${idsToDelete.length}`)
      setSelectedRows(new Set())
      setDeleteMode(false)
      await refetch()
    } catch (error: unknown) {
      message.error(`Не удалось удалить строки: ${(error as Error).message}`)
    }
  }, [selectedRows, message, refetch])

  const toggleRowSelection = useCallback((key: string) => {
    setSelectedRows((prev) => {
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
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              [field]: value,
              ...(field === 'quantityPd' || field === 'quantitySpec' || field === 'quantityRd'
                ? { floorQuantities: undefined }
                : {}),
            }
          : r,
      ),
    )
  }, [])

  const handleMaterialBlur = useCallback(
    async (key: string, name: string) => {
      if (!name.trim()) return
      try {
        const material = await materialsApi.ensure(name.trim())
        handleRowChange(key, 'materialId', material.uuid)
        handleRowChange(key, 'material', material.name)
        await refetchMaterials()
      } catch (e) {
        message.error(`Не удалось сохранить материал: ${(e as Error).message}`)
      }
    },
    [handleRowChange, refetchMaterials, message],
  )

  const handleEditChange = useCallback((key: string, field: keyof RowData, value: string) => {
    setEditingRows((prev) => {
      const updated = { ...prev[key], [field]: value }
      if (field === 'quantityPd' || field === 'quantitySpec' || field === 'quantityRd') {
        delete updated.floorQuantities
      }
      return { ...prev, [key]: updated }
    })
  }, [])

  const [floorModalOpen, setFloorModalOpen] = useState(false)
  const [floorModalRowKey, setFloorModalRowKey] = useState<string | null>(null)
  const [floorModalIsEdit, setFloorModalIsEdit] = useState(false)
  const [floorModalData, setFloorModalData] = useState<FloorModalRow[]>([])
  const [floorModalInfo, setFloorModalInfo] = useState<FloorModalInfo>({ material: '', unit: '' })

  const openFloorModal = useCallback(
    (key: string, isEdit: boolean) => {
      const row = isEdit
        ? (editingRows[key] ??
          rows.find((r) => r.key === key) ??
          tableData?.find((r) => r.id === key))
        : (rows.find((r) => r.key === key) ?? tableData?.find((r) => r.id === key))
      if (!row) return
      const floors = parseFloorsString(row.floors || '')
      const quantities = row.floorQuantities || {}
      const data = floors.map((f) => ({
        floor: f,
        quantityPd: quantities[f]?.quantityPd || '',
        quantitySpec: quantities[f]?.quantitySpec || '',
        quantityRd: quantities[f]?.quantityRd || '',
      }))
      const unitName =
        'unitId' in row
          ? (units?.find((u) => String(u.id) === row.unitId)?.name ?? '')
          : (row.units?.name ?? '')
      const workName =
        'costTypeId' in row
          ? (costTypes?.find((t) => String(t.id) === row.costTypeId)?.name ?? '')
          : (row.chessboard_mapping?.detail_cost_categories?.name ?? '')
      const projectCode =
        'projectCode' in row
          ? row.projectCode
          : ((row as DbRow).chessboard_documentation_mapping?.documentations?.code ?? '')
      setFloorModalInfo({
        projectCode,
        workName,
        material: row.material || '',
        unit: unitName,
      })
      setFloorModalRowKey(key)
      setFloorModalIsEdit(isEdit)
      setFloorModalData(data)
      setFloorModalOpen(true)
    },
    [editingRows, rows, tableData, units, costTypes],
  )

  const handleFloorModalChange = useCallback(
    (index: number, field: keyof FloorQuantity | 'floor', value: string | number) => {
      setFloorModalData((prev) =>
        prev.map((item, i) =>
          i === index
            ? { ...item, [field]: field === 'floor' ? Number(value) : String(value) }
            : item,
        ),
      )
    },
    [],
  )

  const addFloorModalRow = useCallback(() => {
    setFloorModalData((prev) => [
      ...prev,
      { floor: 0, quantityPd: '', quantitySpec: '', quantityRd: '' },
    ])
  }, [])

  const removeFloorModalRow = useCallback((index: number) => {
    setFloorModalData((prev) => prev.filter((_, i) => i !== index))
  }, [])

  const floorModalColumns = useMemo<ColumnsType<FloorModalRow>>(
    () => [
      {
        title: 'Этаж',
        dataIndex: 'floor',
        render: (_, record, index) =>
          floorModalIsEdit ? (
            <InputNumber
              value={record.floor}
              onChange={(value) => handleFloorModalChange(index, 'floor', value ?? 0)}
            />
          ) : (
            record.floor
          ),
      },
      {
        title: 'Кол-во по ПД',
        dataIndex: 'quantityPd',
        render: (_, record, index) =>
          floorModalIsEdit ? (
            <Input
              style={{ width: '10ch' }}
              value={record.quantityPd}
              onChange={(e) => handleFloorModalChange(index, 'quantityPd', e.target.value)}
            />
          ) : (
            record.quantityPd
          ),
      },
      {
        title: 'Кол-во по спеке РД',
        dataIndex: 'quantitySpec',
        render: (_, record, index) =>
          floorModalIsEdit ? (
            <Input
              style={{ width: '10ch' }}
              value={record.quantitySpec}
              onChange={(e) => handleFloorModalChange(index, 'quantitySpec', e.target.value)}
            />
          ) : (
            record.quantitySpec
          ),
      },
      {
        title: 'Кол-во по пересчету РД',
        dataIndex: 'quantityRd',
        render: (_, record, index) =>
          floorModalIsEdit ? (
            <Input
              style={{ width: '10ch' }}
              value={record.quantityRd}
              onChange={(e) => handleFloorModalChange(index, 'quantityRd', e.target.value)}
            />
          ) : (
            record.quantityRd
          ),
      },
      ...(floorModalIsEdit
        ? [
            {
              title: '',
              dataIndex: 'actions',
              render: (_: unknown, __: unknown, index: number) => (
                <Button
                  type="text"
                  icon={<DeleteOutlined />}
                  onClick={() => removeFloorModalRow(index)}
                />
              ),
            },
          ]
        : []),
    ],
    [floorModalIsEdit, handleFloorModalChange, removeFloorModalRow],
  )

  const saveFloorModal = useCallback(() => {
    if (!floorModalRowKey) return
    const map: FloorQuantities = {}
    const floorNums: number[] = []
    floorModalData.forEach((d) => {
      const num = Number(d.floor)
      if (!isNaN(num)) {
        floorNums.push(num)
        map[num] = {
          quantityPd: d.quantityPd,
          quantitySpec: d.quantitySpec,
          quantityRd: d.quantityRd,
        }
      }
    })
    floorNums.sort((a, b) => a - b)
    const floorsStr = formatFloorsString(floorNums)
    const totalPd = floorModalData.reduce((s, d) => s + (parseFloat(d.quantityPd) || 0), 0)
    const totalSpec = floorModalData.reduce((s, d) => s + (parseFloat(d.quantitySpec) || 0), 0)
    const totalRd = floorModalData.reduce((s, d) => s + (parseFloat(d.quantityRd) || 0), 0)
    if (floorModalIsEdit && editingRows[floorModalRowKey]) {
      setEditingRows((prev) => ({
        ...prev,
        [floorModalRowKey]: {
          ...prev[floorModalRowKey],
          floors: floorsStr,
          quantityPd: totalPd ? String(totalPd) : '',
          quantitySpec: totalSpec ? String(totalSpec) : '',
          quantityRd: totalRd ? String(totalRd) : '',
          floorQuantities: map,
        },
      }))
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.key === floorModalRowKey
            ? {
                ...r,
                floors: floorsStr,
                quantityPd: totalPd ? String(totalPd) : '',
                quantitySpec: totalSpec ? String(totalSpec) : '',
                quantityRd: totalRd ? String(totalRd) : '',
                floorQuantities: map,
              }
            : r,
        ),
      )
    }
    setFloorModalOpen(false)
  }, [floorModalRowKey, floorModalData, floorModalIsEdit, editingRows, setEditingRows, setRows])

  const cancelFloorModal = useCallback(() => setFloorModalOpen(false), [])

  const startAdd = useCallback(() => {
    if (!appliedFilters) return
    const defaultLocationId = appliedFilters.typeId
      ? String(costTypes?.find((t) => String(t.id) === appliedFilters.typeId)?.location_id ?? '')
      : ''
    const blockName = appliedFilters.blockId
      ? (blocks?.find((b) => b.id === appliedFilters.blockId)?.name ?? '')
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
      const mapping = getNomenclatureMapping(dbRow.chessboard_nomenclature_mapping)
      const nomenclatureId = mapping?.nomenclature_id ?? ''
      const supplierName = mapping?.supplier_name ?? ''
      setEditingRows((prev) => {
        if (prev[id]) return prev
        return {
          ...prev,
          [id]: {
            key: id,
            materialId: dbRow.material ?? '',
            material: dbRow.materials?.name ?? '',
            quantityPd: dbRow.floorQuantities
              ? String(
                  Object.values(dbRow.floorQuantities).reduce(
                    (s, q) => s + (parseFloat(q.quantityPd) || 0),
                    0,
                  ),
                )
              : '',
            quantitySpec: dbRow.floorQuantities
              ? String(
                  Object.values(dbRow.floorQuantities).reduce(
                    (s, q) => s + (parseFloat(q.quantitySpec) || 0),
                    0,
                  ),
                )
              : '',
            quantityRd: dbRow.floorQuantities
              ? String(
                  Object.values(dbRow.floorQuantities).reduce(
                    (s, q) => s + (parseFloat(q.quantityRd) || 0),
                    0,
                  ),
                )
              : '',
            nomenclatureId,
            supplier: supplierName,
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
            rateId: dbRow.chessboard_rates_mapping?.[0]?.rate_id
              ? String(dbRow.chessboard_rates_mapping[0].rate_id)
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
            floorQuantities: dbRow.floorQuantities,
          },
        }
      })
      void loadSupplierOptions(nomenclatureId, id, supplierName)
    },
    [tableData, loadSupplierOptions],
  )

  const handleUpdate = useCallback(async () => {
    if (!supabase || Object.keys(editingRows).length === 0) return

    // Параллельное выполнение всех обновлений
    const updatePromises = Object.values(editingRows).map(async (r) => {
      let materialId = r.materialId
      if (!materialId && r.material) {
        const material = await materialsApi.ensure(r.material)
        materialId = material.uuid
      }
      const updateChessboard = supabase!
        .from('chessboard')
        .update({
          material: materialId,
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
        await supabase!.from('chessboard_floor_mapping').delete().eq('chessboard_id', r.key)

        // Парсим строку этажей и добавляем новые
        const floors = parseFloorsString(r.floors)
        const floorQuantities = r.floorQuantities
        if (floors.length > 0) {
          const totalFloors = floors.length
          const floorMappings = floors.map((floor) => ({
            chessboard_id: r.key,
            floor_number: floor,
            quantityPd: floorQuantities?.[floor]?.quantityPd
              ? Number(floorQuantities[floor].quantityPd)
              : r.quantityPd
                ? Number(r.quantityPd) / totalFloors
                : null,
            quantitySpec: floorQuantities?.[floor]?.quantitySpec
              ? Number(floorQuantities[floor].quantitySpec)
              : r.quantitySpec
                ? Number(r.quantitySpec) / totalFloors
                : null,
            quantityRd: floorQuantities?.[floor]?.quantityRd
              ? Number(floorQuantities[floor].quantityRd)
              : r.quantityRd
                ? Number(r.quantityRd) / totalFloors
                : null,
          }))
          await supabase!.from('chessboard_floor_mapping').insert(floorMappings)
        } else {
          const qty = floorQuantities?.[0]
          await supabase!.from('chessboard_floor_mapping').insert({
            chessboard_id: r.key,
            location_id: r.locationId ? Number(r.locationId) : null,
            quantityPd: qty?.quantityPd
              ? Number(qty.quantityPd)
              : r.quantityPd
                ? Number(r.quantityPd)
                : null,
            quantitySpec: qty?.quantitySpec
              ? Number(qty.quantitySpec)
              : r.quantitySpec
                ? Number(r.quantitySpec)
                : null,
            quantityRd: qty?.quantityRd
              ? Number(qty.quantityRd)
              : r.quantityRd
                ? Number(r.quantityRd)
                : null,
          })
        }
      }

      // Обновляем связь с номенклатурой
      const updateNomenclatureMapping = async () => {
        await supabase!.from('chessboard_nomenclature_mapping').delete().eq('chessboard_id', r.key)
        if (r.nomenclatureId) {
          await supabase!.from('chessboard_nomenclature_mapping').insert({
            chessboard_id: r.key,
            nomenclature_id: r.nomenclatureId,
            supplier_name: r.supplier || null,
          })
        }
      }

      // Обновляем связь с документацией
      const updateDocumentationMapping = async () => {
        let docId = r.documentationId

        // Если документация не выбрана, но есть тэг и шифр проекта, создаём её
        if (!docId && r.projectCode && r.tagId) {
          const doc = await documentationApi.upsertDocumentation(
            r.projectCode,
            Number(r.tagId),
            appliedFilters?.projectId,
          )
          docId = doc.id
        }

        if (docId) {
          await supabase!.from('chessboard_documentation_mapping').upsert(
            {
              chessboard_id: r.key,
              documentation_id: docId,
            },
            { onConflict: 'chessboard_id' },
          )
        } else {
          // Если ни документация, ни шифр проекта не выбраны, удаляем связь
          await supabase!
            .from('chessboard_documentation_mapping')
            .delete()
            .eq('chessboard_id', r.key)
        }
      }

      // Обновляем связь с расценками
      const updateRateMapping = async () => {
        // Сначала удаляем текущую связь, чтобы исключить конфликт ключей
        await supabase!.from('chessboard_rates_mapping').delete().eq('chessboard_id', r.key)

        // Если расценка выбрана, создаём новую запись
        if (r.rateId) {
          await supabase!.from('chessboard_rates_mapping').insert({
            chessboard_id: r.key,
            rate_id: r.rateId,
          })
        }
      }

      return Promise.all([
        updateChessboard,
        updateMapping,
        updateNomenclatureMapping(),
        updateFloors(),
        updateDocumentationMapping(),
        updateRateMapping(),
      ])
    })

    try {
      await Promise.all(updatePromises)
      await refetchMaterials()
      message.success('Изменения сохранены')
      setEditingRows({})
      await refetch()
    } catch (error: unknown) {
      message.error(`Не удалось сохранить изменения: ${(error as Error).message}`)
    }
  }, [editingRows, message, refetch, appliedFilters, refetchMaterials])

  const handleCancelEdit = useCallback(() => {
    setEditingRows({})
  }, [])

  const handleDelete = useCallback(
    async (id: string) => {
      if (!supabase) return
      const { error: rateMapError } = await supabase
        .from('chessboard_rates_mapping')
        .delete()
        .eq('chessboard_id', id)
      if (rateMapError) {
        message.error(`Не удалось удалить связи: ${rateMapError.message}`)
        return
      }
      const { error: mapError } = await supabase
        .from('chessboard_mapping')
        .delete()
        .eq('chessboard_id', id)
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
        unit_id: string | null
      }[] = []
      const quantities: (number | null)[] = []
      const header = rows[0]?.map((h) => String(h || '').toLowerCase()) ?? []
      const materialIdx = header.findIndex((h) => h.includes('материал'))
      const quantityIdx = header.findIndex((h) => h.includes('кол'))
      const unitIdx = header.findIndex((h) => h.includes('ед'))
      const materialMap: Record<string, string> = {}
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i]
        const materialCol = materialIdx >= 0 ? materialIdx : 0
        const material = row[materialCol] != null ? String(row[materialCol]).trim() : ''
        if (!material) continue

        if (!materialMap[material]) {
          const m = await materialsApi.ensure(material)
          materialMap[material] = m.uuid
        }
        const materialId = materialMap[material]

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
          material: materialId,
          unit_id: unitId,
        })
        quantities.push(quantity)
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
      const { error: mapError } = await supabase!.from('chessboard_mapping').insert(mappings)
      if (mapError) throw mapError
      const floorMappings = inserted.map((d, idx) => ({
        chessboard_id: d.id,
        location_id: importState.locationId ? Number(importState.locationId) : null,
        quantityPd: null,
        quantitySpec: quantities[idx],
        quantityRd: null,
      }))
      if (floorMappings.length > 0) {
        await supabase!.from('chessboard_floor_mapping').insert(floorMappings)
      }
      await refetchMaterials()
      message.success('Импорт завершен')
      setImportOpen(false)
      setImportFile(null)
      setImportState({})
      await refetch()
    } catch (e) {
      message.error(`Не удалось импортировать: ${(e as Error).message}`)
    }
  }, [importFile, importState, message, refetch, units, refetchMaterials])

  const handleSave = async () => {
    if (!supabase || !appliedFilters) return
    const payload = await Promise.all(
      rows.map(async (r) => {
        let materialId = r.materialId
        if (!materialId && r.material) {
          const m = await materialsApi.ensure(r.material)
          materialId = m.uuid
        }
        return {
          project_id: appliedFilters.projectId,
          material: materialId,
          unit_id: r.unitId || null,
          color: r.color || null,
        }
      }),
    )
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

    const nomenclatureMappings = data
      .map((d, idx) =>
        rows[idx].nomenclatureId
          ? { chessboard_id: d.id, nomenclature_id: rows[idx].nomenclatureId }
          : null,
      )
      .filter((m): m is { chessboard_id: string; nomenclature_id: string } => m !== null)
    if (nomenclatureMappings.length) {
      const { error: nomError } = await supabase
        .from('chessboard_nomenclature_mapping')
        .insert(nomenclatureMappings)
      if (nomError) {
        message.error(`Не удалось сохранить номенклатуру: ${nomError.message}`)
        return
      }
    }

    const rateMappings = data
      .map((d, idx) =>
        rows[idx].rateId
          ? {
              chessboard_id: d.id,
              rate_id: rows[idx].rateId,
            }
          : null,
      )
      .filter((m): m is { chessboard_id: string; rate_id: string } => !!m)
    if (rateMappings.length > 0) {
      const { error: rateError } = await supabase
        .from('chessboard_rates_mapping')
        .insert(rateMappings)
      if (rateError) {
        message.error(`Не удалось сохранить связи с расценками: ${rateError.message}`)
        return
      }
    }

    // Сохраняем этажи или локации
    for (let idx = 0; idx < data.length; idx++) {
      const floors = parseFloorsString(rows[idx].floors)
      const floorQuantities = rows[idx].floorQuantities
      if (floors.length > 0) {
        const totalFloors = floors.length
        const floorMappings = floors.map((floor) => ({
          chessboard_id: data[idx].id,
          floor_number: floor,
          quantityPd: floorQuantities?.[floor]?.quantityPd
            ? Number(floorQuantities[floor].quantityPd)
            : rows[idx].quantityPd
              ? Number(rows[idx].quantityPd) / totalFloors
              : null,
          quantitySpec: floorQuantities?.[floor]?.quantitySpec
            ? Number(floorQuantities[floor].quantitySpec)
            : rows[idx].quantitySpec
              ? Number(rows[idx].quantitySpec) / totalFloors
              : null,
          quantityRd: floorQuantities?.[floor]?.quantityRd
            ? Number(floorQuantities[floor].quantityRd)
            : rows[idx].quantityRd
              ? Number(rows[idx].quantityRd) / totalFloors
              : null,
        }))
        const { error: floorError } = await supabase
          .from('chessboard_floor_mapping')
          .insert(floorMappings)
        if (floorError) {
          console.error(`Не удалось сохранить этажи: ${floorError.message}`)
        }
      } else {
        const qty = floorQuantities?.[0]
        const { error: floorError } = await supabase.from('chessboard_floor_mapping').insert({
          chessboard_id: data[idx].id,
          location_id: rows[idx].locationId ? Number(rows[idx].locationId) : null,
          quantityPd: qty?.quantityPd
            ? Number(qty.quantityPd)
            : rows[idx].quantityPd
              ? Number(rows[idx].quantityPd)
              : null,
          quantitySpec: qty?.quantitySpec
            ? Number(qty.quantitySpec)
            : rows[idx].quantitySpec
              ? Number(rows[idx].quantitySpec)
              : null,
          quantityRd: qty?.quantityRd
            ? Number(qty.quantityRd)
            : rows[idx].quantityRd
              ? Number(rows[idx].quantityRd)
              : null,
        })
        if (floorError) {
          console.error(`Не удалось сохранить локацию: ${floorError.message}`)
        }
      }
    }

    // Сохраняем связь с документацией
    for (let idx = 0; idx < data.length; idx++) {
      let docId = rows[idx].documentationId

      if (!docId && rows[idx].projectCode && rows[idx].tagId) {
        const doc = await documentationApi.upsertDocumentation(
          rows[idx].projectCode || '',
          Number(rows[idx].tagId),
          appliedFilters.projectId || '',
        )
        docId = doc.id
      }

      if (docId) {
        const { error: docError } = await supabase.from('chessboard_documentation_mapping').insert({
          chessboard_id: data[idx].id,
          documentation_id: docId,
        })
        if (docError) {
          console.error(`Не удалось сохранить связь с документацией: ${docError.message}`)
        }
      }
    }
    await refetchMaterials()
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
      nomenclatureId: 'nomenclature',
      supplier: 'supplier',
      unitId: 'unit',
      block: 'block',
      costCategoryId: 'costCategory',
      costTypeId: 'costType',
      locationId: 'location',
      rateId: 'workName',
    }

    const base: Array<{
      title: string
      dataIndex: keyof TableRow
      width?: number
      align?: 'left' | 'right' | 'center'
    }> = [
      { title: 'Раздел', dataIndex: 'tagName', width: 200 },
      { title: 'Шифр проекта', dataIndex: 'projectCode', width: 150 },
      { title: 'Материал', dataIndex: 'material', width: 300 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd', width: 120, align: 'center' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec', width: 150, align: 'center' },
      {
        title: 'Кол-во по пересчету РД',
        dataIndex: 'quantityRd',
        width: 180,
        align: 'center',
      },
      { title: 'Номенклатура', dataIndex: 'nomenclatureId', width: 250 },
      { title: 'Наименование поставщика', dataIndex: 'supplier', width: 250 },
      { title: 'Ед.изм.', dataIndex: 'unitId', width: 160 },
      { title: 'Корпус', dataIndex: 'block', width: 120 },
      { title: 'Этажи', dataIndex: 'floors', width: 150 },
      { title: 'Категория затрат', dataIndex: 'costCategoryId', width: 200 },
      { title: 'Вид затрат', dataIndex: 'costTypeId', width: 200 },
      { title: 'Наименование работ', dataIndex: 'rateId', width: 300 },
      { title: 'Локализация', dataIndex: 'locationId', width: 200 },
    ]

    const dataColumns = base
      .filter((col) => {
        // Проверяем видимость столбца
        const key = map[col.dataIndex] || (col.dataIndex as string)
        if (columnVisibility[key] === false) {
          return false
        }
        // Старая логика для обратной совместимости
        const collapseKey = collapseMap[key]
        return collapseKey ? !hiddenCols[collapseKey] : true
      })
      .sort((a, b) => {
        // Сортируем столбцы согласно columnOrder
        const aKey = map[a.dataIndex] || (a.dataIndex as string)
        const bKey = map[b.dataIndex] || (b.dataIndex as string)
        const aIndex = columnOrder.indexOf(aKey)
        const bIndex = columnOrder.indexOf(bKey)
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
                    handleRowChange(
                      record.key,
                      'tagName',
                      tag ? `${tag.tag_number || ''} ${tag.name}`.trim() : '',
                    )
                    // Сбрасываем выбранный документ при смене тэга
                    handleRowChange(record.key, 'documentationId', '')
                    handleRowChange(record.key, 'projectCode', '')
                  }}
                  options={
                    documentationTags?.map((tag) => ({
                      value: String(tag.id),
                      label: `${tag.tag_number || ''} ${tag.name}`.trim(),
                    })) ?? []
                  }
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
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
                      const filteredDocs =
                        documentations?.filter(
                          (doc: DocumentationRecord) =>
                            !record.tagId || String(doc.tag_id) === record.tagId,
                        ) ?? []
                      console.log('🔽 ADD MODE - Project Code dropdown opened:', {
                        recordKey: record.key,
                        tagId: record.tagId,
                        totalDocs: documentations?.length ?? 0,
                        filteredDocs: filteredDocs.length,
                        availableOptions: filteredDocs.length,
                      })
                    }
                  }}
                  onChange={(value) => {
                    console.log('✏️ ADD MODE - Project Code selected:', {
                      value,
                      recordKey: record.key,
                    })
                    handleRowChange(record.key, 'documentationId', value)
                    const doc = documentations?.find((d: DocumentationRecord) => d.id === value)
                    handleRowChange(record.key, 'projectCode', doc?.project_code ?? '')
                  }}
                  options={
                    documentations
                      ?.filter((doc: DocumentationRecord) => {
                        const matches = !record.tagId || String(doc.tag_id) === record.tagId
                        console.log('🔍 ADD MODE - Filtering documentation:', {
                          docId: doc.id,
                          docCode: doc.project_code,
                          docTagId: doc.tag_id,
                          recordTagId: record.tagId,
                          matches,
                          docTagName: doc.tag_name,
                        })
                        return matches
                      })
                      .map((doc: DocumentationRecord) => ({
                        value: doc.id,
                        label: doc.project_code,
                      })) ?? []
                  }
                  disabled={!record.tagId}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              )
            case 'material':
              return (
                <AutoComplete
                  style={{ width: 300 }}
                  options={materialOptions}
                  value={record.material}
                  onSelect={(value, option) => {
                    handleRowChange(record.key, 'material', String(option?.label))
                    handleRowChange(record.key, 'materialId', String(value))
                  }}
                  onChange={(value) => {
                    handleRowChange(record.key, 'material', value)
                    handleRowChange(record.key, 'materialId', '')
                  }}
                  onBlur={() => handleMaterialBlur(record.key, record.material)}
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              )
            case 'quantityPd':
              return (
                <Space>
                  {parseFloorsString(record.floors).length > 1 && (
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => openFloorModal(record.key, true)}
                    />
                  )}
                  <Input
                    style={{ width: '10ch' }}
                    value={record.quantityPd}
                    onChange={(e) => handleRowChange(record.key, 'quantityPd', e.target.value)}
                  />
                </Space>
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
            case 'nomenclatureId':
              return (
                <Select
                  style={{ width: 250 }}
                  dropdownMatchSelectWidth={nomenclatureDropdownWidth}
                  value={record.nomenclatureId}
                  onChange={(value) => {
                    handleRowChange(record.key, 'nomenclatureId', value)
                    loadSupplierOptions(value, record.key)
                    handleRowChange(record.key, 'supplier', '')
                  }}
                  options={getNomenclatureSelectOptions(record.nomenclatureId)}
                  showSearch
                  onSearch={handleNomenclatureSearch}
                  filterOption={false}
                  allowClear
                />
              )
            case 'supplier':
              return (
                <Select
                  style={{ width: 250 }}
                  dropdownMatchSelectWidth={supplierDropdownWidths[record.key] ?? 250}
                  value={record.supplier || undefined}
                  onChange={(value) => handleRowChange(record.key, 'supplier', value)}
                  options={supplierOptions[record.key] ?? []}
                  disabled={!record.nomenclatureId}
                  showSearch
                  optionFilterProp="label"
                  allowClear
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
                    handleRowChange(record.key, 'rateId', '')
                  }}
                  showSearch
                  optionFilterProp="label"
                  options={
                    costCategories
                      ?.filter(
                        (c) =>
                          !appliedFilters?.categoryId || String(c.id) === appliedFilters.categoryId,
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
                    handleRowChange(record.key, 'rateId', '')
                  }}
                  showSearch
                  optionFilterProp="label"
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
            case 'rateId':
              return (
                <Select
                  style={{ width: 300 }}
                  value={record.rateId || undefined}
                  onChange={(value) => handleRowChange(record.key, 'rateId', value)}
                  options={getRateOptions(record.costTypeId, record.costCategoryId)}
                  placeholder="Наименование работ"
                  showSearch
                  optionFilterProp="label"
                  allowClear
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
                          const selectedType = costTypes?.find(
                            (t) => String(t.id) === record.costTypeId,
                          )
                          if (selectedType) {
                            // Находим все виды затрат с таким же названием
                            const sameNameTypes = costTypes?.filter(
                              (t) => t.name === selectedType.name,
                            )
                            // Получаем все location_id для этих видов затрат
                            const availableLocationIds = sameNameTypes?.map((t) =>
                              String(t.location_id),
                            )
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

        return { ...col, filters, filterSearch: true, sorter, onFilter, render }
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
                <RowColorPicker
                  value={record.color}
                  onChange={(c) => handleRowChange(record.key, 'color', c)}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => addRow(index)}
                  style={{ padding: '2px 4px' }}
                />
                <Button
                  type="text"
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => copyRow(index)}
                  style={{ padding: '2px 4px' }}
                />
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
    deleteRow,
    rows,
    hiddenCols,
    columnVisibility,
    columnOrder,
    nomenclatureDropdownWidth,
    getRateOptions,
    openFloorModal,
    supplierOptions,
    supplierDropdownWidths,
    loadSupplierOptions,
    getNomenclatureSelectOptions,
    materialOptions,
    handleMaterialBlur,
  ])

  const viewColumns: ColumnsType<ViewRow> = useMemo(() => {
    // Чекбокс колонка для режима удаления
    const checkboxColumn: ColumnType<ViewRow> | null = deleteMode
      ? {
          title: '',
          dataIndex: 'checkbox',
          width: 50,
          fixed: 'left',
          render: (_: unknown, record: ViewRow) => (
            <Checkbox
              checked={selectedRows.has(record.key)}
              onChange={() => toggleRowSelection(record.key)}
            />
          ),
        }
      : null

    const base: Array<{
      title: string
      dataIndex: string
      width?: number
      align?: 'left' | 'right' | 'center'
    }> = [
      { title: 'Раздел', dataIndex: 'tagName', width: 200 },
      { title: 'Шифр проекта', dataIndex: 'projectCode', width: 150 },
      { title: 'Материал', dataIndex: 'material', width: 300 },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd', width: 120, align: 'center' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec', width: 150, align: 'center' },
      {
        title: 'Кол-во по пересчету РД',
        dataIndex: 'quantityRd',
        width: 180,
        align: 'center',
      },
      { title: 'Номенклатура', dataIndex: 'nomenclature', width: 250 },
      { title: 'Наименование поставщика', dataIndex: 'supplier', width: 250 },
      { title: 'Ед.изм.', dataIndex: 'unit', width: 160 },
      { title: 'Корпус', dataIndex: 'block', width: 120 },
      { title: 'Этажи', dataIndex: 'floors', width: 150 },
      { title: 'Категория затрат', dataIndex: 'costCategory', width: 200 },
      { title: 'Вид затрат', dataIndex: 'costType', width: 200 },
      { title: 'Наименование работ', dataIndex: 'workName', width: 300 },
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
          if (!edit) {
            if (
              ['quantityPd', 'quantitySpec', 'quantityRd'].includes(col.dataIndex) &&
              parseFloorsString(record.floors).length > 1 &&
              record[col.dataIndex as keyof ViewRow]
            ) {
              return (
                <Button
                  type="link"
                  style={{ padding: 0 }}
                  onClick={() => openFloorModal(record.key, false)}
                >
                  {record[col.dataIndex as keyof ViewRow]}
                </Button>
              )
            }
            return record[col.dataIndex as keyof ViewRow]
          }
          switch (col.dataIndex) {
            case 'tagName':
              return (
                <Select
                  style={{ width: 200 }}
                  value={edit.tagId}
                  onChange={(value) => {
                    handleEditChange(record.key, 'tagId', value)
                    const tag = documentationTags?.find((t) => String(t.id) === value)
                    handleEditChange(
                      record.key,
                      'tagName',
                      tag ? `${tag.tag_number || ''} ${tag.name}`.trim() : '',
                    )
                    // Сбрасываем выбранный документ при смене тэга
                    handleEditChange(record.key, 'documentationId', '')
                    handleEditChange(record.key, 'projectCode', '')
                  }}
                  options={
                    documentationTags?.map((tag) => ({
                      value: String(tag.id),
                      label: `${tag.tag_number || ''} ${tag.name}`.trim(),
                    })) ?? []
                  }
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
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
                      const filteredDocs =
                        documentations?.filter(
                          (doc: DocumentationRecord) =>
                            !edit.tagId || String(doc.tag_id) === edit.tagId,
                        ) ?? []
                      console.log('🔽 EDIT MODE - Project Code dropdown opened:', {
                        recordKey: record.key,
                        tagId: edit.tagId,
                        totalDocs: documentations?.length ?? 0,
                        filteredDocs: filteredDocs.length,
                        availableOptions: filteredDocs.length,
                      })
                    }
                  }}
                  onChange={(value) => {
                    console.log('✏️ EDIT MODE - Project Code selected:', {
                      value,
                      recordKey: record.key,
                    })
                    handleEditChange(record.key, 'documentationId', value)
                    const doc = documentations?.find((d: DocumentationRecord) => d.id === value)
                    handleEditChange(record.key, 'projectCode', doc?.project_code ?? '')
                  }}
                  options={
                    documentations
                      ?.filter((doc: DocumentationRecord) => {
                        const matches = !edit.tagId || String(doc.tag_id) === edit.tagId
                        console.log('🔍 EDIT MODE - Filtering documentation:', {
                          docId: doc.id,
                          docCode: doc.project_code,
                          docTagId: doc.tag_id,
                          editTagId: edit.tagId,
                          matches,
                          docTagName: doc.tag_name,
                        })
                        return matches
                      })
                      .map((doc: DocumentationRecord) => ({
                        value: doc.id,
                        label: doc.project_code,
                      })) ?? []
                  }
                  disabled={!edit.tagId}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              )
            case 'material':
              return (
                <AutoComplete
                  style={{ width: 300 }}
                  options={materialOptions}
                  value={edit.material}
                  onSelect={(value, option) => {
                    handleEditChange(record.key, 'material', String(option?.label))
                    handleEditChange(record.key, 'materialId', String(value))
                  }}
                  onChange={(value) => {
                    handleEditChange(record.key, 'material', value)
                    handleEditChange(record.key, 'materialId', '')
                  }}
                  onBlur={() => handleMaterialBlur(record.key, edit.material)}
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              )
            case 'quantityPd':
              return (
                <Space>
                  {parseFloorsString(edit.floors).length > 1 && (
                    <Button
                      type="text"
                      icon={<PlusOutlined />}
                      onClick={() => openFloorModal(record.key, true)}
                    />
                  )}
                  <Input
                    style={{ width: '10ch' }}
                    value={edit.quantityPd}
                    onChange={(e) => handleEditChange(record.key, 'quantityPd', e.target.value)}
                  />
                </Space>
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
            case 'nomenclature':
              return (
                <Select
                  style={{ width: 250 }}
                  dropdownMatchSelectWidth={nomenclatureDropdownWidth}
                  value={edit.nomenclatureId}
                  onChange={(value) => {
                    handleEditChange(record.key, 'nomenclatureId', value)
                    loadSupplierOptions(value, record.key)
                    handleEditChange(record.key, 'supplier', '')
                  }}
                  options={getNomenclatureSelectOptions(edit.nomenclatureId, record.nomenclature)}
                  showSearch
                  onSearch={handleNomenclatureSearch}
                  filterOption={false}
                  allowClear
                />
              )
            case 'supplier':
              return (
                <Select
                  style={{ width: 250 }}
                  dropdownMatchSelectWidth={supplierDropdownWidths[record.key] ?? 250}
                  value={edit.supplier || undefined}
                  onChange={(value) => handleEditChange(record.key, 'supplier', value)}
                  options={supplierOptions[record.key] ?? []}
                  disabled={!edit.nomenclatureId}
                  showSearch
                  optionFilterProp="label"
                  allowClear
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
                    handleEditChange(record.key, 'rateId', '')
                  }}
                  popupMatchSelectWidth={false}
                  showSearch
                  optionFilterProp="label"
                  options={
                    costCategories
                      ?.sort((a, b) => {
                        // Сортируем по номеру, если он есть
                        if (
                          a.number !== undefined &&
                          a.number !== null &&
                          b.number !== undefined &&
                          b.number !== null
                        ) {
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
                    handleEditChange(record.key, 'rateId', '')
                  }}
                  showSearch
                  optionFilterProp="label"
                  options={
                    costTypes
                      ?.filter((t) => t.cost_category_id === Number(edit.costCategoryId))
                      .map((t) => ({ value: String(t.id), label: t.name })) ?? []
                  }
                />
              )
            case 'workName':
              return (
                <Select
                  style={{ width: 300 }}
                  value={edit.rateId || undefined}
                  onChange={(value) => handleEditChange(record.key, 'rateId', value)}
                  options={getRateOptions(edit.costTypeId, edit.costCategoryId)}
                  placeholder="Наименование работ"
                  showSearch
                  optionFilterProp="label"
                  allowClear
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
                          const selectedType = costTypes?.find(
                            (t) => String(t.id) === edit.costTypeId,
                          )
                          if (selectedType) {
                            // Находим все виды затрат с таким же названием
                            const sameNameTypes = costTypes?.filter(
                              (t) => t.name === selectedType.name,
                            )
                            // Получаем все location_id для этих видов затрат
                            const availableLocationIds = sameNameTypes?.map((t) =>
                              String(t.location_id),
                            )
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
              return record[col.dataIndex as keyof ViewRow]
          }
        }

        return {
          ...col,
          filterSearch: true,
          sorter: (a: ViewRow, b: ViewRow) => {
            const dataIndex = col.dataIndex as keyof ViewRow
            const aVal = a[dataIndex]
            const bVal = b[dataIndex]
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
        render: (_: unknown, record: ViewRow) => {
          const edit = editingRows[record.key]
          return edit ? (
            <RowColorPicker
              value={edit.color}
              onChange={(c) => handleEditChange(record.key, 'color', c)}
            />
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
        render: (_: unknown, record: ViewRow) => {
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
    getRateOptions,
    openFloorModal,
    nomenclatureDropdownWidth,
    supplierOptions,
    supplierDropdownWidths,
    loadSupplierOptions,
    getNomenclatureSelectOptions,
    materialOptions,
    handleMaterialBlur,
  ])

  const { Text } = Typography

  // Инициализация порядка и видимости столбцов
  const allColumns = useMemo(
    () => [
      { key: 'tagName', title: 'Раздел' },
      { key: 'projectCode', title: 'Шифр проекта' },
      { key: 'block', title: 'Корпус' },
      { key: 'floors', title: 'Этажи' },
      { key: 'costCategory', title: 'Категория затрат' },
      { key: 'costType', title: 'Вид затрат' },
      { key: 'workName', title: 'Наименование работ' },
      { key: 'location', title: 'Локализация' },
      { key: 'material', title: 'Материал' },
      { key: 'quantityPd', title: 'Кол-во по ПД' },
      { key: 'quantitySpec', title: 'Кол-во по спеке РД' },
      { key: 'quantityRd', title: 'Кол-во по пересчету РД' },
      { key: 'nomenclature', title: 'Номенклатура' },
      { key: 'supplier', title: 'Наименование поставщика' },
      { key: 'unit', title: 'Ед.изм.' },
    ],
    [],
  )

  // Инициализация состояния видимости столбцов при первой загрузке
  useMemo(() => {
    // Попытка загрузить из localStorage
    const savedVisibility = localStorage.getItem('chessboard-column-visibility')
    // Сброс устаревшего ключа порядка столбцов
    localStorage.removeItem('chessboard-column-order')
    const savedOrder = localStorage.getItem('chessboard-column-order-v2')

    if (savedVisibility && Object.keys(columnVisibility).length === 0) {
      try {
        const parsed = JSON.parse(savedVisibility)
        // Проверяем, есть ли новые столбцы, которых нет в сохраненных настройках
        let hasNewColumns = false
        allColumns.forEach((col) => {
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
        allColumns.forEach((col) => {
          initialVisibility[col.key] = true
        })
        setColumnVisibility(initialVisibility)
      }
    } else if (Object.keys(columnVisibility).length === 0) {
      const initialVisibility: Record<string, boolean> = {}
      allColumns.forEach((col) => {
        initialVisibility[col.key] = true
      })
      setColumnVisibility(initialVisibility)
    }

    if (savedOrder && columnOrder.length === 0) {
      try {
        const parsed = JSON.parse(savedOrder)
        // Добавляем новые столбцы, которых нет в сохраненном порядке
        const missingColumns = allColumns.filter((col) => !parsed.includes(col.key))
        // Добавляем новые столбцы в начало (tagName и projectCode должны быть первыми)
        if (missingColumns.length > 0) {
          const tagNameCol = missingColumns.find((c) => c.key === 'tagName')
          const projectCodeCol = missingColumns.find((c) => c.key === 'projectCode')
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
          newOrder.push(...missingColumns.map((c) => c.key))

          setColumnOrder(newOrder)
          // Обновляем localStorage
          localStorage.setItem('chessboard-column-order-v2', JSON.stringify(newOrder))
        } else {
          setColumnOrder(parsed)
        }
      } catch {
        setColumnOrder(allColumns.map((c) => c.key))
      }
    } else if (columnOrder.length === 0) {
      setColumnOrder(allColumns.map((c) => c.key))
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
      localStorage.setItem('chessboard-column-order-v2', JSON.stringify(columnOrder))
    }
  }, [columnOrder])

  const moveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    setColumnOrder((prev) => {
      const index = prev.indexOf(key)
      if (index === -1) return prev

      const newOrder = [...prev]
      if (direction === 'up' && index > 0) {
        ;[newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]]
      } else if (direction === 'down' && index < prev.length - 1) {
        ;[newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]]
      }
      return newOrder
    })
  }, [])

  const toggleColumnVisibility = useCallback((key: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }, [])

  const selectAllColumns = useCallback(
    (select: boolean) => {
      const newVisibility: Record<string, boolean> = {}
      allColumns.forEach((col) => {
        newVisibility[col.key] = select
      })
      setColumnVisibility(newVisibility)
    },
    [allColumns],
  )

  const resetToDefaults = useCallback(() => {
    // Сброс видимости - все столбцы видимы
    const defaultVisibility: Record<string, boolean> = {}
    allColumns.forEach((col) => {
      defaultVisibility[col.key] = true
    })
    setColumnVisibility(defaultVisibility)

    // Сброс порядка - исходный порядок
    setColumnOrder(allColumns.map((c) => c.key))

    // Очистка localStorage
    localStorage.removeItem('chessboard-column-visibility')
    localStorage.removeItem('chessboard-column-order')
    localStorage.removeItem('chessboard-column-order-v2')
  }, [allColumns])

  // Применение порядка и видимости к столбцам таблицы
  const orderedViewColumns = useMemo(() => {
    const columnsMap: Record<string, ColumnType<ViewRow>> = {}

    viewColumns.forEach((col) => {
      if (col && 'dataIndex' in col) {
        columnsMap[col.dataIndex as string] = col
      }
    })

    // Служебные столбцы
    const actionsColumn = columnsMap['actions']
    const colorColumn = columnsMap['color']

    // Сначала фильтруем столбцы по видимости и порядку
    const orderedCols = columnOrder
      .filter((key) => {
        // Служебные колонки не включаем в основную сортировку
        if (key === 'checkbox' || key === 'color' || key === 'actions' || key === 'add')
          return false
        return columnVisibility[key] !== false
      })
      .map((key) => columnsMap[key])
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
    const columnsMap: Record<string, ColumnType<TableRow>> = {}

    addColumns.forEach((col) => {
      if (col && 'dataIndex' in col) {
        const dataIndex = col.dataIndex as string
        // Маппинг для соответствия между addColumns и настройками столбцов
        const mappedKey =
          dataIndex === 'unitId'
            ? 'unit'
            : dataIndex === 'costCategoryId'
              ? 'costCategory'
              : dataIndex === 'costTypeId'
                ? 'costType'
                : dataIndex === 'locationId'
                  ? 'location'
                  : dataIndex === 'rateId'
                    ? 'workName'
                    : dataIndex === 'nomenclatureId'
                      ? 'nomenclature'
                      : dataIndex
        columnsMap[mappedKey] = col
      }
    })

    // Служебные колонки (действия) всегда добавляются в начало и конец
    const actionsColumn = columnsMap['actions']
    const editActionsColumn = columnsMap['editActions']

    // Применяем порядок и видимость к остальным колонкам
    const orderedDataCols = columnOrder
      .filter((key) => {
        return (
          columnVisibility[key] !== false &&
          columnsMap[key] &&
          key !== 'actions' &&
          key !== 'editActions'
        )
      })
      .map((key) => columnsMap[key])
      .filter(Boolean)

    // Собираем итоговый массив колонок
    const result = []
    if (actionsColumn) result.push(actionsColumn)
    result.push(...orderedDataCols)
    if (editActionsColumn) result.push(editActionsColumn)

    return result
  }, [addColumns, columnOrder, columnVisibility])

  const handleExport = useCallback(() => {
    const data = viewRows.map((row) => {
      const record: Record<string, string> = {}
      const rowRecord = row as unknown as Record<string, string>
      allColumns.forEach((col) => {
        record[col.title] = rowRecord[col.key] ?? ''
      })
      return record
    })

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Шахматка')
    XLSX.writeFile(workbook, 'chessboard.xlsx')
  }, [viewRows, allColumns])

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',

        position: 'relative',
        minHeight: 0,
      }}
    >
      <div className="filters" style={{ flexShrink: 0, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Space align="center" size="middle">
            <Text style={{ fontSize: '16px' }}>Объект:</Text>
            <Select
              placeholder="Выберите проект"
              style={{ width: 280 * scale }}
              size="large"
              allowClear
              value={filters.projectId}
              onChange={(value) => setFilters({ projectId: value })}
              options={
                projects?.map((p) => ({
                  value: p.id,
                  label: <span style={{ fontWeight: 'bold' }}>{p.name}</span>,
                })) ?? []
              }
              showSearch
              filterOption={(input, option) => {
                const label = option?.label
                return String(label ?? '')
                  .toLowerCase()
                  .includes(input.toLowerCase())
              }}
            />
            <Button type="primary" size="large" onClick={handleApply} disabled={!filters.projectId}>
              Применить
            </Button>
            <Badge
              count={
                [
                  filters.blockId,
                  filters.categoryId,
                  filters.typeId,
                  filters.tagId,
                  filters.documentationId,
                ].filter(Boolean).length
              }
              size="small"
              style={{ marginRight: '8px' }}
            >
              <Button
                type={filtersExpanded ? 'default' : 'text'}
                onClick={() => setFiltersExpanded(!filtersExpanded)}
                icon={
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <FilterOutlined
                      style={{ fontSize: '16px', color: filtersExpanded ? '#a69ead' : undefined }}
                    />
                    {filtersExpanded ? (
                      <CaretUpFilled style={{ fontSize: '10px', color: '#a69ead' }} />
                    ) : (
                      <CaretDownFilled style={{ fontSize: '10px' }} />
                    )}
                  </span>
                }
                title={filtersExpanded ? 'Скрыть фильтры' : 'Показать фильтры'}
                style={{
                  padding: '4px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  borderColor: filtersExpanded ? '#a69ead' : undefined,
                }}
              >
                Фильтры
              </Button>
            </Badge>
          </Space>
          <Space>
            {appliedFilters &&
              !Object.keys(editingRows).length &&
              mode === 'view' &&
              !deleteMode && (
                <Button type="primary" icon={<PlusOutlined />} onClick={startAdd}>
                  Добавить
                </Button>
              )}
            {Object.keys(editingRows).length > 0 && (
              <>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleUpdate}>
                  Сохранить
                </Button>
                <Button onClick={handleCancelEdit}>Отмена</Button>
              </>
            )}
            {appliedFilters && mode === 'add' && (
              <>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                  Сохранить
                </Button>
                <Button onClick={handleCancel}>Отменить</Button>
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
              <>
                <Button
                  icon={<DownloadOutlined />}
                  onClick={handleExport}
                  disabled={deleteMode || Object.keys(editingRows).length > 0}
                >
                  Экспорт
                </Button>
                <Button
                  icon={<UploadOutlined />}
                  onClick={openImport}
                  disabled={deleteMode || Object.keys(editingRows).length > 0}
                >
                  Импорт
                </Button>
              </>
            )}
          </Space>
        </div>

        {filtersExpanded && (
          <Card size="small" style={{ marginTop: 12 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <Space wrap>
                <Select
                  placeholder="Корпус"
                  style={{ width: 200 }}
                  value={filters.blockId}
                  onChange={(value) => setFilters((f) => ({ ...f, blockId: value }))}
                  options={blocks?.map((b) => ({ value: b.id, label: b.name })) ?? []}
                  disabled={!filters.projectId}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
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
                        if (
                          a.number !== undefined &&
                          a.number !== null &&
                          b.number !== undefined &&
                          b.number !== null
                        ) {
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
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
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
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
                <Select
                  placeholder="Раздел"
                  style={{ width: 200 }}
                  value={filters.tagId}
                  onChange={(value) =>
                    setFilters((f) => ({ ...f, tagId: value, documentationId: undefined }))
                  }
                  options={
                    documentationTags?.map((tag) => ({
                      value: String(tag.id),
                      label: `${tag.tag_number || ''} ${tag.name}`.trim(),
                    })) ?? []
                  }
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
                <Select
                  placeholder="Шифр документа"
                  style={{ width: 200 }}
                  value={filters.documentationId}
                  onChange={(value) => setFilters((f) => ({ ...f, documentationId: value }))}
                  options={
                    documentations
                      ?.filter(
                        (doc: DocumentationRecord) =>
                          !filters.tagId || String(doc.tag_id) === filters.tagId,
                      )
                      .map((doc: DocumentationRecord) => ({
                        value: doc.id,
                        label: doc.project_code,
                      })) ?? []
                  }
                  disabled={!filters.tagId}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              </Space>
              <Button icon={<SettingOutlined />} onClick={() => setColumnsSettingsOpen(true)}>
                Настройка столбцов
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Таблица */}
      {appliedFilters && (
        <div className="table-host chessboard-table">
          {mode === 'add' ? (
            <Table<TableRow>
              dataSource={tableRows}
              columns={orderedAddColumns}
              pagination={false}
              rowKey="key"
              sticky
              scroll={{
                x: 'max-content',
              }}
              rowClassName={(record) => (record.color ? `row-${record.color}` : '')}
            />
          ) : (
            <Table<ViewRow>
              dataSource={viewRows}
              columns={orderedViewColumns}
              pagination={false}
              rowKey="key"
              sticky
              scroll={{
                x: 'max-content',
              }}
              rowClassName={(record) => {
                const color = editingRows[record.key]?.color ?? record.color
                return color ? `row-${color}` : ''
              }}
            />
          )}
        </div>
      )}
      <Modal
        title="Количество по этажам"
        open={floorModalOpen}
        onCancel={cancelFloorModal}
        onOk={floorModalIsEdit ? saveFloorModal : undefined}
        okText="Сохранить"
        cancelText="Отменить"
        footer={
          floorModalIsEdit
            ? undefined
            : [
                <Button key="close" onClick={cancelFloorModal}>
                  Закрыть
                </Button>,
              ]
        }
      >
        <div style={{ marginBottom: 16 }}>
          <div>Шифр проекта: {floorModalInfo.projectCode}</div>
          <div>Наименование работ: {floorModalInfo.workName}</div>
          <div>
            Материал: {floorModalInfo.material} ({floorModalInfo.unit})
          </div>
        </div>
        <Table
          dataSource={floorModalData.map((d, i) => ({ ...d, key: i }))}
          columns={floorModalColumns}
          pagination={false}
          rowKey="key"
        />
        {floorModalIsEdit && (
          <Button
            type="dashed"
            icon={<PlusOutlined />}
            onClick={addFloorModalRow}
            style={{ marginTop: 8 }}
          >
            Добавить этаж
          </Button>
        )}
      </Modal>
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
            <p className="ant-upload-text">Перетащите файл или нажмите для выбора</p>
          </Upload.Dragger>
          <Select
            placeholder="Проект"
            style={{ width: '100%' }}
            value={importState.projectId}
            onChange={(value) => setImportState({ projectId: value })}
            options={projects?.map((p) => ({ value: p.id, label: p.name })) ?? []}
          />
          <Select
            placeholder="Корпус"
            style={{ width: '100%' }}
            value={importState.blockId}
            onChange={(value) => setImportState((s) => ({ ...s, blockId: value }))}
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
            options={
              costCategories
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
                })) ?? []
            }
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
            options={
              costTypes
                ?.filter((t) => String(t.cost_category_id) === importState.categoryId)
                .map((t) => ({ value: String(t.id), label: t.name })) ?? []
            }
            disabled={!importState.categoryId}
          />
          <Select
            placeholder="Локализация"
            style={{ width: '100%' }}
            value={importState.locationId ?? ''}
            onChange={(value) => setImportState((s) => ({ ...s, locationId: value || undefined }))}
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
        <div
          style={{
            marginBottom: 16,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Checkbox
            checked={allColumns.every((col) => columnVisibility[col.key] !== false)}
            indeterminate={
              allColumns.some((col) => columnVisibility[col.key]) &&
              !allColumns.every((col) => columnVisibility[col.key] !== false)
            }
            onChange={(e) => selectAllColumns(e.target.checked)}
          >
            Выделить все
          </Checkbox>
          <Button type="link" onClick={resetToDefaults}>
            По умолчанию
          </Button>
        </div>
        <List
          dataSource={columnOrder
            .map((key) => {
              const col = allColumns.find((c) => c.key === key)
              return col ? { ...col, visible: columnVisibility[key] !== false } : null
            })
            .filter(Boolean)}
          renderItem={(item, index) =>
            item && (
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
                  />,
                ]}
              >
                <Checkbox checked={item.visible} onChange={() => toggleColumnVisibility(item.key)}>
                  {item.title}
                </Checkbox>
              </List.Item>
            )
          }
        />
      </Drawer>
    </div>
  )
}
