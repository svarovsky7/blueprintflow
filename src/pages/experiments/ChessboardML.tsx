import { useCallback, useMemo, useState, useEffect, useDeferredValue, startTransition, useRef, type Key } from 'react'
import { useLocation } from 'react-router-dom'
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
  Select,
  Space,
  Table,
  Typography,
  Upload,
  Tooltip,
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
import { useQuery, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { supabase } from '../../lib/supabase'
import { documentationApi, type DocumentationRecordForList } from '@/entities/documentation'
import { documentationTagsApi } from '@/entities/documentation-tags'
import { materialsApi } from '@/entities/materials'
import {
  chessboardSetsApi,
  chessboardSetsMultiDocsApi,
  type ChessboardSetStatus,
  type ChessboardSet,
} from '@/entities/chessboard'
import { statusesApi } from '@/entities/statuses/api/statuses-api'
import SimpleDeleteConfirm from '../../components/SimpleDeleteConfirm'
import { normalizeColorToHex } from '@/shared/constants/statusColors'
import { useScale } from '@/shared/contexts/ScaleContext'
import ChessboardSetsModal from '../documents/ChessboardSetsModal'
import ChessboardOptimized from '../../components/ChessboardOptimized'
import { DropdownPortalManager } from '../../components/DropdownPortalManager'
import { MLNomenclatureSelect, MLSupplierSelect, MLConfigPanel, getNomenclatureBySupplier } from '@/entities/ml'

const { Text } = Typography

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
  nomenclature?: string
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
  tagNumber?: number | null
  projectCode?: string
  projectName?: string
  versionNumber?: number | null
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
  projectName?: string
  workName?: string
  material: string
  unit: string
}

interface Comment {
  id: string
  comment_text: string
  author_id?: number
  created_at: string
  updated_at: string
}

interface CommentWithMapping extends Comment {
  entity_comments_mapping: {
    entity_type: string
    entity_id: string
  }[]
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
  tagNumber?: number | null
  projectCode?: string
  projectName?: string
  versionNumber?: number
  comments?: Comment[]
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
// Removed DocumentationRecord interface - now using DocumentationRecordForList from API
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
    version_id: string | null
    documentation_versions?: {
      id: string
      version_number: number
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

// ИСПРАВЛЕНИЕ: Стабильный генератор ключей для строк вместо Math.random
let rowIdCounter = 0
const emptyRow = (defaults: Partial<RowData>): RowData => ({
  key: `new-row-${++rowIdCounter}-${Date.now()}`, // Стабильный ключ для предотвращения перерендеров
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
  documentationId: defaults.documentationId ?? '',
  tagId: defaults.tagId ?? '',
  tagName: defaults.tagName ?? '',
  tagNumber: defaults.tagNumber ?? null,
  projectCode: defaults.projectCode ?? '',
  projectName: defaults.projectName ?? '',
  versionNumber: defaults.versionNumber ?? undefined,
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
  const { message, modal } = App.useApp()
  const { scale } = useScale()
  const queryClient = useQueryClient()
  const location = useLocation()

  const [filters, setFilters] = useState<{
    projectId?: string
    blockId?: string[]
    categoryId?: string[]
    typeId?: string[]
    tagId?: string[]
    documentationId?: string[]
    versionNumber?: number[]
  }>({})
  const [appliedFilters, setAppliedFilters] = useState<{
    projectId: string
    blockId?: string[]
    categoryId?: string[]
    typeId?: string[]
    tagId?: string[]
    documentationId?: string[]
    versionNumber?: number[]
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
  // Ключ для принудительного обновления данных документации при смене проекта
  // Решает проблему кэширования TanStack Query - см. TROUBLESHOOTING.md
  const [documentationRefreshKey, setDocumentationRefreshKey] = useState(0)
  const [columnsSettingsOpen, setColumnsSettingsOpen] = useState(false)
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
  const [columnOrder, setColumnOrder] = useState<string[]>([])
  const [deleteMode, setDeleteMode] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [mlConfigOpen, setMLConfigOpen] = useState(false) // Состояние для панели настроек ML
  const [importOpen, setImportOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importErrors, setImportErrors] = useState<{ [key: string]: number }>({})
  const [importState, setImportState] = useState<{
    projectId?: string
    blockId?: string[]
    categoryId?: string[]
    typeId?: string[]
    locationId?: string
    tagId?: string
    documentationId?: string
    versionId?: string
  }>({})

  // Состояние для модального окна комментариев
  const [commentsModalOpen, setCommentsModalOpen] = useState(false)
  const [selectedRowForComments, setSelectedRowForComments] = useState<string>('')
  const [comments, setComments] = useState<Comment[]>([])
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [newCommentText, setNewCommentText] = useState('')

  // Состояние для модального окна версий
  const [versionsModalOpen, setVersionsModalOpen] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<Record<string, string>>({}) // documentationId -> versionId

  // Состояния для комплектов
  const [selectedSetStatus, setSelectedSetStatus] = useState<string | undefined>(undefined)
  const [setsModalOpen, setSetsModalOpen] = useState(false)
  const [matchedSet, setMatchedSet] = useState<ChessboardSet | null>(null)
  const [setNameModalOpen, setSetNameModalOpen] = useState(false)
  const [pendingStatusId, setPendingStatusId] = useState<string | undefined>(undefined)

  // Состояние для количества отображаемых строк
  const [rowsPerPage, setRowsPerPage] = useState<number>(() => {
    const saved = localStorage.getItem('chessboard-rows-per-page')
    const parsed = saved ? parseInt(saved, 10) : 200

    // Защита от некорректных значений - принудительно используем 200 если значение слишком мало
    if (parsed < 10) {
      localStorage.setItem('chessboard-rows-per-page', '200')
      return 200
    }

    return parsed
  })

  // Обработчик изменения количества строк с сохранением в localStorage
  const handleRowsPerPageChange = useCallback((value: number) => {
    if (value > 0) {
      setRowsPerPage(value)
      localStorage.setItem('chessboard-rows-per-page', value.toString())
    } else {
      console.warn('Invalid rowsPerPage value:', value)
    }
  }, [rowsPerPage])

  // Состояния производительности
  const [useVirtualization, setUseVirtualization] = useState(() => {
    const saved = localStorage.getItem('chessboard-use-virtualization')
    return saved ? saved === 'true' : false
  })

  const [performanceMode, setPerformanceMode] = useState(() => {
    // Принудительно отключаем performance mode для исправления проблемы с редактированием
    return false
    // const saved = localStorage.getItem('chessboard-performance-mode')
    // return saved ? saved === 'true' : false
  })

  const [virtualRowHeight, setVirtualRowHeight] = useState(() => {
    const saved = localStorage.getItem('chessboard-virtual-row-height')
    return saved ? parseInt(saved, 10) : 54
  })

  const [displayRowLimit, setDisplayRowLimit] = useState(() => {
    // Очищаем старое значение из localStorage и убираем ограничение
    localStorage.removeItem('chessboard-display-row-limit')
    return -1
  })

  // Обработчики изменений с сохранением в localStorage
  const handleVirtualizationChange = useCallback((enabled: boolean) => {
    setUseVirtualization(enabled)
    localStorage.setItem('chessboard-use-virtualization', enabled.toString())
  }, [])

  const handlePerformanceModeChange = useCallback((enabled: boolean) => {
    setPerformanceMode(enabled)
    localStorage.setItem('chessboard-performance-mode', enabled.toString())
  }, [])

  const handleVirtualRowHeightChange = useCallback((height: number) => {
    setVirtualRowHeight(height)
    localStorage.setItem('chessboard-virtual-row-height', height.toString())
  }, [])

  const handleDisplayRowLimitChange = useCallback((limit: number) => {
    setDisplayRowLimit(limit)
    localStorage.setItem('chessboard-display-row-limit', limit.toString())
  }, [])
  const [setNameInput, setSetNameInput] = useState<string>('')

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

  // Обработка URL параметров при загрузке страницы
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const urlFilters: Record<string, string | string[]> = {}
    let hasFilters = false

    // Читаем параметры из URL
    const projectId = searchParams.get('project_id')
    if (projectId) {
      urlFilters.projectId = projectId
      hasFilters = true
    }

    const tagId = searchParams.get('tag_id')
    if (tagId) {
      urlFilters.tagId = [tagId]
      hasFilters = true
    }

    // Обработка массивов для block_ids
    const blockIds = searchParams.getAll('block_ids')
    if (blockIds.length > 0) {
      urlFilters.blockId = blockIds
      hasFilters = true
    }

    // Обработка массивов для cost_category_ids
    const categoryIds = searchParams.getAll('cost_category_ids')
    if (categoryIds.length > 0) {
      urlFilters.categoryId = categoryIds
      hasFilters = true
    }

    // Обработка массивов для cost_type_ids
    const typeIds = searchParams.getAll('cost_type_ids')
    if (typeIds.length > 0) {
      urlFilters.typeId = typeIds
      hasFilters = true
    }

    // Обработка documentation_id (поддержка множественных значений)
    const documentationIds = searchParams.getAll('documentation_id')
    if (documentationIds.length > 0) {
      urlFilters.documentationId = documentationIds
      hasFilters = true
    }

    // Если есть фильтры в URL, применяем их
    if (hasFilters) {
      setFilters(urlFilters)
      // Если есть projectId, также устанавливаем appliedFilters
      if (urlFilters.projectId) {
        setAppliedFilters(urlFilters)
      }
    }
  }, [location.search])

  const nomenclatureDropdownWidth = useMemo(() => {
    if (typeof document === 'undefined') return 200
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) return 200
    context.font = getComputedStyle(document.body).font || '14px'
    let max = 0
    if (nomenclatures) {
      for (const n of nomenclatures) {
        const width = context.measureText(n.name).width
        if (width > max) max = width
      }
    }
    return Math.min(500, Math.ceil(max) + 64)
  }, [nomenclatures])


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


  // Функция для создания многострочного заголовка
  const createMultilineTitle = useCallback((title: string): React.ReactNode => {
    const multilineMap: Record<string, string> = {
      'Шифр проекта': 'Шифр\nпроекта',
      'Кол-во по ПД': 'Кол-во\nпо ПД',
      'Кол-во по спеке РД': 'Кол-во по\nспеке РД',
      'Кол-во по пересчету РД': 'Кол-во по\nпересчету РД',
      'Наименование поставщика': 'Наименование\nпоставщика',
      'Категория затрат': 'Категория\nзатрат',
      'Вид затрат': 'Вид\nзатрат',
      'Наименование работ': 'Наименование\nработ',
    }

    const multilineText = multilineMap[title]
    if (multilineText) {
      return (
        <div
          style={{
            whiteSpace: 'pre-line',
            textAlign: 'center',
            lineHeight: '1.2',
            wordBreak: 'keep-all',
            wordWrap: 'normal',
          }}
        >
          {multilineText}
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center', wordBreak: 'keep-all', wordWrap: 'normal' }}>{title}</div>
    )
  }, [])

  // Функция для вычисления динамической ширины столбца
  const calculateColumnWidth = useCallback(
    (dataIndex: string, title: string, data: (RowData | ViewRow)[], maxWidth: number): number => {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('2d')
      if (!context) return maxWidth

      // Устанавливаем шрифт как в таблице Ant Design
      context.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'

      let maxContentWidth = 0

      // Измеряем ширину заголовка (для многострочных заголовков берем максимальную ширину строки)
      const multilineMap: Record<string, string> = {
        'Шифр проекта': 'Шифр\nпроекта',
        'Кол-во по ПД': 'Кол-во\nпо ПД',
        'Кол-во по спеке РД': 'Кол-во по\nспеке РД',
        'Кол-во по пересчету РД': 'Кол-во по\nпересчету РД',
        'Наименование поставщика': 'Наименование\nпоставщика',
        'Категория затрат': 'Категория\nзатрат',
        'Вид затрат': 'Вид\nзатрат',
        'Наименование работ': 'Наименование\nработ',
      }

      const multilineText = multilineMap[title]
      if (multilineText) {
        // Для многострочных заголовков измеряем каждую строку и берем максимальную
        const lines = multilineText.split('\n')
        const titleWidth = Math.max(...lines.map((line) => context.measureText(line).width))
        maxContentWidth = Math.max(maxContentWidth, titleWidth)
      } else {
        const titleWidth = context.measureText(title).width
        maxContentWidth = Math.max(maxContentWidth, titleWidth)
      }

      // Измеряем ширину контента в каждой строке
      data.forEach((row) => {
        let value = ''

        // Получаем значение в зависимости от типа столбца
        if (dataIndex === 'tagName' && 'tagName' in row) {
          value = row.tagName || ''
        } else if (dataIndex === 'projectCode' && 'projectCode' in row) {
          value = row.projectCode || ''
        } else if (dataIndex === 'projectName' && 'projectName' in row) {
          value = row.projectName || ''
        } else if (dataIndex === 'material') {
          value = row.material || ''
        } else if (dataIndex === 'quantityPd') {
          value = row.quantityPd || ''
        } else if (dataIndex === 'quantitySpec') {
          value = row.quantitySpec || ''
        } else if (dataIndex === 'quantityRd') {
          value = row.quantityRd || ''
        } else if (dataIndex === 'nomenclatureId' || dataIndex === 'nomenclature') {
          if ('nomenclature' in row) {
            value = row.nomenclature || ''
          } else {
            // Для добавления строк ищем по nomenclatureId
            value = row.nomenclatureId || ''
          }
        } else if (dataIndex === 'supplier') {
          value = row.supplier || ''
        } else if (dataIndex === 'unitId' || dataIndex === 'unit') {
          if ('unit' in row) {
            value = row.unit || ''
          } else {
            // Для добавления строк ищем по unitId
            value = row.unitId || ''
          }
        } else if (dataIndex === 'block') {
          value = row.block || ''
        } else if (dataIndex === 'floors') {
          value = row.floors || ''
        } else if (dataIndex === 'costCategoryId' || dataIndex === 'costCategory') {
          if ('costCategory' in row) {
            value = row.costCategory || ''
          } else {
            // Для добавления строк ищем по costCategoryId
            value = row.costCategoryId || ''
          }
        } else if (dataIndex === 'costTypeId' || dataIndex === 'costType') {
          if ('costType' in row) {
            value = row.costType || ''
          } else {
            // Для добавления строк ищем по costTypeId
            value = row.costTypeId || ''
          }
        } else if (dataIndex === 'rateId' || dataIndex === 'workName') {
          if ('workName' in row) {
            value = row.workName || ''
          } else {
            // Для добавления строк ищем по rateId
            value = row.rateId || ''
          }
        } else if (dataIndex === 'locationId' || dataIndex === 'location') {
          if ('location' in row) {
            value = row.location || ''
          } else {
            // Для добавления строк ищем по locationId
            value = row.locationId || ''
          }
        }

        if (value) {
          const contentWidth = context.measureText(String(value)).width
          maxContentWidth = Math.max(maxContentWidth, contentWidth)
        }
      })

      // Добавляем отступы (padding) и место для иконок сортировки/фильтрации
      // Для компактных столбцов используем минимальные отступы
      const compactColumns = [
        'tagName',
        'projectCode',
        'block',
        'floors',
        'unitId',
        'unit',
        'locationId',
        'location',
      ]
      const isCompactColumn = compactColumns.includes(dataIndex)

      // Компактные столбцы: 8px с каждой стороны + 24px для иконок = 40px
      // Остальные столбцы: 16px с каждой стороны + 32px для иконок = 64px
      const padding = isCompactColumn ? 40 : 64
      const calculatedWidth = maxContentWidth + padding

      // Ограничиваем максимальной шириной
      return Math.min(calculatedWidth, maxWidth)
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

  const sortedDocumentationTags = useMemo(
    () =>
      documentationTags ? [...documentationTags].sort((a, b) => a.tag_number - b.tag_number) : [],
    [documentationTags],
  )

  // Загрузка статусов комплектов
  const { data: setStatuses, isLoading: isLoadingStatuses } = useQuery<ChessboardSetStatus[]>({
    queryKey: ['chessboard-set-statuses'],
    queryFn: chessboardSetsApi.getStatuses,
  })

  // Автоматическая инициализация статусов при первой загрузке, если их нет
  useEffect(() => {
    if (!isLoadingStatuses && setStatuses !== undefined && setStatuses.length === 0) {
      statusesApi
        .initializeChessboardStatuses()
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ['chessboard-set-statuses'] })
        })
        .catch((error) => {
          console.error('Failed to initialize statuses:', error)
        })
    }
  }, [isLoadingStatuses, setStatuses, queryClient])

  // Принудительно обновляем документацию при смене проекта
  useEffect(() => {
    if (appliedFilters?.projectId) {
      setDocumentationRefreshKey((prev) => prev + 1)
    }
  }, [appliedFilters?.projectId])

  // Загрузка документации для выбранного проекта
  const { data: documentations } = useQuery<DocumentationRecordForList[]>({
    queryKey: ['documentations-v2', appliedFilters?.projectId, documentationRefreshKey],
    queryFn: async () => {
      if (!appliedFilters?.projectId) return []
      const fetchFilters = { project_id: appliedFilters.projectId }
      return await documentationApi.getDocumentationList(fetchFilters)
    },
    enabled: !!appliedFilters?.projectId,
    staleTime: 0, // Всегда считать данные устаревшими
    cacheTime: 0, // Не кэшировать
  })

  // Загрузка документации для фильтров (до применения)
  const { data: filterDocumentations } = useQuery<DocumentationRecordForList[]>({
    queryKey: ['filter-documentations-v2', filters.projectId, documentationRefreshKey],
    queryFn: async () => {
      if (!filters.projectId) return []
      const fetchFilters = { project_id: filters.projectId }
      return documentationApi.getDocumentationList(fetchFilters)
    },
    enabled: !!filters.projectId,
    staleTime: 0,
    cacheTime: 0,
  })

  // Загрузка версий для документов проекта
  const { data: documentVersions } = useQuery({
    queryKey: ['document-versions', appliedFilters?.projectId],
    queryFn: async () => {
      if (!supabase || !appliedFilters?.projectId) return []

      // Сначала получаем все документы проекта через маппинг таблицу
      const { data: projectDocs, error: docsError } = await supabase
        .from('documentations_projects_mapping')
        .select('documentation_id')
        .eq('project_id', appliedFilters.projectId)

      if (docsError) {
        console.error('Ошибка загрузки документов проекта:', docsError)
        return []
      }

      if (!projectDocs || projectDocs.length === 0) return []

      // Затем получаем версии для всех документов проекта
      const { data, error } = await supabase
        .from('documentation_versions')
        .select('id, documentation_id, version_number, issue_date, status')
        .in(
          'documentation_id',
          projectDocs.map((doc) => doc.documentation_id),
        )
        .order('version_number', { ascending: false })

      if (error) {
        console.error('Ошибка загрузки версий документов:', error)
        return []
      }

      return data || []
    },
    enabled: !!appliedFilters?.projectId,
  })

  const {
    data: tableData,
    refetch,
    error: tableDataError,
    isError,
  } = useQuery<DbRow[]>({
    queryKey: ['chessboard', appliedFilters, selectedVersions],
    enabled: !!appliedFilters?.projectId,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    queryFn: async () => {
      if (!supabase || !appliedFilters) return []

      // ИСПРАВЛЕНИЕ: Всегда используем left join для chessboard_mapping чтобы не терять новые записи
      // Фильтрацию будем делать на уровне приложения, а не в запросе БД
      const mappingJoin = 'chessboard_mapping!left'
      console.log('🔍 DB QUERY - Using left join for chessboard_mapping to avoid losing new records') // LOG: тип join для маппинга

      // Всегда используем left join для документации, чтобы получать все записи
      // Фильтрацию по документам делаем отдельными условиями where
      const docRelation = 'chessboard_documentation_mapping!left'

      const query = supabase
        .from('chessboard')
        .select(
          `
          id, material, materials(name), unit_id, color, units(name),
          chessboard_nomenclature_mapping!left(nomenclature_id, supplier_name, nomenclature(name)),
          ${mappingJoin}(block_id, blocks(name), cost_category_id, cost_type_id, location_id, cost_categories(name), detail_cost_categories(name), location(name)),
          chessboard_rates_mapping!left(rate_id, rates(work_name)),
          chessboard_documentation_mapping!left(version_id, documentation_versions(id, version_number, documentation_id, documentations(id, code, tag_id, stage, project_name, tag:documentation_tags(id, name, tag_number))))
        `,
        )
        .eq('project_id', appliedFilters.projectId)
      // ИСПРАВЛЕНИЕ: Убираем фильтры из запроса БД - будем фильтровать на уровне приложения
      // Это гарантирует, что новые записи не потеряются из-за отсутствующих связей
      console.log('🔍 DB QUERY - Fetching all records for project, filtering will be done in app') // LOG: отключение фильтров БД
      // НЕ фильтруем по документации в запросе - делаем это на уровне данных
      // Это позволяет получить все записи проекта, а потом отфильтровать по документам
      // НЕ фильтруем по версиям в запросе - делаем это на уровне данных
      // Это позволяет получить все записи и правильно выбрать нужную версию документа

      // 🚀 СТАБИЛЬНАЯ СОРТИРОВКА: добавляем вторичную сортировку по ID для одинаковых created_at
      const { data, error } = await query
        .order('created_at', { ascending: false })
        .order('id', { ascending: false }) // Вторичная сортировка для стабильного порядка
      if (error) {
        console.error('❌ Query Error:', error)

        // Определяем тип ошибки для более понятного сообщения
        let errorMessage = 'Не удалось загрузить данные'
        if (error.message?.includes('network')) {
          errorMessage = 'Проблема с сетевым соединением. Проверьте интернет-подключение'
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Превышено время ожидания. Попробуйте еще раз'
        } else if (error.code === 'PGRST116') {
          errorMessage = 'Слишком много данных для обработки. Уточните фильтры'
        }

        throw new Error(errorMessage)
      }

      // Загружаем этажи для всех записей
      const chessboardIds = ((data as unknown as DbRow[] | null | undefined) ?? []).map(
        (item) => item.id,
      )
      const floorsMap: Record<string, { floors: string; quantities: FloorQuantities }> = {}

      if (chessboardIds.length > 0) {
        // Разбиваем на батчи для избежания слишком длинных URL
        const batchSize = 100
        let floorsData: any[] = []

        for (let i = 0; i < chessboardIds.length; i += batchSize) {
          const batch = chessboardIds.slice(i, i + batchSize)
          const { data: batchData, error: floorsError } = await supabase
            .from('chessboard_floor_mapping')
            .select(
              'chessboard_id, floor_number, location_id, "quantityPd", "quantitySpec", "quantityRd"',
            )
            .in('chessboard_id', batch)
            .order('floor_number', { ascending: true })

          if (floorsError) {
            console.error('Ошибка загрузки этажей (батч):', floorsError)
            // Не бросаем ошибку, продолжаем без этажей для этого батча
          } else if (batchData) {
            floorsData = floorsData.concat(batchData)
          }
        }

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

      return result
    },
  })

  // Запрос комментариев для всех строк (с обработкой ошибок для отсутствующих таблиц)
  const { data: commentsData } = useQuery<CommentWithMapping[]>({
    queryKey: ['chessboard-comments', appliedFilters?.projectId, tableData?.length],
    enabled: !!appliedFilters?.projectId && !!tableData && tableData.length > 0 && !isImporting,
    retry: 0, // Не повторяем при ошибке отсутствия таблицы
    queryFn: async () => {
      if (!supabase || !tableData) return []

      const chessboardIds = tableData.map((item) => item.id)
      if (chessboardIds.length === 0) return []

      try {
        // Используем батч-обработку для избежания длинных URL
        const batchSize = 50
        const allMappings: any[] = []

        for (let i = 0; i < chessboardIds.length; i += batchSize) {
          const batch = chessboardIds.slice(i, i + batchSize)

          const { data: mappingsBatch, error: mappingError } = await supabase
            .from('entity_comments_mapping')
            .select('entity_id, comment_id')
            .eq('entity_type', 'chessboard')
            .in('entity_id', batch)

          if (mappingError) {
            console.warn(
              `Ошибка загрузки маппинга комментариев для батча ${i / batchSize + 1}:`,
              mappingError,
            )
            continue
          }

          if (mappingsBatch && mappingsBatch.length > 0) {
            allMappings.push(...mappingsBatch)
          }
        }

        if (allMappings.length === 0) {
          return []
        }

        // Получаем все уникальные comment_id
        const commentIds = [...new Set(allMappings.map((m: any) => m.comment_id))]

        // Теперь получаем сами комментарии (тоже с батч-обработкой если нужно)
        const allComments: any[] = []
        const commentBatchSize = 100

        for (let i = 0; i < commentIds.length; i += commentBatchSize) {
          const batch = commentIds.slice(i, i + commentBatchSize)

          const { data: commentsBatch, error: commentsError } = await supabase
            .from('comments')
            .select('*')
            .in('id', batch)
            .order('created_at', { ascending: false })

          if (commentsError) {
            console.warn(
              `Ошибка загрузки комментариев для батча ${i / commentBatchSize + 1}:`,
              commentsError,
            )
            continue
          }

          if (commentsBatch && commentsBatch.length > 0) {
            allComments.push(...commentsBatch)
          }
        }

        // Преобразуем данные в нужный формат
        const result: CommentWithMapping[] = []

        if (allComments.length > 0 && allMappings.length > 0) {
          allComments.forEach((comment) => {
            // Находим все маппинги для этого комментария
            const commentMappings = allMappings.filter((m: any) => m.comment_id === comment.id)

            commentMappings.forEach((mapping: any) => {
              result.push({
                id: comment.id,
                comment_text: comment.comment_text,
                author_id: comment.author_id,
                created_at: comment.created_at,
                updated_at: comment.updated_at,
                entity_comments_mapping: [
                  {
                    entity_type: 'chessboard',
                    entity_id: mapping.entity_id,
                    comment_id: comment.id,
                  },
                ],
              })
            })
          })
        }

        return result
      } catch (error) {
        // Обрабатываем любые другие ошибки сети или парсинга
        console.warn('Комментарии недоступны:', error)
        return []
      }
    },
  })

  const viewRowsData = useMemo(() => {
    const commentsMap = new Map<string, Comment[]>()

    // Группируем комментарии по entity_id
    if (commentsData) {
      commentsData.forEach((comment) => {
        const entityId = comment.entity_comments_mapping[0]?.entity_id
        if (!commentsMap.has(entityId)) {
          commentsMap.set(entityId, [])
        }
        commentsMap.get(entityId)!.push({
          id: comment.id,
          comment_text: comment.comment_text,
          author_id: comment.author_id,
          created_at: comment.created_at,
          updated_at: comment.updated_at,
        })
      })
    }

    const filteredRows = (tableData ?? [])
      .map((item) => {
        // Если есть выбранные версии из модального окна, нужно найти правильную версию
        let version = item.chessboard_documentation_mapping?.documentation_versions
        let documentation = version?.documentations

        // Если это массив, нужно найти правильную версию
        if (Array.isArray(item.chessboard_documentation_mapping)) {
          // Ищем версию, которая соответствует выбранным версиям или документу из фильтров
          const mappings = item.chessboard_documentation_mapping
          let bestMapping = mappings[0] // fallback

          for (const mapping of mappings) {
            const mapVersion = mapping.documentation_versions
            const mapDoc = mapVersion?.documentations

            if (mapDoc && appliedFilters?.documentationId?.includes(mapDoc.id)) {
              // Если есть выбранные версии для этого документа
              if (Object.keys(selectedVersions).length > 0 && selectedVersions[mapDoc.id]) {
                const selectedVersionId = selectedVersions[mapDoc.id]
                if (mapVersion?.id === selectedVersionId) {
                  bestMapping = mapping // Точное совпадение по выбранной версии
                  break
                }
              } else {
                bestMapping = mapping // Документ из фильтров
              }
            }
          }

          version = bestMapping?.documentation_versions
          documentation = version?.documentations
        }

        const tag = documentation?.tag

        // Заполняем данные из фильтров, если они отсутствуют в записи
        const fallbackTag =
          appliedFilters?.tagId?.length === 1
            ? sortedDocumentationTags.find((t) => String(t.id) === appliedFilters.tagId![0])
            : null
        const fallbackDoc =
          appliedFilters?.documentationId?.length === 1
            ? documentations?.find((d) => d.id === appliedFilters.documentationId![0])
            : null
        const fallbackVersion =
          fallbackDoc && documentVersions
            ? documentVersions
                .filter((v) => v.documentation_id === fallbackDoc.id)
                .sort((a, b) => b.version_number - a.version_number)[0]
            : null

        // Для существующих записей без версии, но с документом, найдем последнюю версию
        const documentIdForVersion = documentation?.id || fallbackDoc?.id
        const autoVersion =
          !version && documentIdForVersion && documentVersions
            ? documentVersions
                .filter((v) => v.documentation_id === documentIdForVersion)
                .sort((a, b) => b.version_number - a.version_number)[0]
            : null
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
        // LOG: Отладка данных для новых записей
        if (process.env.NODE_ENV === 'development' && (item.id === '837c81f6-adef-4b6d-8b1c-d79321133b2e' || item.id === '7318d107-5d14-4d15-9f08-c8405ab2bd75')) { // LOG: логирование для новых записей
          console.log('🔍 MAPPING DEBUG - New record detailed data:', {
            id: item.id,
            material: item.material,
            materials_name: item.materials?.name,
            chessboard_mapping: item.chessboard_mapping,
            mapping_block_id: item.chessboard_mapping?.block_id,
            mapping_cost_category_id: item.chessboard_mapping?.cost_category_id,
            mapping_cost_type_id: item.chessboard_mapping?.cost_type_id,
            mapping_location_id: item.chessboard_mapping?.location_id,
            cost_categories_name: item.chessboard_mapping?.cost_categories?.name,
            detail_cost_categories_name: item.chessboard_mapping?.detail_cost_categories?.name,
            location_name: item.chessboard_mapping?.location?.name,
            nomenclature_mapping: item.chessboard_nomenclature_mapping,
            nomenclature_id: item.chessboard_nomenclature_mapping?.[0]?.nomenclature_id || item.chessboard_nomenclature_mapping?.nomenclature_id,
            nomenclature_name: item.chessboard_nomenclature_mapping?.[0]?.nomenclature?.name || item.chessboard_nomenclature_mapping?.nomenclature?.name
          }) // LOG: детальная отладка маппинга данных для новой записи
        }

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
          documentationId: documentation?.id, // НЕ используем fallbackDoc для documentationId
          tagName: tag?.name || fallbackTag?.name || '',
          tagNumber: tag?.tag_number ?? fallbackTag?.tag_number ?? null,
          projectCode: (() => {
            // Получаем код только из реальной связи документации
            let code = documentation?.code || ''

            // Если код пустой, пробуем найти в documentations по documentationId
            if (!code && documentation?.id && documentations) {
              const foundInDocumentations = documentations.find(
                (doc) => doc.id === documentation.id,
              )
              if (foundInDocumentations) {
                code = foundInDocumentations.project_code || ''
              }
            }

            return code
          })(),
          projectName: (documentation as { project_name?: string })?.project_name || '',
          versionNumber:
            version?.version_number ??
            autoVersion?.version_number ??
            fallbackVersion?.version_number ??
            undefined,
          comments: commentsMap.get(item.id) || [],
        }
      })
      .filter((row) => {
        // Сначала фильтруем по документам/тегам
        if (appliedFilters?.documentationId?.length) {
          // Если есть фильтр по документам, показываем только строки с этими документами
          if (
            !row.documentationId ||
            !appliedFilters.documentationId.includes(row.documentationId)
          ) {
            return false
          }
        } else if (appliedFilters?.tagId?.length) {
          // Если есть фильтр по тегам, показываем только строки с этими тегами

          // Используем tagNumber для фильтрации, так как tagId undefined
          if (row.tagNumber === null || !appliedFilters.tagId.includes(String(row.tagNumber))) {
            return false
          }
        }

        // Затем фильтруем по выбранным версиям (только если есть выбранные версии)
        if (Object.keys(selectedVersions).length > 0 && appliedFilters?.documentationId?.length) {
          // Если документ из фильтра, проверяем версию
          if (row.documentationId && selectedVersions[row.documentationId]) {
            const selectedVersionId = selectedVersions[row.documentationId]
            const version = documentVersions?.find((v) => v.id === selectedVersionId)
            const expectedVersionNumber = version?.version_number

            return row.versionNumber === expectedVersionNumber
          }
        }

        return true
      })
      // ИСПРАВЛЕНИЕ: Добавляем фильтрацию на уровне приложения для block, category, type
      .filter((row) => {
        // Фильтр по корпусам
        if (appliedFilters?.blockId && appliedFilters.blockId.length > 0) {
          const rowBlockId = row.chessboard_mapping?.block_id
          if (!rowBlockId || !appliedFilters.blockId.includes(rowBlockId)) {
            return false
          }
        }

        // Фильтр по категориям затрат
        if (appliedFilters?.categoryId && appliedFilters.categoryId.length > 0) {
          const rowCategoryId = row.chessboard_mapping?.cost_category_id
          if (!rowCategoryId || !appliedFilters.categoryId.includes(String(rowCategoryId))) {
            return false
          }
        }

        // Фильтр по видам затрат
        if (appliedFilters?.typeId && appliedFilters.typeId.length > 0) {
          const rowTypeId = row.chessboard_mapping?.cost_type_id
          if (!rowTypeId || !appliedFilters.typeId.includes(String(rowTypeId))) {
            return false
          }
        }

        return true
      })

    console.log(`🔍 APP FILTER - Applied filters result: ${filteredRows.length} rows after app-level filtering`) // LOG: результат фильтрации на уровне приложения

    return {
      allRows: filteredRows,
      visibleRows: filteredRows, // Убираем ограничение - пагинация управляется Table компонентом
    }
  }, [
    tableData,
    commentsData,
    appliedFilters,
    sortedDocumentationTags,
    documentations,
    documentVersions,
    selectedVersions,
  ])

  // Извлекаем видимые строки и общее количество с проверкой на существование
  const viewRows = viewRowsData?.visibleRows || []
  const totalRowsCount = viewRowsData?.allRows?.length || 0

  // React 18 оптимизации для плавной работы с большими данными
  const deferredViewRows = useDeferredValue(viewRows)
  const deferredTotalCount = useDeferredValue(totalRowsCount)

  // Функция для некритичных обновлений фильтров
  const updateFilterAsync = useCallback((updater: (filters: typeof filters) => typeof filters) => {
    startTransition(() => {
      setFilters(updater)
    })
  }, [])

  const tableRows = useMemo<TableRow[]>(() => {
    // ИСПРАВЛЕНИЕ: Новые строки (только с ключами new-row-*) добавляем в начало
    const newRows = Object.values(editingRows)
      .filter(r => r.key.startsWith('new-row-'))
      .map((r) => ({
        ...r,
        // Обеспечиваем fallback для projectName если он пустой
        projectName:
          r.projectName ||
          (r.projectCode &&
            documentations?.find((d) => d.project_code === r.projectCode)?.project_name) ||
          r.projectName,
      }))

    // ИСПРАВЛЕНИЕ: Существующие строки из rows с применением editingRows если есть
    const existingRowsFromRows = rows.map((r) => {
      const editingData = editingRows[r.key]
      return {
        ...(editingData || r), // Используем данные из editingRows если есть
        // Обеспечиваем fallback для projectName если он пустой
        projectName:
          (editingData || r).projectName ||
          ((editingData || r).projectCode &&
            documentations?.find((d) => d.project_code === (editingData || r).projectCode)?.project_name) ||
          (editingData || r).projectName,
      }
    })

    // ИСПРАВЛЕНИЕ: Существующие строки из viewRows с применением editingRows если есть
    const existingRowsFromViewRows = viewRows.map((v) => {
      const editingData = editingRows[v.key]
      const baseRow = {
        key: v.key,
        material: v.material,
        materialId: v.materialId,
        quantityPd: v.quantityPd,
        quantitySpec: v.quantitySpec,
        quantityRd: v.quantityRd,
        nomenclatureId: v.nomenclatureId,
        nomenclature: v.nomenclature, // ✅ ИСПРАВЛЕНО: добавляем nomenclature
        supplier: v.supplier,
        unit: v.unit, // ✅ ИСПРАВЛЕНО: изменено с unitId на unit
        blockId: v.blockId,
        block: v.block,
        costCategory: v.costCategory, // ✅ ИСПРАВЛЕНО: изменено с costCategoryId на costCategory
        costType: v.costType, // ✅ ИСПРАВЛЕНО: изменено с costTypeId на costType
        location: v.location, // ✅ ИСПРАВЛЕНО: изменено с locationId на location
        workName: v.workName, // ✅ ИСПРАВЛЕНО: изменено с rateId на workName
        floors: v.floors,
        color: v.color,
        tagName: v.tagName,
        tagNumber: v.tagNumber,
        projectCode: v.projectCode,
        projectName: v.projectName,
        versionNumber: v.versionNumber,
        isExisting: true,
      }

      return editingData ? { ...baseRow, ...editingData } : baseRow
    })

    return [
      ...newRows,
      ...existingRowsFromRows,
      ...existingRowsFromViewRows,
    ]
  }, [editingRows, rows, viewRows, documentations])

  // LOG: Логирование изменений tableRows для отслеживания подсчета строк
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') { // LOG: условное логирование только в dev режиме
      console.log(`📊 TABLEROWS UPDATED - Total: ${tableRows.length} (editingRows: ${Object.keys(editingRows).length}, rows: ${rows.length}, viewRows: ${viewRows.length})`) // LOG: обновление tableRows
    }
  }, [tableRows.length, editingRows, rows.length, viewRows.length])

  const handleApply = () => {
    if (!filters.projectId) {
      message.warning('Выберите проект')
      return
    }

    // Принудительно обновляем документацию при смене проекта
    if (appliedFilters?.projectId !== filters.projectId) {
      setDocumentationRefreshKey((prev) => prev + 1)
    }

    setAppliedFilters({ ...filters } as {
      projectId: string
      blockId?: string[]
      categoryId?: string[]
      typeId?: string[]
      tagId?: string[]
      documentationId?: string[]
      versionNumber?: number[]
    })

    // Автоматически устанавливаем последние версии для выбранных документов
    if (documentVersions) {
      const latestVersions: Record<string, string> = {}

      if (filters.documentationId && filters.documentationId.length > 0) {
        // Если выбраны конкретные документы
        filters.documentationId.forEach((docId) => {
          const versions = documentVersions.filter((v) => v.documentation_id === docId)
          if (versions.length > 0) {
            const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0]
            latestVersions[docId] = latestVersion.id
          }
        })
      } else if (filters.tagId && filters.tagId.length > 0) {
        // Если выбраны только разделы, устанавливаем версии для всех документов этих разделов
        const tagDocuments =
          documentations?.filter((d) => d.tag_id && filters.tagId!.includes(String(d.tag_id))) || []

        tagDocuments.forEach((doc) => {
          const versions = documentVersions.filter((v) => v.documentation_id === doc.id)
          if (versions.length > 0) {
            const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0]
            latestVersions[doc.id] = latestVersion.id
          }
        })
      }

      if (Object.keys(latestVersions).length > 0) {
        setSelectedVersions(latestVersions)
      }
    }

    setMode('view')
    setFiltersExpanded(false) // Сворачиваем блок фильтров после применения
  }

  const addRow = useCallback(
    (index: number) => {
      if (!appliedFilters) return
      const defaultLocationId =
        appliedFilters.typeId && appliedFilters.typeId.length > 0
          ? String(
              costTypes?.find((t) => String(t.id) === appliedFilters.typeId![0])?.location_id ?? '',
            )
          : ''
      const blockName =
        appliedFilters.blockId && appliedFilters.blockId.length > 0
          ? (blocks?.find((b) => b.id === appliedFilters.blockId![0])?.name ?? '')
          : ''
      const tagData =
        appliedFilters.tagId && appliedFilters.tagId.length === 1
          ? sortedDocumentationTags.find((t) => String(t.id) === appliedFilters.tagId![0])
          : undefined
      const docData =
        appliedFilters.documentationId && appliedFilters.documentationId.length === 1
          ? documentations?.find(
              (d: DocumentationRecordForList) => d.id === appliedFilters.documentationId![0],
            )
          : undefined
      const versionData =
        docData && selectedVersions[docData.id]
          ? documentVersions?.find((v) => v.id === selectedVersions[docData.id])
          : undefined
      setRows((prev) => {
        const newRow = emptyRow({
          blockId:
            appliedFilters.blockId && appliedFilters.blockId.length > 0
              ? appliedFilters.blockId[0]
              : '',
          costCategoryId:
            appliedFilters.categoryId && appliedFilters.categoryId.length > 0
              ? appliedFilters.categoryId[0]
              : '',
          costTypeId:
            appliedFilters.typeId && appliedFilters.typeId.length > 0
              ? appliedFilters.typeId[0]
              : '',
          locationId: defaultLocationId,
          block: blockName,
          tagId: tagData ? String(tagData.id) : '',
          tagName: tagData?.name ?? '',
          tagNumber: tagData?.tag_number ?? null,
          documentationId: docData?.id ?? '',
          projectCode: docData?.project_code ?? '',
          versionNumber: versionData?.version_number ?? undefined,
        })
        const next = [...prev]
        next.splice(index + 1, 0, newRow)
        return next
      })
    },
    [
      appliedFilters,
      costTypes,
      blocks,
      sortedDocumentationTags,
      documentations,
      selectedVersions,
      documentVersions,
    ],
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
    const deleteStartTime = performance.now()
    // УДАЛЕН лог для оптимизации производительности

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
      const deleteEndTime = performance.now()
      const deleteDuration = (deleteEndTime - deleteStartTime).toFixed(2)
      // УДАЛЕН лог для оптимизации производительности

      message.success(`Удалено строк: ${idsToDelete.length}`)
      setSelectedRows(new Set())
      setDeleteMode(false)

      // ИСПРАВЛЕНИЕ: Принудительно инвалидируем кэш запроса перед refetch
      queryClient.invalidateQueries({
        queryKey: ['chessboard', appliedFilters, selectedVersions],
        exact: true
      })

      await refetch()
    } catch (error: unknown) {
      message.error(`Не удалось удалить строки: ${(error as Error).message}`)
    }
  }, [selectedRows, message, refetch, queryClient, appliedFilters, selectedVersions])

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

  const toggleSelectAll = useCallback(() => {
    if (selectedRows.size === viewRows.length && viewRows.length > 0) {
      // Если все строки выделены, снимаем выделение
      setSelectedRows(new Set())
    } else {
      // Выделяем все строки
      const allKeys = new Set(viewRows.map((row: ViewRow) => row.key))
      setSelectedRows(allKeys)
    }
  }, [selectedRows, viewRows])

  const handleRowChange = useCallback(
    (key: string, field: keyof RowData, value: string | number | null) => {
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
    },
    [],
  )



  const handleEditChange = useCallback(
    (key: string, field: keyof RowData, value: string | number | null) => {
      setEditingRows((prev) => {
        const updated = { ...prev[key], [field]: value }
        if (field === 'quantityPd' || field === 'quantitySpec' || field === 'quantityRd') {
          delete updated.floorQuantities
        }
        // Убираем принудительный перерендер - теперь React.memo правильно работает
        return { ...prev, [key]: updated }
      })
    },
    [],
  )

  // НОВАЯ ФУНКЦИЯ: Обработчик выбора поставщика через ML
  const handleMLSupplierSelect = useCallback(async (
    rowKey: string,
    supplierId: string,
    supplierName: string,
    isEditMode: boolean = false
  ) => {
    console.log('🤖 ML: Supplier selected:', { supplierId, supplierName, rowKey }) // LOG: выбор поставщика через ML

    // Обновляем поставщика
    const handleChange = isEditMode ? handleEditChange : handleRowChange
    handleChange(rowKey, 'supplier', supplierName)

    // Получаем номенклатуру для выбранного поставщика
    try {
      const nomenclatures = await getNomenclatureBySupplier(supplierId)
      console.log('🤖 ML: Found nomenclatures for supplier:', nomenclatures.length) // LOG: найдено номенклатур для поставщика

      if (nomenclatures.length > 0) {
        // Берем первую номенклатуру (можно усложнить логику выбора)
        const selectedNomenclature = nomenclatures[0]
        handleChange(rowKey, 'nomenclatureId', selectedNomenclature.id)
        handleChange(rowKey, 'nomenclature', selectedNomenclature.name)

        console.log('🤖 ML: Auto-filled nomenclature:', selectedNomenclature.name) // LOG: автозаполнение номенклатуры
      } else {
        // Очищаем номенклатуру если для поставщика нет связанной номенклатуры
        handleChange(rowKey, 'nomenclatureId', '')
        handleChange(rowKey, 'nomenclature', '')
        console.log('🤖 ML: No nomenclature found for supplier, cleared fields') // LOG: номенклатура не найдена
      }
    } catch (error) {
      console.error('🤖 ML: Error getting nomenclature for supplier:', error) // LOG: ошибка получения номенклатуры
    }
  }, [handleRowChange, handleEditChange])

  const handleMaterialBlur = useCallback(
    async (key: string, name: string, isEdit = false) => {
      if (!name.trim()) return
      try {
        const material = await materialsApi.ensure(name.trim())
        const updater = isEdit ? handleEditChange : handleRowChange
        updater(key, 'materialId', material.uuid)
        updater(key, 'material', material.name)
        await refetchMaterials()
      } catch (e) {
        message.error(`Не удалось сохранить материал: ${(e as Error).message}`)
      }
    },
    [handleRowChange, handleEditChange, refetchMaterials, message],
  )

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
          : ((
              (row as DbRow).chessboard_documentation_mapping as {
                documentation_versions?: { documentations?: { code?: string } }
              }
            )?.documentation_versions?.documentations?.code ?? '')
      const projectName =
        'projectName' in row
          ? row.projectName
          : ((
              (row as DbRow).chessboard_documentation_mapping as {
                documentation_versions?: { documentations?: { project_name?: string } }
              }
            )?.documentation_versions?.documentations?.project_name ?? '')
      setFloorModalInfo({
        projectCode,
        projectName,
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

  // Функции для работы с комментариями
  const openCommentsModal = useCallback(
    async (rowKey: string) => {
      setSelectedRowForComments(rowKey)
      setCommentsModalOpen(true)
      setNewCommentText('')
      setEditingCommentId(null)

      // Загрузка комментариев для строки
      if (supabase) {
        const { data, error } = await supabase
          .from('comments')
          .select('*, entity_comments_mapping!inner(entity_type, entity_id)')
          .eq('entity_comments_mapping.entity_type', 'chessboard')
          .eq('entity_comments_mapping.entity_id', rowKey)
          .order('created_at', { ascending: false })

        if (error) {
          console.error('Ошибка загрузки комментариев:', error)
        } else {
          setComments(data || [])
        }
      }
    },
    [supabase],
  )

  const closeCommentsModal = useCallback(() => {
    setCommentsModalOpen(false)
    setSelectedRowForComments('')
    setComments([])
    setNewCommentText('')
    setEditingCommentId(null)
  }, [])

  const saveComment = useCallback(async () => {
    if (!supabase || !newCommentText.trim() || !selectedRowForComments) return

    try {
      if (editingCommentId) {
        // Редактирование существующего комментария
        const { error } = await supabase
          .from('comments')
          .update({
            comment_text: newCommentText.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCommentId)

        if (error) throw error
      } else {
        // Добавление нового комментария
        const { data: comment, error: commentError } = await supabase
          .from('comments')
          .insert({
            comment_text: newCommentText.trim(),
            author_id: null, // TODO: добавить информацию о пользователе
          })
          .select()
          .single()

        if (commentError) throw commentError

        // Создание маппинга
        const { error: mappingError } = await supabase.from('entity_comments_mapping').insert({
          entity_type: 'chessboard',
          entity_id: selectedRowForComments,
          comment_id: comment.id,
        })

        if (mappingError) throw mappingError
      }

      // Перезагрузка комментариев в модальном окне
      await openCommentsModal(selectedRowForComments)
      setNewCommentText('')
      setEditingCommentId(null)

      // Обновление кэша комментариев для таблицы
      queryClient.invalidateQueries({ queryKey: ['chessboard-comments'] })
    } catch (error) {
      console.error('Ошибка сохранения комментария:', error)
    }
  }, [
    supabase,
    newCommentText,
    selectedRowForComments,
    editingCommentId,
    openCommentsModal,
    queryClient,
  ])

  const startEditComment = useCallback((comment: Comment) => {
    setEditingCommentId(comment.id)
    setNewCommentText(comment.comment_text)
  }, [])

  const deleteComment = useCallback(
    async (commentId: string) => {
      if (!supabase) return

      try {
        // Удаление маппинга
        const { error: mappingError } = await supabase
          .from('entity_comments_mapping')
          .delete()
          .eq('comment_id', commentId)

        if (mappingError) throw mappingError

        // Удаление самого комментария
        const { error: commentError } = await supabase.from('comments').delete().eq('id', commentId)

        if (commentError) throw commentError

        // Перезагрузка комментариев
        if (selectedRowForComments) {
          await openCommentsModal(selectedRowForComments)
        }

        // Обновление кэша комментариев для таблицы
        queryClient.invalidateQueries({ queryKey: ['chessboard-comments'] })
      } catch (error) {
        console.error('Ошибка удаления комментария:', error)
      }
    },
    [supabase, selectedRowForComments, openCommentsModal, queryClient],
  )

  // Функции для работы с версиями
  const openVersionsModal = useCallback(() => {
    // Автоматически устанавливаем последние версии, если они еще не установлены
    if (appliedFilters?.documentationId && documentVersions) {
      const newVersions: Record<string, string> = { ...selectedVersions }
      let hasChanges = false

      appliedFilters.documentationId.forEach((docId) => {
        if (!selectedVersions[docId]) {
          const versions = documentVersions.filter((v) => v.documentation_id === docId)
          if (versions.length > 0) {
            const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0]
            newVersions[docId] = latestVersion.id
            hasChanges = true
          }
        }
      })

      if (hasChanges) {
        setSelectedVersions(newVersions)
      }
    }

    setVersionsModalOpen(true)
  }, [appliedFilters, documentVersions, selectedVersions])

  const closeVersionsModal = useCallback(() => {
    setVersionsModalOpen(false)
  }, [])

  const handleVersionSelect = useCallback((documentationId: string, versionId: string) => {
    setSelectedVersions((prev) => ({
      ...prev,
      [documentationId]: versionId,
    }))
  }, [])

  const applyVersions = useCallback(() => {
    // Проверяем, что для всех документов выбрана версия
    const requiredDocIds = appliedFilters?.documentationId || []
    const missingVersions = requiredDocIds.filter((docId) => !selectedVersions[docId])

    if (missingVersions.length > 0) {
      message.warning('Необходимо выбрать версии для всех документов')
      return
    }

    // Сохраняем выбранные версии в состоянии
    setVersionsModalOpen(false)
    message.success(`Выбрано версий документов: ${Object.keys(selectedVersions).length}`)

    // Обновляем данные таблицы с учетом выбранных версий
    // ИСПРАВЛЕНИЕ: Принудительно инвалидируем кэш запроса перед refetch
    queryClient.invalidateQueries({
      queryKey: ['chessboard', appliedFilters, selectedVersions],
      exact: true
    })
    refetch()
  }, [selectedVersions, appliedFilters, refetch, documentVersions, queryClient])

  // ИСПРАВЛЕНИЕ: Быстрое добавление строк без смены режима (оптимизация производительности)
  const startAdd = useCallback(() => {
    if (!appliedFilters) return

    // Автоматически устанавливаем последние версии для документов, если они не установлены
    if (
      appliedFilters.documentationId &&
      appliedFilters.documentationId.length > 0 &&
      documentVersions
    ) {
      const newVersions = { ...selectedVersions }
      let hasChanges = false

      appliedFilters.documentationId.forEach((docId) => {
        if (!selectedVersions[docId]) {
          const versions = documentVersions.filter((v) => v.documentation_id === docId)
          if (versions.length > 0) {
            const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0]
            newVersions[docId] = latestVersion.id
            hasChanges = true
          }
        }
      })

      if (hasChanges) {
        setSelectedVersions(newVersions)
      }
    }

    const defaultLocationId =
      appliedFilters.typeId && appliedFilters.typeId.length > 0
        ? String(
            costTypes?.find((t) => String(t.id) === appliedFilters.typeId![0])?.location_id ?? '',
          )
        : ''
    const blockName =
      appliedFilters.blockId && appliedFilters.blockId.length > 0
        ? (blocks?.find((b) => b.id === appliedFilters.blockId![0])?.name ?? '')
        : ''
    const tagData =
      appliedFilters.tagId && appliedFilters.tagId.length === 1
        ? sortedDocumentationTags.find((t) => String(t.id) === appliedFilters.tagId![0])
        : undefined
    const docData =
      appliedFilters.documentationId && appliedFilters.documentationId.length === 1
        ? documentations?.find(
            (d: DocumentationRecordForList) => d.id === appliedFilters.documentationId![0],
          )
        : undefined
    const versionData =
      docData && selectedVersions[docData.id]
        ? documentVersions?.find((v) => v.id === selectedVersions[docData.id])
        : undefined

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Создаем новую строку напрямую в режиме редактирования без смены mode
    const newRowData = emptyRow({
      blockId:
        appliedFilters.blockId && appliedFilters.blockId.length > 0
          ? appliedFilters.blockId[0]
          : '',
      costCategoryId:
        appliedFilters.categoryId && appliedFilters.categoryId.length > 0
          ? appliedFilters.categoryId[0]
          : '',
      costTypeId:
        appliedFilters.typeId && appliedFilters.typeId.length > 0 ? appliedFilters.typeId[0] : '',
      locationId: defaultLocationId,
      block: blockName,
      tagId: tagData ? String(tagData.id) : '',
      tagName: tagData?.name ?? '',
      tagNumber: tagData?.tag_number ?? null,
      documentationId: docData?.id ?? '',
      projectCode: docData?.project_code ?? '',
      versionNumber: versionData?.version_number ?? undefined,
    })

    // ОПТИМИЗАЦИЯ: Добавляем строку сразу в editingRows (быстро) вместо setRows + setMode (медленно)
    setEditingRows(prev => ({ ...prev, [newRowData.key]: newRowData }))

    if (process.env.NODE_ENV === 'development') { // LOG: условное логирование для отладки
      console.log('⚡ Быстрое добавление строки:', newRowData.key) // LOG: добавление новой строки
    }

    // НЕ меняем mode - остаемся в 'view' для оптимальной производительности
  }, [
    appliedFilters,
    costTypes,
    blocks,
    sortedDocumentationTags,
    documentations,
    documentVersions,
    selectedVersions,
    setSelectedVersions,
  ])

  // Функция для создания комплекта
  const createChessboardSet = useCallback(
    async (statusId: string, setName?: string) => {
      if (!appliedFilters) {
        message.error('Нет примененных фильтров для создания комплекта')
        return
      }

      // Проверяем обязательные фильтры
      if (!appliedFilters.projectId) {
        message.error('Проект обязателен для создания комплекта')
        return
      }

      if (!appliedFilters.documentationId || appliedFilters.documentationId.length === 0) {
        message.error('Шифр проекта обязателен для создания комплекта')
        return
      }

      // Собираем документы с их версиями
      const documents = []
      for (const docId of appliedFilters.documentationId) {
        const versionId = selectedVersions[docId]
        if (!versionId) {
          const doc = documentations?.find((d) => d.id === docId)
          console.error('Версия не найдена для документа:', {
            docId,
            selectedVersions,
            appliedFilters,
            doc,
          })
          message.error(
            `Версия для шифра проекта "${doc?.project_code || 'неизвестный'}" обязательна для создания комплекта. Пожалуйста, выберите версию.`,
          )
          // Открываем модальное окно выбора версий
          openVersionsModal()
          return
        }
        documents.push({
          documentation_id: docId,
          version_id: versionId,
        })
      }

      try {
        const createRequest = {
          filters: {
            project_id: appliedFilters.projectId,
            documents: documents, // Массив документов с версиями
            tag_id:
              appliedFilters.tagId && appliedFilters.tagId.length === 1
                ? parseInt(appliedFilters.tagId[0])
                : null,
            block_ids:
              appliedFilters.blockId && appliedFilters.blockId.length > 0
                ? appliedFilters.blockId
                : null,
            cost_category_ids:
              appliedFilters.categoryId && appliedFilters.categoryId.length > 0
                ? appliedFilters.categoryId.map((id) => parseInt(id))
                : null,
            cost_type_ids:
              appliedFilters.typeId && appliedFilters.typeId.length > 0
                ? appliedFilters.typeId.map((id) => parseInt(id))
                : null,
          },
          status_id: statusId,
          name: setName, // Добавляем название комплекта
        }

        await chessboardSetsMultiDocsApi.createSetWithMultipleDocs(createRequest)
        message.success('Комплект успешно создан')
        setSelectedSetStatus(undefined) // Сбрасываем выбор статуса
        setSetNameInput('') // Очищаем введенное название
      } catch (error) {
        console.error('Ошибка создания комплекта:', error)
        const errorMessage =
          error instanceof Error ? error.message : 'Ошибка при создании комплекта'
        message.error(errorMessage)
      }
    },
    [appliedFilters, selectedVersions],
  )

  // Функция для открытия модального окна со списком комплектов
  const openSetsModal = useCallback(() => {
    if (!appliedFilters?.projectId) {
      message.warning('Выберите проект для просмотра комплектов')
      return
    }
    setSetsModalOpen(true)
  }, [appliedFilters?.projectId])

  // Функция для применения фильтров из выбранного комплекта
  const applySetFilters = useCallback(async (setId: string) => {
    try {
      // Получаем данные комплекта
      const setData = await chessboardSetsApi.getSetById(setId)
      if (!setData) {
        message.error('Комплект не найден')
        return
      }

      // Подготавливаем фильтры из комплекта
      let documentationIds: string[] | undefined = undefined
      const newVersions: Record<string, string> = {}

      // Проверяем наличие множественных документов (новая структура)
      if (setData.documents && Array.isArray(setData.documents) && setData.documents.length > 0) {
        documentationIds = setData.documents.map(
          (doc: { documentation_id: string }) => doc.documentation_id,
        )
        // Устанавливаем версии для каждого документа
        setData.documents.forEach((doc: { documentation_id: string; version_id: string }) => {
          if (doc.documentation_id && doc.version_id) {
            newVersions[doc.documentation_id] = doc.version_id
          }
        })
      }
      // Обратная совместимость со старой структурой
      else if (setData.documentation_id) {
        documentationIds = [setData.documentation_id]
        if (setData.version_id) {
          newVersions[setData.documentation_id] = setData.version_id
        }
      }

      const newFilters = {
        projectId: setData.project_id,
        blockId: setData.block_ids || undefined,
        categoryId: setData.cost_category_ids?.map((id) => String(id)) || undefined,
        typeId: setData.cost_type_ids?.map((id) => String(id)) || undefined,
        tagId: setData.tag_id ? [String(setData.tag_id)] : undefined,
        documentationId: documentationIds,
      }

      // Устанавливаем фильтры
      setFilters(newFilters)

      // Применяем фильтры
      setAppliedFilters({
        projectId: newFilters.projectId,
        blockId: newFilters.blockId,
        categoryId: newFilters.categoryId,
        typeId: newFilters.typeId,
        tagId: newFilters.tagId,
        documentationId: newFilters.documentationId,
      })

      // Устанавливаем версии
      if (Object.keys(newVersions).length > 0) {
        setSelectedVersions(newVersions)
      }

      message.success('Фильтры из комплекта применены')
      setSetsModalOpen(false)
    } catch (error) {
      console.error('Ошибка применения фильтров из комплекта:', error)
      message.error('Не удалось применить фильтры из комплекта')
    }
  }, [])

  // Обработчик изменения статуса комплекта
  const handleSetStatusChange = useCallback((statusId: string) => {
    setSelectedSetStatus(statusId)
    setPendingStatusId(statusId)
    setSetNameModalOpen(true) // Открываем модальное окно для ввода названия
  }, [])

  // Обработчик подтверждения создания комплекта с названием
  const handleSetNameConfirm = useCallback(() => {
    if (pendingStatusId) {
      createChessboardSet(pendingStatusId, setNameInput || undefined)
      setSetNameModalOpen(false)
      setPendingStatusId(undefined)
    }
  }, [pendingStatusId, setNameInput, createChessboardSet])

  // Автоматическая установка последних версий для документов при переходе со страницы Анализа
  useEffect(() => {
    if (
      appliedFilters?.documentationId &&
      documentVersions &&
      appliedFilters.documentationId.length > 0
    ) {
      const newVersions: Record<string, string> = { ...selectedVersions }
      let hasChanges = false

      appliedFilters.documentationId.forEach((docId) => {
        if (!selectedVersions[docId]) {
          const versions = documentVersions.filter((v) => v.documentation_id === docId)
          if (versions.length > 0) {
            const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0]
            newVersions[docId] = latestVersion.id
            hasChanges = true
          }
        }
      })

      if (hasChanges) {
        setSelectedVersions(newVersions)
      }
    }
  }, [appliedFilters?.documentationId, documentVersions, selectedVersions])

  // Поиск комплекта по текущим фильтрам
  useEffect(() => {
    const findMatchingSet = async () => {
      if (!appliedFilters?.projectId) {
        setMatchedSet(null)
        setSelectedSetStatus(undefined)
        return
      }

      // Проверяем, что есть хотя бы один документ с версией
      if (!appliedFilters.documentationId || appliedFilters.documentationId.length === 0) {
        setMatchedSet(null)
        setSelectedSetStatus(undefined)
        return
      }

      // Собираем документы с их версиями
      const documents = []
      for (const docId of appliedFilters.documentationId) {
        const versionId = selectedVersions[docId]
        if (!versionId) {
          // Если документ из фильтров и у него нет версии, попробуем взять последнюю
          if (documentVersions) {
            const versions = documentVersions.filter((v) => v.documentation_id === docId)
            if (versions.length > 0) {
              const latestVersion = versions.sort((a, b) => b.version_number - a.version_number)[0]
              documents.push({
                documentation_id: docId,
                version_id: latestVersion.id,
              })
              continue
            }
          }
          // Если версия все еще не найдена, прерываем поиск комплекта
          setMatchedSet(null)
          setSelectedSetStatus(undefined)
          return
        }
        documents.push({
          documentation_id: docId,
          version_id: versionId,
        })
      }

      // Подготавливаем фильтры для поиска с множественными документами
      const searchFilters = {
        project_id: appliedFilters.projectId,
        documents: documents,
        tag_id: appliedFilters.tagId?.[0] ? Number(appliedFilters.tagId[0]) : undefined,
        block_ids: appliedFilters.blockId || undefined,
        cost_category_ids: appliedFilters.categoryId?.map((id) => Number(id)) || undefined,
        cost_type_ids: appliedFilters.typeId?.map((id) => Number(id)) || undefined,
      }

      try {
        const foundSet = await chessboardSetsMultiDocsApi.findSetByMultiDocFilters(searchFilters)
        setMatchedSet(foundSet)

        if (foundSet && foundSet.status) {
          // Если найден комплект со статусом, устанавливаем его
          setSelectedSetStatus((foundSet.status as ChessboardSetStatus).id)
        } else {
          setSelectedSetStatus(undefined)
        }
      } catch (error) {
        console.error('Ошибка поиска комплекта:', error)
        setMatchedSet(null)
        setSelectedSetStatus(undefined)
      }
    }

    findMatchingSet()
  }, [appliedFilters, selectedVersions])



  const startEdit = useCallback(
    (id: string) => {
      // Сохраняем текущую позицию скролла
      const scrollContainer = document.querySelector('.ant-table-body')
      const savedScrollLeft = scrollContainer?.scrollLeft || 0

      const containerScrollWidth = scrollContainer?.scrollWidth || 0

      const dbRow = tableData?.find((r) => r.id === id)
      if (!dbRow) {
        return
      }
      const mapping = getNomenclatureMapping(dbRow.chessboard_nomenclature_mapping)
      const nomenclatureId = mapping?.nomenclature_id ?? ''
      const nomenclatureName = mapping?.nomenclature?.name ?? ''
      const supplierName = mapping?.supplier_name ?? ''
      setEditingRows((prev) => {
        if (prev[id]) {
          return prev
        }
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
            nomenclature: nomenclatureName,
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
            documentationId: (() => {
              // Берем из базы данных, если есть
              const dbDocId =
                dbRow.chessboard_documentation_mapping?.documentation_versions?.documentation_id
              if (dbDocId) return dbDocId

              // Если в базе нет, но применен фильтр по шифру проекта - используем из фильтра
              if (appliedFilters?.documentationId && appliedFilters.documentationId.length === 1) {
                return appliedFilters.documentationId[0]
              }
              return ''
            })(),
            tagId: (() => {
              // Сначала пробуем из маппинга (будет работать после миграции)
              const mappingTagId = dbRow.chessboard_documentation_mapping?.tag_id
              if (mappingTagId) {
                return String(mappingTagId)
              }

              // Fallback: берем из документации через версию (текущая схема)
              const docTagId =
                dbRow.chessboard_documentation_mapping?.documentation_versions?.documentations
                  ?.tag_id
              if (docTagId) {
                return String(docTagId)
              }

              // Если в базе нет, но применен фильтр по разделу - используем из фильтра
              if (appliedFilters?.tagId && appliedFilters.tagId.length === 1) {
                console.log(
                  '🔧 EDIT INIT - Using filter tagId:',
                  appliedFilters.tagId[0],
                  'for row:',
                  id,
                )
                return appliedFilters.tagId[0]
              }

              // Fallback: если есть фильтр по tagId, но не один - берем первый
              if (appliedFilters?.tagId && appliedFilters.tagId.length > 0) {
                console.log(
                  '🔧 EDIT INIT - Using first filter tagId:',
                  appliedFilters.tagId[0],
                  'from',
                  appliedFilters.tagId.length,
                  'options for row:',
                  id,
                )
                return appliedFilters.tagId[0]
              }

              // Последний fallback: ищем первый доступный тег из списка
              if (sortedDocumentationTags && sortedDocumentationTags.length > 0) {
                console.log(
                  '🔧 EDIT INIT - Using first available tag:',
                  sortedDocumentationTags[0].id,
                  'for row:',
                  id,
                )
                return String(sortedDocumentationTags[0].id)
              }

              return ''
            })(),
            tagName: (() => {
              // Берем из базы данных, если есть
              const dbTagName =
                dbRow.chessboard_documentation_mapping?.documentation_versions?.documentations?.tag
                  ?.name
              if (dbTagName) return dbTagName

              // Если в базе нет, но применен фильтр по разделу - найдем название
              if (appliedFilters?.tagId && appliedFilters.tagId.length === 1) {
                const tagId = parseInt(appliedFilters.tagId[0])
                const tag = sortedDocumentationTags?.find((t) => t.id === tagId)
                return tag?.name ?? ''
              }

              // Если используем первый доступный тег (fallback из tagId) - найдем его название
              if (sortedDocumentationTags && sortedDocumentationTags.length > 0) {
                return sortedDocumentationTags[0].name
              }

              return ''
            })(),
            tagNumber: (() => {
              // Берем из базы данных, если есть
              const dbTagNumber =
                dbRow.chessboard_documentation_mapping?.documentation_versions?.documentations?.tag
                  ?.tag_number
              if (dbTagNumber) return dbTagNumber

              // Если в базе нет, но применен фильтр по разделу - найдем номер
              if (appliedFilters?.tagId && appliedFilters.tagId.length === 1) {
                const tagId = parseInt(appliedFilters.tagId[0])
                const tag = sortedDocumentationTags?.find((t) => t.id === tagId)
                return tag?.tag_number ?? null
              }

              // Если используем первый доступный тег (fallback из tagId) - найдем его номер
              if (sortedDocumentationTags && sortedDocumentationTags.length > 0) {
                return sortedDocumentationTags[0].tag_number ?? null
              }

              return null
            })(),
            projectCode: (() => {
              // Берем из базы данных, если есть
              const dbProjectCode =
                dbRow.chessboard_documentation_mapping?.documentation_versions?.documentations?.code
              if (dbProjectCode) return dbProjectCode

              // Если в базе нет, но применен фильтр по шифру проекта - используем из фильтра
              if (appliedFilters?.documentationId && appliedFilters.documentationId.length === 1) {
                const docId = appliedFilters.documentationId[0]
                const doc = documentations?.find((d) => d.id === docId)
                return doc?.project_code ?? ''
              }
              return ''
            })(),
            projectName: (() => {
              // Сначала пытаемся найти по коду проекта из документации
              const dbProjectCode =
                dbRow.chessboard_documentation_mapping?.documentation_versions?.documentations?.code
              if (dbProjectCode && documentations) {
                const matchingDoc = documentations.find((d) => d.project_code === dbProjectCode)
                if (matchingDoc?.project_name) return matchingDoc.project_name
              }

              // Fallback к прямому поиску по project_name из базы
              const dbProjectName = (
                dbRow.chessboard_documentation_mapping?.documentation_versions?.documentations as {
                  project_name?: string
                }
              )?.project_name
              if (dbProjectName) return dbProjectName

              // Если в базе нет, но применен фильтр по шифру проекта - используем из фильтра
              if (appliedFilters?.documentationId && appliedFilters.documentationId.length === 1) {
                const docId = appliedFilters.documentationId[0]
                const doc = documentations?.find((d) => d.id === docId)
                return doc?.project_name ?? ''
              }
              return ''
            })(),
            versionNumber: (() => {
              // Берем из базы данных, если есть
              const dbVersionNumber =
                dbRow.chessboard_documentation_mapping?.documentation_versions?.version_number
              if (dbVersionNumber) return dbVersionNumber

              // Если в базе нет, но применен фильтр по шифру проекта - найдем последнюю версию
              if (appliedFilters?.documentationId && appliedFilters.documentationId.length === 1) {
                const docId = appliedFilters.documentationId[0]
                const versions = documentVersions?.filter((v) => v.documentation_id === docId)
                if (versions && versions.length > 0) {
                  const latestVersion = versions.sort(
                    (a, b) => b.version_number - a.version_number,
                  )[0]
                  return latestVersion.version_number
                }
              }
              return null
            })(),
            floorQuantities: dbRow.floorQuantities,
          },
        }
      })

      // Восстанавливаем позицию скролла после обновления состояния
      const restoreScroll = () => {
        const container = document.querySelector('.ant-table-body')
        if (container && savedScrollLeft > 0) {
          const newContainerScrollWidth = container?.scrollWidth || 0

          // Универсальный алгоритм восстановления позиции скролла
          const containerWidth = container.clientWidth
          const widthChange = newContainerScrollWidth - containerScrollWidth

          let adjustedScrollLeft: number

          if (Math.abs(widthChange) < 100) {
            // Малые изменения: простая пропорциональная корректировка
            const relativePosition = savedScrollLeft / containerScrollWidth
            adjustedScrollLeft = relativePosition * newContainerScrollWidth
          } else {
            // Большие изменения: фиксация центра видимой области
            const visibleCenter = savedScrollLeft + containerWidth / 2
            const relativeCenterPosition = visibleCenter / containerScrollWidth
            const newCenterPosition = relativeCenterPosition * newContainerScrollWidth
            adjustedScrollLeft = newCenterPosition - containerWidth / 2
          }

          // Защита от выхода за границы
          const maxScrollLeft = newContainerScrollWidth - containerWidth
          const safeScrollLeft = Math.min(Math.max(adjustedScrollLeft, 0), maxScrollLeft)


          container.scrollLeft = safeScrollLeft

        }
      }

      // Используем requestAnimationFrame для более точного восстановления
      requestAnimationFrame(() => {
        restoreScroll()
        // Дополнительная проверка через небольшой интервал
        setTimeout(restoreScroll, 10)
      })

      void loadSupplierOptions(nomenclatureId, id, supplierName)
    },
    [
      tableData,
      loadSupplierOptions,
      appliedFilters,
      sortedDocumentationTags,
      documentations,
      documentVersions,
    ],
  )

  const handleUpdate = useCallback(async () => {
    if (!supabase || Object.keys(editingRows).length === 0) return

    console.log('🚀 SAVE START - Beginning handleUpdate process') // LOG: начало процесса сохранения
    console.log(`📊 SAVE START - Total editing rows: ${Object.keys(editingRows).length}`) // LOG: общее количество редактируемых строк

    // ИСПРАВЛЕНИЕ: Разделяем новые строки и существующие для корректного сохранения
    const newRows: RowData[] = []
    const existingRows: RowData[] = []

    Object.values(editingRows).forEach(r => {
      if (r.key.startsWith('new-row-')) {
        newRows.push(r)
      } else {
        existingRows.push(r)
      }
    })

    console.log(`📈 SAVE SPLIT - New rows: ${newRows.length}, Existing rows: ${existingRows.length}`) // LOG: разделение строк на новые и существующие

    // Обрабатываем новые строки - создаем записи в БД
    const newRowPromises = newRows.map(async (r) => {
      if (!appliedFilters?.projectId) return null

      console.log(`🆕 NEW ROW START - Processing new row ${r.key}:`, { material: r.material, nomenclature: r.nomenclatureId, projectCode: r.projectCode }) // LOG: начало обработки новой строки

      let materialId = r.materialId
      if (!materialId && r.material) {
        console.log(`🔧 NEW ROW - Creating material: ${r.material}`) // LOG: создание материала
        const material = await materialsApi.ensure(r.material)
        materialId = material.uuid
        console.log(`✅ NEW ROW - Material created: ${materialId}`) // LOG: материал создан
      }

      // Создаем новую запись в chessboard без временного ID
      console.log(`🔧 NEW ROW - Creating chessboard record for ${r.key}`) // LOG: создание основной записи в chessboard
      const { data: insertedData, error: insertError } = await supabase!
        .from('chessboard')
        .insert({
          project_id: appliedFilters.projectId,
          material: materialId || null,
          unit_id: r.unitId || null,
          color: r.color || null,
        })
        .select('id')
        .single()

      if (insertError || !insertedData) {
        throw new Error(`Ошибка создания новой записи: ${insertError?.message}`)
      }

      const newId = insertedData.id
      console.log(`✅ NEW ROW - Chessboard record created with newId: ${newId}`) // LOG: основная запись создана

      // Создаем mapping для новой записи
      console.log(`🔧 NEW ROW - Creating mapping for newId: ${newId}:`, { blockId: r.blockId, costCategoryId: r.costCategoryId, costTypeId: r.costTypeId, locationId: r.locationId }) // LOG: создание mapping
      await supabase!.from('chessboard_mapping').upsert(
        {
          chessboard_id: newId,
          block_id: r.blockId || null,
          cost_category_id: Number(r.costCategoryId),
          cost_type_id: r.costTypeId ? Number(r.costTypeId) : null,
          location_id: r.locationId ? Number(r.locationId) : null,
        },
        { onConflict: 'chessboard_id' },
      )
      console.log(`✅ NEW ROW - Mapping created for newId: ${newId}`) // LOG: mapping создан

      // Добавляем этажи для новой записи
      const floors = parseFloorsString(r.floors)
      if (floors.length > 0) {
        console.log(`🔧 NEW ROW - Creating floor mappings for newId: ${newId}, floors:`, floors) // LOG: создание этажей
        const floorQuantities = r.floorQuantities
        const totalFloors = floors.length
        const floorMappings = floors.map((floor) => ({
          chessboard_id: newId,
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
        console.log(`✅ NEW ROW - Floor mappings created for newId: ${newId}`) // LOG: этажи созданы
      }

      // LOG: Добавляем сохранение номенклатуры для новой записи
      if (r.nomenclatureId) {
        console.log(`🔧 NEW ROW - Saving nomenclature mapping for newId: ${newId}, nomenclatureId: ${r.nomenclatureId}, supplier: ${r.supplier || 'null'}`) // LOG: процесс сохранения номенклатуры
        await supabase!.from('chessboard_nomenclature_mapping').insert({
          chessboard_id: newId,
          nomenclature_id: r.nomenclatureId,
          supplier_name: r.supplier || null,
        })
        console.log(`✅ NEW ROW - Nomenclature mapping saved for newId: ${newId}`) // LOG: успешное сохранение номенклатуры
      }

      // LOG: Добавляем сохранение документации для новой записи
      let docId = r.documentationId

      // Если есть тэг и шифр проекта, создаём или обновляем документацию
      if (r.projectCode && r.tagId) {
        console.log(`🔧 NEW ROW - Creating/updating documentation for newId: ${newId}, projectCode: ${r.projectCode}, tagId: ${r.tagId}, projectName: ${r.projectName || 'null'}`) // LOG: процесс создания документации
        const doc = await documentationApi.upsertDocumentation(
          r.projectCode,
          Number(r.tagId),
          appliedFilters?.projectId,
          undefined, // blockId
          undefined, // color
          undefined, // stage
          r.projectName, // projectName - ВАЖНО: передаем название проекта!
        )
        docId = doc.id
        console.log(`✅ NEW ROW - Documentation created/updated for newId: ${newId}, docId: ${docId}`) // LOG: успешное создание документации
      }

      if (docId && r.versionNumber) {
        console.log(`🔧 NEW ROW - Saving documentation version mapping for newId: ${newId}, docId: ${docId}, versionNumber: ${r.versionNumber}`) // LOG: процесс сохранения версии документации
        // Ищем существующую версию или создаём новую
        let version = documentVersions?.find(
          (v) => v.documentation_id === docId && v.version_number === r.versionNumber,
        )

        if (!version) {
          // Создаем новую версию
          const { data: newVersion, error: versionError } = await supabase!
            .from('documentation_versions')
            .insert({
              documentation_id: docId,
              version_number: r.versionNumber,
            })
            .select()
            .single()

          if (versionError) {
            throw new Error(`Не удалось создать версию документа: ${versionError.message}`)
          }
          version = newVersion
          console.log(`✅ NEW ROW - New version created for newId: ${newId}, versionId: ${version.id}`) // LOG: создание новой версии
        }

        // Сохраняем прямую ссылку на версию документа (новая схема)
        await supabase!.from('chessboard_documentation_mapping').insert({
          chessboard_id: newId,
          version_id: version?.id || '',
          // TODO: добавить tag_id после применения миграции
          // tag_id: r.tagId ? Number(r.tagId) : null,
        })
        console.log(`✅ NEW ROW - Documentation mapping saved for newId: ${newId}, versionId: ${version?.id}`) // LOG: успешное сохранение маппинга документации
      } else if (docId && !r.versionNumber) {
        // Если выбран документ, но не указана версия - выдаем ошибку
        throw new Error('Сохранение шифра проекта без указания версии невозможно!')
      }

      // LOG: Добавляем сохранение расценок для новой записи
      if (r.rateId) {
        console.log(`🔧 NEW ROW - Saving rate mapping for newId: ${newId}, rateId: ${r.rateId}`) // LOG: процесс сохранения расценки
        await supabase!.from('chessboard_rates_mapping').insert({
          chessboard_id: newId,
          rate_id: r.rateId,
        })
        console.log(`✅ NEW ROW - Rate mapping saved for newId: ${newId}`) // LOG: успешное сохранение расценки
      }

      console.log(`🎉 NEW ROW COMPLETE - All data saved for newId: ${newId}`) // LOG: завершение обработки новой строки
      return newId
    })

    // Обрабатываем существующие строки - обновляем записи
    const updatePromises = existingRows.map(async (r) => {
      let materialId = r.materialId
      if (!materialId && r.material) {
        const material = await materialsApi.ensure(r.material)
        materialId = material.uuid
      }
      const updateChessboard = supabase!
        .from('chessboard')
        .update({
          material: materialId || null,
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

      // Обновляем связь с версией документа (новая схема)
      const updateDocumentationMapping = async () => {
        let docId = r.documentationId

        // Если есть тэг и шифр проекта, создаём или обновляем документацию
        if (r.projectCode && r.tagId) {
          const doc = await documentationApi.upsertDocumentation(
            r.projectCode,
            Number(r.tagId),
            appliedFilters?.projectId,
            undefined, // blockId
            undefined, // color
            undefined, // stage
            r.projectName, // projectName - ВАЖНО: передаем название проекта!
          )
          docId = doc.id
        } else {
          // Документ не найден - это нормально для некоторых строк
        }

        if (docId && r.versionNumber) {
          // Ищем существующую версию или создаём новую
          let version = documentVersions?.find(
            (v) => v.documentation_id === docId && v.version_number === r.versionNumber,
          )

          if (!version) {
            // Создаем новую версию
            const { data: newVersion, error: versionError } = await supabase!
              .from('documentation_versions')
              .insert({
                documentation_id: docId,
                version_number: r.versionNumber,
              })
              .select()
              .single()

            if (versionError) {
              throw new Error(`Не удалось создать версию документа: ${versionError.message}`)
            }
            version = newVersion
          }

          // Сохраняем прямую ссылку на версию документа (новая схема)
          await supabase!.from('chessboard_documentation_mapping').upsert(
            {
              chessboard_id: r.key,
              version_id: version?.id || '',
              // TODO: добавить tag_id после применения миграции
              // tag_id: r.tagId ? Number(r.tagId) : null,
            },
            { onConflict: 'chessboard_id' },
          )
        } else if (docId && !r.versionNumber) {
          // Если выбран документ, но не указана версия - выдаем ошибку
          throw new Error('Сохранение шифра проекта без указания версии невозможно!')
        } else {
          // Если ни документация, ни версия не выбраны, удаляем связь
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
      console.log('⏳ SAVE EXECUTION - Starting Promise.all execution') // LOG: начало выполнения промисов
      // ИСПРАВЛЕНИЕ: Выполняем промисы для новых и существующих строк отдельно
      const [newRowResults, updateResults] = await Promise.all([
        Promise.all(newRowPromises),
        Promise.all(updatePromises)
      ])
      console.log('✅ SAVE EXECUTION - All promises completed successfully') // LOG: завершение выполнения промисов

      console.log('🔄 SAVE POST - Refetching materials') // LOG: обновление материалов
      await refetchMaterials()

      const totalProcessed = newRows.length + existingRows.length
      const newRowsCreated = newRowResults.filter(id => id !== null).length
      const nullResults = newRowResults.filter(id => id === null).length
      console.log(`📊 SAVE RESULTS - Total processed: ${totalProcessed}, New rows created: ${newRowsCreated}, Failed: ${nullResults}, Existing updated: ${existingRows.length}`) // LOG: результаты сохранения

      if (newRowsCreated > 0 && existingRows.length > 0) {
        message.success(`Сохранено: ${newRowsCreated} новых строк, ${existingRows.length} изменений`)
      } else if (newRowsCreated > 0) {
        message.success(`Создано ${newRowsCreated} новых строк`)
      } else if (existingRows.length > 0) {
        message.success(`Обновлено ${existingRows.length} строк`)
      } else {
        message.success('Изменения сохранены')
      }

      console.log('🧹 SAVE CLEANUP - Clearing editing rows') // LOG: очистка редактируемых строк
      console.log(`📊 COUNT BEFORE CLEAR - tableRows: ${tableRows.length}, viewRows: ${viewRows.length}, editingRows: ${Object.keys(editingRows).length}`) // LOG: подсчет до очистки
      setEditingRows({})

      console.log('🔄 SAVE POST - Invalidating queries and refetching table data') // LOG: обновление данных таблицы
      // ИСПРАВЛЕНИЕ: Принудительно инвалидируем кэш запроса с точным совпадением queryKey
      console.log('🔧 INVALIDATION - Query key:', ['chessboard', appliedFilters, selectedVersions]) // LOG: используемый ключ для инвалидации
      queryClient.invalidateQueries({
        queryKey: ['chessboard', appliedFilters, selectedVersions],
        exact: true
      })
      // Также инвалидируем все связанные запросы комментариев
      queryClient.invalidateQueries({
        queryKey: ['chessboard-comments'],
        exact: false
      })
      console.log('✅ INVALIDATION - Cache invalidated successfully') // LOG: успешная инвалидация кеша

      // ИСПРАВЛЕНИЕ: Добавляем небольшую задержку для завершения транзакции в PostgreSQL
      console.log('⏳ SAVE POST - Waiting 100ms for transaction to complete') // LOG: ожидание завершения транзакции
      await new Promise(resolve => setTimeout(resolve, 100))

      const refetchResult = await refetch()
      console.log(`📊 COUNT AFTER REFETCH - Refetch returned ${refetchResult.data?.length || 0} records`) // LOG: количество записей после refetch
      console.log(`📊 COUNT AFTER REFETCH - Data should be updated now. Please check current counts`) // LOG: подсчет после обновления

      // LOG: Проверяем что новые записи появились в результате
      if (newRowsCreated > 0) {
        const expectedTotal = tableRows.length + newRowsCreated
        const actualTotal = refetchResult.data?.length || 0
        console.log(`🔍 VALIDATION - Expected ${expectedTotal} total records, got ${actualTotal}`) // LOG: проверка ожидаемого количества записей
        if (actualTotal >= expectedTotal) {
          console.log('✅ SUCCESS - New records are visible in the UI after refetch') // LOG: успешное отображение новых записей
        } else {
          console.log('⚠️  WARNING - New records might not be fully visible yet') // LOG: предупреждение о возможном недоотображении
        }
      }

      console.log('🎉 SAVE COMPLETE - HandleUpdate process finished successfully') // LOG: завершение процесса сохранения
      if (process.env.NODE_ENV === 'development') { // LOG: условное логирование для отладки
        console.log('✅ Успешно сохранено:', { newRows: newRowsCreated, updated: existingRows.length }) // LOG: результат сохранения
      }
    } catch (error: unknown) {
      console.error(`❌ ОШИБКА ПРИ СОХРАНЕНИИ:`, error)
      message.error(`Не удалось сохранить изменения: ${(error as Error).message}`)
    }
  }, [editingRows, message, refetch, appliedFilters, refetchMaterials, queryClient, selectedVersions])

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

      // ИСПРАВЛЕНИЕ: Принудительно инвалидируем кэш запроса перед refetch
      queryClient.invalidateQueries({
        queryKey: ['chessboard', appliedFilters, selectedVersions],
        exact: true
      })

      await refetch()
    },
    [message, refetch, queryClient, appliedFilters, selectedVersions],
  )

  const openImport = useCallback(() => {
    const loc =
      appliedFilters?.typeId && appliedFilters.typeId.length > 0
        ? costTypes?.find((t) => String(t.id) === appliedFilters.typeId![0])?.location_id
        : undefined
    const docId =
      appliedFilters?.documentationId && appliedFilters.documentationId.length === 1
        ? appliedFilters.documentationId[0]
        : undefined
    const versionId = docId && selectedVersions[docId] ? selectedVersions[docId] : undefined
    setImportState({
      projectId: appliedFilters?.projectId,
      blockId: appliedFilters?.blockId,
      categoryId: appliedFilters?.categoryId,
      typeId: appliedFilters?.typeId,
      locationId: loc ? String(loc) : undefined,
      tagId:
        appliedFilters?.tagId && appliedFilters.tagId.length === 1
          ? appliedFilters.tagId[0]
          : undefined,
      documentationId: docId,
      versionId: versionId,
    })
    setImportOpen(true)
  }, [appliedFilters, costTypes, selectedVersions])

  const handleImport = useCallback(async () => {
    const importStartTime = performance.now()
    // УДАЛЕН лог для оптимизации производительности

    if (!supabase || !importFile || !importState.projectId) {
      message.error('Выберите проект и файл')
      return
    }
    setIsImporting(true) // Включаем режим импорта
    setImportErrors({}) // Очищаем ошибки
    try {
      const data = await importFile.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheet = workbook.Sheets[workbook.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })
      const payload: {
        project_id: string
        material: string
        unit_id: string | null
        cost_category_code?: string
      }[] = []
      const additionalData: {
        quantityPd: number | null
        quantitySpec: number | null
        quantityRd: number | null
        block: string
        floors: string
        nomenclature: string
        supplier: string
        tagName: string
        docCode: string
        projectName: string
      }[] = []
      const header = rows[0]?.map((h) => String(h || '').toLowerCase()) ?? []
      const materialIdx = header.findIndex((h) => h.includes('материал'))
      const quantityPdIdx = header.findIndex((h) => h.includes('кол') && h.includes('пд'))
      const quantitySpecIdx = header.findIndex((h) => h.includes('кол') && h.includes('спек'))
      const quantityRdIdx = header.findIndex((h) => h.includes('кол') && h.includes('пересчет'))
      const unitIdx = header.findIndex((h) => h.includes('ед'))
      const blockIdx = header.findIndex((h) => h.includes('корпус'))
      const floorsIdx = header.findIndex((h) => h.includes('этаж'))
      const nomenclatureIdx = header.findIndex((h) => h.includes('номенклатур'))
      const supplierIdx = header.findIndex((h) => h.includes('поставщик'))
      // Индексы для разделов и шифров проектов
      const tagIdx = header.findIndex((h) => h.includes('раздел') || h.includes('tag'))
      const docCodeIdx = header.findIndex((h) => h.includes('шифр') || h.includes('том') || h.includes('документ'))
      const projectNameIdx = header.findIndex((h) => h.includes('название') && h.includes('проект'))
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

        // Извлекаем данные из всех столбцов
        const quantityPdCell = quantityPdIdx >= 0 ? row[quantityPdIdx] : undefined
        const quantitySpecCell = quantitySpecIdx >= 0 ? row[quantitySpecIdx] : undefined
        const quantityRdCell = quantityRdIdx >= 0 ? row[quantityRdIdx] : undefined
        const unitName = unitIdx >= 0 ? String(row[unitIdx] ?? '').trim() : ''
        const blockName = blockIdx >= 0 ? String(row[blockIdx] ?? '').trim() : ''
        const floorsValue = floorsIdx >= 0 ? String(row[floorsIdx] ?? '').trim() : ''
        const nomenclatureName =
          nomenclatureIdx >= 0 ? String(row[nomenclatureIdx] ?? '').trim() : ''
        const supplierName = supplierIdx >= 0 ? String(row[supplierIdx] ?? '').trim() : ''
        // Извлекаем раздел и шифр проекта из файла
        const tagName = tagIdx >= 0 ? String(row[tagIdx] ?? '').trim() : ''
        const docCode = docCodeIdx >= 0 ? String(row[docCodeIdx] ?? '').trim() : ''
        const projectNameFromFile = projectNameIdx >= 0 ? String(row[projectNameIdx] ?? '').trim() : ''

        // Парсим количественные данные
        const parseQuantity = (cell: string | number | null | undefined) => {
          if (cell == null || String(cell).trim() === '') return null
          const value = Number(String(cell).replace(',', '.'))
          return Number.isNaN(value) ? null : value
        }

        const quantityPd = parseQuantity(quantityPdCell)
        const quantitySpec = parseQuantity(quantitySpecCell)
        const quantityRd = parseQuantity(quantityRdCell)

        // Собираем статистику по количественным данным
        if (!quantityPd && !quantitySpec && !quantityRd) {
          setImportErrors((prev) => ({
            ...prev,
            'Строки без количественных данных': (prev['Строки без количественных данных'] || 0) + 1,
          }))
        }

        const unitId = unitName
          ? units?.find((u) => u.name.toLowerCase() === unitName.toLowerCase())?.id || null
          : null

        // Собираем статистику ошибок по единицам измерения
        if (!unitName) {
          setImportErrors((prev) => ({
            ...prev,
            'Пустые единицы измерения': (prev['Пустые единицы измерения'] || 0) + 1,
          }))
        } else if (!unitId) {
          setImportErrors((prev) => ({
            ...prev,
            'Неизвестные единицы измерения': (prev['Неизвестные единицы измерения'] || 0) + 1,
          }))
        }

        payload.push({
          project_id: importState.projectId,
          material: materialId,
          unit_id: unitId,
          cost_category_code:
            importState.categoryId && importState.categoryId.length > 0
              ? importState.categoryId[0]
              : undefined, // Оставляем пустым если не выбрано
        })

        // Автозаполнение названия проекта по шифру проекта
        let projectName = projectNameFromFile
        if (!projectName && docCode) {
          // Ищем название проекта по шифру в документации
          const foundDoc = documentations?.find(d =>
            d.project_code?.toLowerCase().includes(docCode.toLowerCase()) ||
            docCode.toLowerCase().includes(d.project_code?.toLowerCase() || '')
          )
          if (foundDoc && foundDoc.project_name) {
            projectName = foundDoc.project_name
          }
        }

        additionalData.push({
          quantityPd,
          quantitySpec,
          quantityRd,
          block: blockName,
          floors: floorsValue,
          nomenclature: nomenclatureName,
          supplier: supplierName,
          tagName: tagName,
          docCode: docCode,
          projectName: projectName,
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
      const mappings = inserted
        .map((d, idx) => {
          // Используем block из файла если есть, иначе из настроек импорта
          let blockId =
            importState.blockId && importState.blockId.length > 0
              ? importState.blockId[0]
              : undefined
          if (additionalData[idx].block && blocks) {
            const foundBlock = blocks.find(
              (b) => b.name.toLowerCase() === additionalData[idx].block.toLowerCase(),
            )
            if (foundBlock) {
              blockId = foundBlock.id
            } else {
              // Блок из файла не найден в справочнике
              setImportErrors((prev) => ({
                ...prev,
                'Неизвестные корпуса в файле': (prev['Неизвестные корпуса в файле'] || 0) + 1,
              }))
            }
          }

          // Если категория затрат не выбрана, не создаем mapping
          let categoryId: number | null = null

          // Правильная обработка categoryId в зависимости от типа
          if (importState.categoryId) {
            if (Array.isArray(importState.categoryId) && importState.categoryId.length > 0) {
              // Если это массив, берем первый элемент
              categoryId = Number(importState.categoryId[0])
            } else if (typeof importState.categoryId === 'string') {
              // Если это строка, преобразуем напрямую
              categoryId = Number(importState.categoryId)
            } else {
              // Если что-то другое, пытаемся преобразовать
              categoryId = Number(importState.categoryId)
            }
          }

          if (!categoryId) {
            setImportErrors((prev) => ({
              ...prev,
              'Строки без категории затрат': (prev['Строки без категории затрат'] || 0) + 1,
            }))
            return null // Не создаем mapping если нет категории
          }

          // Проверяем, что выбранная категория действительно существует в справочнике
          const categoryExists = costCategories?.some((cat) => cat.id === categoryId)
          if (!categoryExists) {
            setImportErrors((prev) => ({
              ...prev,
              'Несуществующие категории затрат': (prev['Несуществующие категории затрат'] || 0) + 1,
            }))
            return null // Не создаем mapping если категория не существует
          }

          // Проверяем тип затрат, если он выбран
          let typeId: number | null = null
          if (importState.typeId && importState.typeId.length > 0) {
            const selectedTypeId = Number(importState.typeId[0])
            const typeExists = costTypes?.find(
              (type) => type.id === selectedTypeId && type.cost_category_id === categoryId,
            )
            if (typeExists) {
              typeId = selectedTypeId
            } else {
              setImportErrors((prev) => ({
                ...prev,
                'Несоответствие видов затрат категориям':
                  (prev['Несоответствие видов затрат категориям'] || 0) + 1,
              }))
            }
          }

          return {
            chessboard_id: d.id,
            block_id: blockId || null,
            cost_category_id: categoryId,
            cost_type_id: typeId,
            location_id: importState.locationId ? Number(importState.locationId) : null,
          }
        })
        .filter((mapping): mapping is NonNullable<typeof mapping> => mapping !== null) // Фильтруем только валидные записи

      if (mappings.length > 0) {
        const { error: mapError } = await supabase!.from('chessboard_mapping').insert(mappings)
        if (mapError) {
          console.error('Ошибка вставки в chessboard_mapping:', mapError)
          throw mapError
        }
      }
      // Создаем mappings для этажей из Excel файла
      const floorMappings: {
        chessboard_id: string
        floor_number: number | null
        location_id: number | null
        quantityPd: number | null
        quantitySpec: number | null
        quantityRd: number | null
      }[] = []

      inserted.forEach((d, idx) => {
        const floors = parseFloorsString(additionalData[idx].floors)
        if (floors.length > 0) {
          // Если есть этажи из файла, создаем записи для каждого этажа
          const totalFloors = floors.length
          floors.forEach((floor) => {
            floorMappings.push({
              chessboard_id: d.id,
              floor_number: floor,
              location_id: importState.locationId ? Number(importState.locationId) : null,
              // Делим количество поровну между этажами
              quantityPd: additionalData[idx].quantityPd ? additionalData[idx].quantityPd / totalFloors : null,
              quantitySpec: additionalData[idx].quantitySpec ? additionalData[idx].quantitySpec / totalFloors : null,
              quantityRd: additionalData[idx].quantityRd ? additionalData[idx].quantityRd / totalFloors : null,
            })
          })
        } else {
          // Если этажей нет, создаем запись без этажа
          floorMappings.push({
            chessboard_id: d.id,
            floor_number: null,
            location_id: importState.locationId ? Number(importState.locationId) : null,
            quantityPd: additionalData[idx].quantityPd,
            quantitySpec: additionalData[idx].quantitySpec,
            quantityRd: additionalData[idx].quantityRd,
          })
        }
      })
      if (floorMappings.length > 0) {
        const { error: floorError } = await supabase!
          .from('chessboard_floor_mapping')
          .insert(floorMappings)
        if (floorError) {
          console.error('Ошибка вставки в chessboard_floor_mapping:', floorError)
          throw floorError
        }
      }

      // Создаем маппинги номенклатуры и поставщиков
      const nomenclatureMappings: {
        chessboard_id: string
        nomenclature_id: string
        supplier_name?: string
      }[] = []
      for (let i = 0; i < inserted.length; i++) {
        const recordId = inserted[i].id
        const nomenclature = additionalData[i].nomenclature
        const supplier = additionalData[i].supplier

        if (nomenclature || supplier) {
          // Попробуем найти или создать номенклатуру
          let nomenclatureId = null
          if (nomenclature) {
            const { data: existingNomenclature } = await supabase!
              .from('nomenclature')
              .select('id')
              .eq('name', nomenclature)
              .single()

            if (existingNomenclature) {
              nomenclatureId = existingNomenclature.id
            } else {
              const { data: newNomenclature, error: nomenclatureError } = await supabase!
                .from('nomenclature')
                .insert({ name: nomenclature })
                .select('id')
                .single()

              if (!nomenclatureError && newNomenclature) {
                nomenclatureId = newNomenclature.id
              }
            }
          }

          if (nomenclatureId) {
            nomenclatureMappings.push({
              chessboard_id: recordId,
              nomenclature_id: nomenclatureId,
              supplier_name: supplier || undefined,
            })
          }
        }
      }

      if (nomenclatureMappings.length > 0) {
        await supabase!.from('chessboard_nomenclature_mapping').insert(nomenclatureMappings)
      }

      // Создаем связи с документацией для каждой строки
      const tagCache = new Map<string, { id: number }>()
      const docCache = new Map<string, { id: string, projectName?: string }>()

      for (let idx = 0; idx < inserted.length; idx++) {
        const rowData = additionalData[idx]
        const chessboardId = inserted[idx].id

        // Приоритет: данные из файла > настройки импорта
        const rowTagName = rowData.tagName || ''
        const rowDocCode = rowData.docCode || ''
        const fallbackTagId = importState.tagId
        const fallbackDocId = importState.documentationId

        let tagId: number | null = null
        let documentationId: string | null = null

        // 1. Ищем раздел (tagId) из файла или fallback из настроек
        if (rowTagName) {
          // Ищем тег по названию
          if (!tagCache.has(rowTagName)) {
            const tag = sortedDocumentationTags?.find(t =>
              t.name.toLowerCase().includes(rowTagName.toLowerCase()) ||
              rowTagName.toLowerCase().includes(t.name.toLowerCase())
            )
            if (tag) {
              tagCache.set(rowTagName, { id: tag.id })
            } else {
              // Собираем ошибку: неизвестный раздел
              setImportErrors((prev) => ({
                ...prev,
                'Неизвестные разделы': (prev['Неизвестные разделы'] || 0) + 1,
              }))
              tagCache.set(rowTagName, { id: -1 }) // помечаем как не найденный
            }
          }
          const cachedTag = tagCache.get(rowTagName)
          if (cachedTag && cachedTag.id > 0) {
            tagId = cachedTag.id
          }
        } else if (fallbackTagId) {
          tagId = Number(fallbackTagId)
        }

        // 2. Ищем документ (documentationId) из файла или fallback из настроек
        if (rowDocCode) {
          // Ищем документ по коду
          if (!docCache.has(rowDocCode)) {
            const doc = documentations?.find(d =>
              d.project_code?.toLowerCase().includes(rowDocCode.toLowerCase()) ||
              rowDocCode.toLowerCase().includes(d.project_code?.toLowerCase() || '')
            )
            if (doc) {
              docCache.set(rowDocCode, { id: doc.id, projectName: doc.project_name })
            } else {
              // Собираем ошибку: неизвестный шифр проекта
              setImportErrors((prev) => ({
                ...prev,
                'Неизвестные шифры проектов': (prev['Неизвестные шифры проектов'] || 0) + 1,
              }))
              docCache.set(rowDocCode, { id: 'NOT_FOUND' }) // помечаем как не найденный
            }
          }
          const cachedDoc = docCache.get(rowDocCode)
          if (cachedDoc && cachedDoc.id !== 'NOT_FOUND') {
            documentationId = cachedDoc.id
          }
        } else if (fallbackDocId) {
          documentationId = fallbackDocId
        }

        // 3. Если нет документа, но есть раздел - создаем документ
        if (!documentationId && tagId && importState.projectId) {
          const docCode = rowDocCode || `DOC-${tagId}-${Date.now()}`
          const projectNameForDoc = rowData.projectName || undefined
          try {
            const doc = await documentationApi.upsertDocumentation(
              docCode,
              tagId,
              importState.projectId,
              undefined, // blockId
              undefined, // color
              undefined, // stage
              projectNameForDoc, // projectName из файла
            )
            documentationId = doc.id
            docCache.set(docCode, { id: doc.id, projectName: projectNameForDoc })
          } catch (error) {
            console.error('Ошибка создания документа:', error)
            continue
          }
        }

        // 4. Создаем связь если есть документ
        if (documentationId) {
          let versionId = importState.versionId

          // Если версия не выбрана, используем последнюю версию документа
          if (!versionId && documentVersions) {
            const existingVersion = documentVersions
              .filter((v) => v.documentation_id === documentationId)
              .sort((a, b) => b.version_number - a.version_number)[0]

            if (existingVersion) {
              versionId = existingVersion.id
            } else {
              // Создаем новую версию
              try {
                const { data: newVersion, error: versionError } = await supabase!
                  .from('documentation_versions')
                  .insert({
                    documentation_id: documentationId,
                    version_number: 1,
                  })
                  .select()
                  .single()

                if (versionError) {
                  console.error('Ошибка создания версии документа:', versionError)
                  continue
                } else {
                  versionId = newVersion.id
                }
              } catch (error) {
                console.error('Ошибка создания версии документа:', error)
                continue
              }
            }
          }

          // Создаем связь для этой конкретной строки
          if (versionId) {
            try {
              const { error: docError } = await supabase!
                .from('chessboard_documentation_mapping')
                .insert({
                  chessboard_id: chessboardId,
                  version_id: versionId,
                  // TODO: добавить tag_id после применения миграции
                  // tag_id: tagId,
                })
              if (docError) {
                console.error('Ошибка создания связи с документацией:', docError)
              }
            } catch (error) {
              console.error('Ошибка создания связи с документацией:', error)
            }
          }
        }
      }

      await refetchMaterials()

      // ИСПРАВЛЕНИЕ: Принудительно инвалидируем кэш запроса перед refetch
      queryClient.invalidateQueries({
        queryKey: ['chessboard', appliedFilters, selectedVersions],
        exact: true
      })

      await refetch()

      // Сначала закрываем модальное окно импорта
      setImportOpen(false)
      setImportFile(null)
      setImportState({})

      // Затем показываем модальное окно с результатами
      const importEndTime = performance.now()
      const importDuration = (importEndTime - importStartTime).toFixed(2)
      // УДАЛЕН лог для оптимизации производительности

      const hasErrors = Object.keys(importErrors).length > 0
      const totalErrors = Object.values(importErrors).reduce((sum, count) => sum + count, 0)

      modal[hasErrors ? 'warning' : 'success']({
        title: hasErrors ? 'Импорт завершен с предупреждениями' : 'Импорт завершен успешно!',
        content: (
          <div>
            <p>
              Успешно импортировано строк: <strong>{inserted.length}</strong>
            </p>
            {mappings.length > 0 && (
              <p>
                Создано связей с категориями: <strong>{mappings.length}</strong>
              </p>
            )}
            {hasErrors && (
              <div
                style={{ marginTop: 16, padding: 12, backgroundColor: '#fff2e8', borderRadius: 6 }}
              >
                <p style={{ fontWeight: 'bold', color: '#d46b08', marginBottom: 8 }}>
                  Предупреждения при импорте ({totalErrors} шт.):
                </p>
                {Object.entries(importErrors).map(([errorType, count]) => (
                  <div key={errorType} style={{ marginBottom: 4, fontSize: '14px' }}>
                    • {errorType}: <strong>{count} строк</strong>
                  </div>
                ))}
                <p style={{ fontSize: '12px', color: '#8c8c8c', marginTop: 8, marginBottom: 0 }}>
                  Данные предупреждения не влияют на работу системы, но могут требовать внимания.
                </p>
              </div>
            )}
            <p style={{ color: '#666', fontSize: '14px', marginTop: 16 }}>
              Данные были добавлены в таблицу согласно выбранным параметрам импорта.
            </p>
          </div>
        ),
        okText: 'ОК',
        width: 500,
        onOk: () => {
          setIsImporting(false) // Отключаем режим импорта только после закрытия окна результатов
        },
      })
    } catch (e) {
      console.error('Ошибка импорта:', e)
      const error = e as { code?: string; message?: string; details?: string }
      let errorMessage = 'Неизвестная ошибка'

      if (error?.code) {
        switch (error.code) {
          case '23503': // Foreign key violation
            if (error.details?.includes('cost_category_id')) {
              errorMessage =
                'Выбранная категория затрат не найдена в базе данных. Выберите другую категорию или обратитесь к администратору.'
            } else if (error.details?.includes('cost_type_id')) {
              errorMessage =
                'Выбранный вид затрат не найден в базе данных. Выберите другой вид затрат.'
            } else if (error.details?.includes('block_id')) {
              errorMessage = 'Выбранный корпус не найден в базе данных. Выберите другой корпус.'
            } else if (error.details?.includes('location_id')) {
              errorMessage = 'Выбранная локация не найдена в базе данных. Выберите другую локацию.'
            } else {
              errorMessage =
                'Ссылка на несуществующую запись в базе данных. Проверьте корректность выбранных данных.'
            }
            break
          case '23505': // Unique violation
            errorMessage = 'Данные уже существуют в базе данных. Проверьте на дублирование.'
            break
          case '23514': // Check constraint violation
            errorMessage =
              'Данные не соответствуют ограничениям базы данных. Проверьте корректность значений.'
            break
          default:
            errorMessage = error.message || 'Неизвестная ошибка базы данных'
        }
      } else if (error?.message) {
        errorMessage = error.message
      }

      modal.error({
        title: 'Ошибка импорта',
        content: (
          <div>
            <div style={{ marginBottom: 16 }}>{errorMessage}</div>
            {error?.details && (
              <div
                style={{ marginTop: 16, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}
              >
                <div
                  style={{ fontSize: '12px', color: '#666', fontWeight: 'bold', marginBottom: 8 }}
                >
                  Техническая информация:
                </div>
                <div style={{ fontSize: '12px', color: '#666', fontFamily: 'monospace' }}>
                  {error.details}
                </div>
              </div>
            )}
            <div style={{ marginTop: 16, fontSize: '14px', color: '#666' }}>
              Исправьте данные в форме импорта и попробуйте снова.
            </div>
          </div>
        ),
        okText: 'Понятно',
        width: 500,
      })
      setIsImporting(false) // Отключаем режим импорта при ошибке
      // Не закрываем модальное окно при ошибке, чтобы пользователь мог исправить данные
    }
  }, [
    importFile,
    importState,
    message,
    modal,
    refetch,
    units,
    refetchMaterials,
    blocks,
    costCategories,
    costTypes,
    documentVersions,
  ])

  const handleSave = async () => {
    const performanceStart = performance.now()
    // УДАЛЕН лог для оптимизации производительности

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
          ? {
              chessboard_id: d.id,
              nomenclature_id: rows[idx].nomenclatureId,
              supplier_name: rows[idx].supplier || null,
            }
          : null,
      )
      .filter(
        (
          m,
        ): m is { chessboard_id: string; nomenclature_id: string; supplier_name: string | null } =>
          m !== null,
      )
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

    // Сохраняем связь с версией документа
    for (let idx = 0; idx < data.length; idx++) {
      let docId = rows[idx].documentationId
      let versionId = null

      if (!docId && rows[idx].projectCode && rows[idx].tagId) {
        const doc = await documentationApi.upsertDocumentation(
          rows[idx].projectCode || '',
          Number(rows[idx].tagId),
          appliedFilters.projectId || '',
        )
        docId = doc.id
      }

      if (docId) {
        // Ищем существующую версию или создаём новую
        const versionNumber = rows[idx].versionNumber || 1
        let version = documentVersions?.find(
          (v) => v.documentation_id === docId && v.version_number === versionNumber,
        )

        if (!version) {
          // Создаем новую версию
          const { data: newVersion, error: versionError } = await supabase
            .from('documentation_versions')
            .insert({
              documentation_id: docId,
              version_number: versionNumber,
            })
            .select()
            .single()

          if (versionError) {
            console.error(`Не удалось создать версию документа: ${versionError.message}`)
            continue
          }
          version = newVersion
        }

        versionId = version?.id || ''
      }

      if (versionId) {
        const { error: docError } = await supabase.from('chessboard_documentation_mapping').insert({
          chessboard_id: data[idx].id,
          version_id: versionId,
          // TODO: добавить tag_id после применения миграции
          // tag_id: rows[idx].tagId ? Number(rows[idx].tagId) : null,
        })
        if (docError) {
          console.error(`Не удалось сохранить связь с версией документа: ${docError.message}`)
        }
      }
    }
    await refetchMaterials()

    const performanceEnd = performance.now()
    const duration = (performanceEnd - performanceStart).toFixed(2)
    // УДАЛЕН лог для оптимизации производительности

    message.success('Данные успешно сохранены')
    setMode('view')
    setRows([])

    // ИСПРАВЛЕНИЕ: Принудительно инвалидируем кэш запроса перед refetch
    queryClient.invalidateQueries({
      queryKey: ['chessboard', appliedFilters, selectedVersions],
      exact: true
    })

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
      maxWidth?: number
      align?: 'left' | 'right' | 'center'
    }> = [
      { title: 'Раздел', dataIndex: 'tagName', maxWidth: 120 },
      { title: 'Шифр проекта', dataIndex: 'projectCode' },
      { title: 'Название проекта', dataIndex: 'projectName' },
      { title: 'Вер.', dataIndex: 'versionNumber', width: 60, maxWidth: 60, align: 'center' },
      { title: 'Материал', dataIndex: 'material' },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd', maxWidth: 120, align: 'center' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec', maxWidth: 150, align: 'center' },
      {
        title: 'Кол-во по пересчету РД',
        dataIndex: 'quantityRd',
        maxWidth: 180,
        align: 'center',
      },
      { title: 'Номенклатура', dataIndex: 'nomenclatureId', maxWidth: 170 },
      { title: 'Наименование поставщика', dataIndex: 'supplier', maxWidth: 170 },
      { title: 'Ед.изм.', dataIndex: 'unitId' },
      { title: 'Корпус', dataIndex: 'block' },
      { title: 'Этажи', dataIndex: 'floors' },
      { title: 'Категория затрат', dataIndex: 'costCategoryId' },
      { title: 'Вид затрат', dataIndex: 'costTypeId' },
      { title: 'Наименование работ', dataIndex: 'rateId', maxWidth: 220 },
      { title: 'Локализация', dataIndex: 'locationId', maxWidth: 120 },
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
        // Убираем фильтры и сортировку для увеличения производительности

        const render: ColumnType<TableRow>['render'] = (_, record) => {
          if (record.isExisting) return record[col.dataIndex] as string
          switch (col.dataIndex) {
            case 'tagName':
              return (
                <Select
                  style={{ width: 200 }}
                  value={
                    record.tagId ||
                    (appliedFilters?.tagId?.length === 1 ? appliedFilters.tagId[0] : undefined)
                  }
                  onChange={(value) => {
                    handleRowChange(record.key, 'tagId', value)
                    const tag = sortedDocumentationTags.find((t) => String(t.id) === value)
                    handleRowChange(record.key, 'tagName', tag?.name ?? '')
                    handleRowChange(record.key, 'tagNumber', tag?.tag_number ?? null)
                    // Сбрасываем выбранный документ при смене тэга
                    handleRowChange(record.key, 'documentationId', '')
                    handleRowChange(record.key, 'projectCode', '')
                  }}
                  options={
                    appliedFilters?.tagId && appliedFilters.tagId.length > 0
                      ? sortedDocumentationTags
                          .filter((tag) => appliedFilters.tagId!.includes(String(tag.id)))
                          .map((tag) => ({
                            value: String(tag.id),
                            label: tag.name,
                          }))
                      : sortedDocumentationTags.map((tag) => ({
                          value: String(tag.id),
                          label: tag.name,
                        }))
                  }
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              )
            case 'documentationId':
              return (
                <Select
                  style={{ width: 150 }}
                  value={
                    record.documentationId ||
                    (appliedFilters?.documentationId?.length === 1
                      ? appliedFilters.documentationId[0]
                      : undefined)
                  }
                  onChange={(value) => {
                    handleRowChange(record.key, 'documentationId', value)
                    const doc = documentations?.find(
                      (d: DocumentationRecordForList) => d.id === value,
                    )
                    handleRowChange(record.key, 'projectCode', doc?.project_code ?? '')
                  }}
                  options={
                    documentations
                      ?.filter(
                        (doc: DocumentationRecordForList) =>
                          !record.tagId || String(doc.tag_id) === record.tagId,
                      )
                      .map((doc: DocumentationRecordForList) => ({
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
            case 'projectCode':
              // Отладка для режима добавления
              if (record.tagId && documentations?.length > 0) {
                console.log('🔧 ADD mode - Component documentations sample:', {
                  totalCount: documentations.length,
                  first3Detailed: documentations.slice(0, 3).map((doc) => {
                    console.log('🔧 Whole doc object:', doc)
                    return {
                      id: doc.id,
                      project_code: doc.project_code,
                      tag_id: doc.tag_id,
                      keys: Object.keys(doc),
                      wholeDoc: doc,
                    }
                  }),
                })

                const tagIds = documentations.slice(0, 5).map((doc) => ({
                  id: doc.id,
                  code: doc.project_code,
                  tag_id: doc.tag_id,
                  tag_name: doc.tag_name,
                  tag: doc.tag ? doc.tag.id : null,
                  actualTagId: doc.tag_id || (doc.tag ? doc.tag.id : null),
                }))
                const filteredDocs = documentations.filter((doc) => {
                  const docTagId = doc.tag_id
                  const selectedTagId = Number(record.tagId)
                  const actualTagId = docTagId || (doc.tag ? doc.tag.id : null)
                  return actualTagId === selectedTagId
                })
                console.log('🔧 ADD mode - ProjectCode dropdown:', {
                  searchingForTagId: record.tagId,
                  searchingForTagIdNum: Number(record.tagId),
                  totalDocs: documentations.length,
                  first5DocsTagInfo: tagIds,
                  filteredDocsCount: filteredDocs.length,
                  firstFilteredDoc: filteredDocs[0]
                    ? {
                        id: filteredDocs[0].id,
                        code: filteredDocs[0].project_code,
                        tag_id: filteredDocs[0].tag_id,
                        tag_name: filteredDocs[0].tag_name,
                        tag: filteredDocs[0].tag,
                      }
                    : null,
                  // Дополнительная отладка
                  allTagIds: [...new Set(documentations.map((doc) => doc.tag_id).filter(Boolean))],
                  allTagNames: [
                    ...new Set(documentations.map((doc) => doc.tag_name).filter(Boolean)),
                  ],
                  docsWithTag3: documentations
                    .filter((doc) => doc.tag_id === 3)
                    .map((doc) => ({
                      code: doc.project_code,
                      tag_id: doc.tag_id,
                      tag_name: doc.tag_name,
                    })),
                })
              }
              return (
                <Select
                  style={{ width: '100%' }}
                  placeholder="Шифр проекта"
                  allowClear
                  showSearch
                  value={record.projectCode}
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ maxWidth: 500 }}
                  onChange={(value) => {
                    const selectedDoc = documentations?.find((doc) => doc.project_code === value)
                    // Находим максимальную версию для выбранного документа
                    const maxVersion =
                      selectedDoc?.id && documentVersions
                        ? documentVersions
                            .filter((v) => v.documentation_id === selectedDoc.id)
                            .sort((a, b) => b.version_number - a.version_number)[0]
                        : null
                    handleRowChange(record.key, 'projectCode', value)
                    handleRowChange(record.key, 'projectName', selectedDoc?.project_name || '')
                    handleRowChange(record.key, 'documentationId', selectedDoc?.id || null)
                    handleRowChange(record.key, 'versionNumber', maxVersion?.version_number || null)
                  }}
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                  optionLabelProp="value"
                  options={
                    documentations
                      ?.filter((doc) => {
                        // Если нет выбранного раздела - показываем все документы
                        if (!record.tagId) {
                          // УДАЛЕН лог для оптимизации
                          return true
                        }

                        // Проверяем соответствие по ID тега (с fallback)
                        const docTagId = doc.tag_id
                        const selectedTagId = Number(record.tagId)

                        // Fallback: если у документа нет tag_id, но есть tag.id - используем его
                        const actualTagId = docTagId || (doc.tag ? doc.tag.id : null)
                        const matches = actualTagId === selectedTagId

                        if (!matches) {
                          console.log('🔧 ADD filter - Doc does not match:', {
                            docId: doc.id,
                            docCode: doc.project_code,
                            docTagId,
                            actualTagId,
                            selectedTagId,
                            matches,
                          })
                        }

                        return matches
                      })
                      .map((doc) => ({
                        value: doc.project_code,
                        label: `${doc.project_code} - ${doc.project_name || 'Без названия'}`,
                      })) ?? []
                  }
                  disabled={!record.tagId}
                />
              )
            case 'projectName':
              return (
                <span style={{ padding: '4px 8px' }}>
                  {record.projectName ||
                    (record.projectCode &&
                      documentations?.find((d) => d.project_code === record.projectCode)
                        ?.project_name) ||
                    '-'}
                </span>
              )
            case 'versionNumber':
              return (
                <Select
                  key={`select-versionNumber-${record.key}`}
                  style={{ width: 60 }}
                  placeholder="Вер."
                  allowClear
                  showSearch
                  value={record.versionNumber}
                  onChange={(value) => {
                    handleRowChange(record.key, 'versionNumber', value)
                  }}
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                  options={
                    documentVersions
                      ?.filter((version) => version.documentation_id === record.documentationId)
                      .map((version) => ({
                        value: version.version_number,
                        label: version.version_number.toString(),
                      })) ?? []
                  }
                  disabled={!record.documentationId}
                />
              )
            case 'material':
              return (
                <AutoComplete
                  style={{ width: 300 }}
                  popupMatchSelectWidth={300}
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
                <div style={{ position: 'relative', width: '250px', minHeight: '32px' }}>
                  <MLNomenclatureSelect
                    style={{ width: '100%' }}
                    materialName={record.material || ''}
                    context={{
                      projectId: appliedFilters?.projectId,
                      categoryId: record.costCategoryId,
                      typeId: record.costTypeId
                    }}
                    options={(() => {
                      const allNomenclature = [...(nomenclatures || [])]
                      if (record.nomenclatureId && record.nomenclature && !allNomenclature.some(n => n.id === record.nomenclatureId)) {
                        allNomenclature.push({ id: record.nomenclatureId, name: record.nomenclature })
                      }
                      return allNomenclature.map(n => ({ value: n.id, label: n.name }))
                    })()}
                    value={record.nomenclature}
                    onChange={(value, option) => {
                      if (option) {
                        // Обычный выбор из списка или ML предложение
                        handleRowChange(record.key, 'nomenclature', String(option?.label || option?.children?.props?.children?.[0] || value))
                        handleRowChange(record.key, 'nomenclatureId', String(value))
                        loadSupplierOptions(String(value), record.key)
                        handleRowChange(record.key, 'supplier', '')
                      } else {
                        // Ручной ввод
                        handleRowChange(record.key, 'nomenclature', value)
                        handleRowChange(record.key, 'nomenclatureId', '')
                      }
                    }}
                    onMLSuggestionSelect={(suggestion) => {
                      console.log('🤖 ML suggestion selected:', suggestion) // LOG: выбор ML предложения в шахматке
                      handleRowChange(record.key, 'nomenclature', suggestion.name)
                      handleRowChange(record.key, 'nomenclatureId', suggestion.id)
                      loadSupplierOptions(suggestion.id, record.key)
                      handleRowChange(record.key, 'supplier', '')
                    }}
                    filterOption={(input, option) => {
                      const text = (option?.label ?? '').toString()
                      return text.toLowerCase().includes(input.toLowerCase())
                    }}
                    allowClear
                    placeholder="ML-подбор номенклатуры по материалу..."
                  />
                </div>
              )
            case 'supplier':
              return (
                <div style={{ position: 'relative', width: '250px', minHeight: '32px' }}>
                  <MLSupplierSelect
                    style={{ width: '100%' }}
                    value={record.supplier || undefined}
                    onChange={(value) => handleRowChange(record.key, 'supplier', value)}
                    materialName={record.material || ''}
                    context={{
                      projectId: appliedFilters?.projectId,
                      categoryId: record.costCategoryId,
                      typeId: record.costTypeId
                    }}
                    onSupplierSelect={(supplierId, supplierName) => {
                      handleMLSupplierSelect(record.key, supplierId, supplierName, false)
                    }}
                    placeholder="Кликните для ML-подбора поставщика..."
                    allowClear
                    showSearch
                    filterOption={(input, option) => {
                      const text = (option?.label ?? '').toString()
                      return text.toLowerCase().includes(input.toLowerCase())
                    }}
                  />
                </div>
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
                  value={
                    record.blockId ||
                    (appliedFilters?.blockId?.length === 1 ? appliedFilters.blockId[0] : undefined)
                  }
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
                  value={
                    record.costCategoryId ||
                    (appliedFilters?.categoryId?.length === 1
                      ? appliedFilters.categoryId[0]
                      : undefined)
                  }
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
                          !appliedFilters?.categoryId ||
                          appliedFilters.categoryId.length === 0 ||
                          appliedFilters.categoryId.includes(String(c.id)),
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
                  value={
                    record.costTypeId ||
                    (appliedFilters?.typeId?.length === 1 ? appliedFilters.typeId[0] : undefined)
                  }
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
                        if (appliedFilters?.typeId && appliedFilters.typeId.length > 0)
                          return appliedFilters.typeId.includes(String(t.id))
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

        // Вычисляем динамическую ширину столбца
        const dynamicWidth = calculateColumnWidth(
          col.dataIndex as string,
          col.title,
          rows,
          col.maxWidth || 200,
        )

        return {
          ...col,
          title: createMultilineTitle(col.title),
          width: dynamicWidth,
          render,
        }
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
              <SimpleDeleteConfirm
                content={`Вы уверены, что хотите удалить строку "${record.material}"?`}
                onConfirm={() => handleDelete(record.key)}
              >
                <Button type="text" icon={<DeleteOutlined />} />
              </SimpleDeleteConfirm>
            </Space>
          ) : null,
      },
    ]
  }, [
    viewRows,
    rows,
    calculateColumnWidth,
    createMultilineTitle,
    handleRowChange,
    units,
    costCategories,
    costTypes,
    locations,
    blocks,
    sortedDocumentationTags,
    documentations,
    appliedFilters,
    startEdit,
    handleDelete,
    addRow,
    copyRow,
    deleteRow,
    hiddenCols,
    columnVisibility,
    columnOrder,
    nomenclatureDropdownWidth,
    getRateOptions,
    openFloorModal,
    supplierOptions,
    supplierDropdownWidths,
    loadSupplierOptions,
    materialOptions,
    handleMaterialBlur,
    documentVersions,
  ])

  const viewColumns: ColumnsType<ViewRow> = useMemo(() => {
    // Чекбокс колонка для режима удаления
    const checkboxColumn: ColumnType<ViewRow> | null = deleteMode
      ? {
          title: () => (
            <Checkbox
              checked={selectedRows.size === viewRows.length && viewRows.length > 0}
              indeterminate={selectedRows.size > 0 && selectedRows.size < viewRows.length}
              onChange={toggleSelectAll}
            />
          ),
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
      maxWidth?: number
      align?: 'left' | 'right' | 'center'
    }> = [
      { title: 'Раздел', dataIndex: 'tagName', maxWidth: 120 },
      { title: 'Шифр проекта', dataIndex: 'projectCode' },
      { title: 'Название проекта', dataIndex: 'projectName' },
      { title: 'Вер.', dataIndex: 'versionNumber', width: 60, maxWidth: 60, align: 'center' },
      { title: 'Материал', dataIndex: 'material' },
      { title: 'Кол-во по ПД', dataIndex: 'quantityPd', maxWidth: 120, align: 'center' },
      { title: 'Кол-во по спеке РД', dataIndex: 'quantitySpec', maxWidth: 150, align: 'center' },
      {
        title: 'Кол-во по пересчету РД',
        dataIndex: 'quantityRd',
        maxWidth: 180,
        align: 'center',
      },
      { title: 'Номенклатура', dataIndex: 'nomenclature', maxWidth: 170 },
      { title: 'Наименование поставщика', dataIndex: 'supplier', maxWidth: 170 },
      { title: 'Ед.изм.', dataIndex: 'unit' },
      { title: 'Комментарии', dataIndex: 'comments', width: 140, maxWidth: 140 },
      { title: 'Корпус', dataIndex: 'block' },
      { title: 'Этажи', dataIndex: 'floors' },
      { title: 'Категория затрат', dataIndex: 'costCategory' },
      { title: 'Вид затрат', dataIndex: 'costType' },
      { title: 'Наименование работ', dataIndex: 'workName', maxWidth: 220 },
      { title: 'Локализация', dataIndex: 'location', maxWidth: 120 },
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
        // Убираем фильтры для увеличения производительности

        const render: ColumnType<ViewRow>['render'] = (_, record): React.ReactNode => {
          const edit = editingRows[record.key]
          if (!edit) {
            if (col.dataIndex === 'comments') {
              const rowComments = record.comments || []
              if (rowComments.length === 0) {
                return (
                  <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => openCommentsModal(record.key)}
                    title="Добавить комментарий"
                  />
                )
              } else {
                // Показываем последний (самый новый) комментарий
                const latestComment = rowComments[0]
                return (
                  <div
                    style={{
                      width: '120px',
                      maxWidth: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      color: '#1890ff',
                      textDecoration: 'underline',
                      padding: '4px 0',
                    }}
                    onClick={() => openCommentsModal(record.key)}
                    title={latestComment.comment_text}
                  >
                    {latestComment.comment_text}
                  </div>
                )
              }
            }

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
                  {(() => {
                    const value = record[col.dataIndex as keyof ViewRow]
                    return Array.isArray(value) ? '' : value
                  })()}
                </Button>
              )
            }
            // Исключаем comments из обычного рендера - они обрабатываются выше
            if (col.dataIndex === 'comments') return null

            const value = record[col.dataIndex as keyof ViewRow]
            return Array.isArray(value) ? null : value
          }
          switch (col.dataIndex) {
            case 'tagName':
              return (
                <Select
                  key={`select-tagName-${record.key}`}
                  style={{ minWidth: 120, width: 'auto' }}
                  value={edit.tagId}
                  onChange={(value) => {
                    handleEditChange(record.key, 'tagId', value)
                    const tag = sortedDocumentationTags.find((t) => String(t.id) === value)
                    handleEditChange(record.key, 'tagName', tag?.name ?? '')
                    handleEditChange(record.key, 'tagNumber', tag?.tag_number ?? null)
                    // Сбрасываем выбранный документ при смене тэга
                    handleEditChange(record.key, 'documentationId', '')
                    handleEditChange(record.key, 'projectCode', '')
                  }}
                  options={sortedDocumentationTags.map((tag) => ({
                    value: String(tag.id),
                    label: tag.name,
                  }))}
                  allowClear
                  showSearch
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              )
            case 'documentationId':
              return (
                <Select
                  key={`select-documentationId-${record.key}`}
                  style={{ width: 150 }}
                  value={edit.documentationId}
                  onChange={(value) => {
                    handleEditChange(record.key, 'documentationId', value)
                    const doc = documentations?.find(
                      (d: DocumentationRecordForList) => d.id === value,
                    )
                    handleEditChange(record.key, 'projectCode', doc?.project_code ?? '')
                  }}
                  options={
                    documentations
                      ?.filter(
                        (doc: DocumentationRecordForList) =>
                          !edit.tagId || String(doc.tag_id) === edit.tagId,
                      )
                      .map((doc: DocumentationRecordForList) => ({
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
            case 'projectCode':
              // Отладка для режима редактирования
              if (edit.tagId && documentations?.length > 0) {
                const tagIds = documentations.slice(0, 5).map((doc) => ({
                  tag_id: doc.tag_id,
                  tag: doc.tag ? doc.tag.id : null,
                  actualTagId: doc.tag_id || (doc.tag ? doc.tag.id : null),
                }))
                const filteredDocs = documentations.filter((doc) => {
                  const docTagId = doc.tag_id
                  const selectedTagId = Number(edit.tagId)
                  const actualTagId = docTagId || (doc.tag ? doc.tag.id : null)
                  return actualTagId === selectedTagId
                })
              }
              return (
                <Select
                  key={`select-projectCode-${record.key}`}
                  style={{ width: '100%' }}
                  placeholder="Шифр проекта"
                  allowClear
                  showSearch
                  value={edit.projectCode}
                  popupMatchSelectWidth={false}
                  dropdownStyle={{ maxWidth: 500 }}
                  onChange={(value) => {
                    const selectedDoc = documentations?.find((doc) => doc.project_code === value)
                    // Находим максимальную версию для выбранного документа
                    const maxVersion =
                      selectedDoc?.id && documentVersions
                        ? documentVersions
                            .filter((v) => v.documentation_id === selectedDoc.id)
                            .sort((a, b) => b.version_number - a.version_number)[0]
                        : null
                    handleEditChange(record.key, 'projectCode', value)
                    handleEditChange(record.key, 'projectName', selectedDoc?.project_name || '')
                    handleEditChange(record.key, 'documentationId', selectedDoc?.id || null)
                    handleEditChange(
                      record.key,
                      'versionNumber',
                      maxVersion?.version_number || null,
                    )
                  }}
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                  optionLabelProp="value"
                  options={
                    documentations
                      ?.filter((doc) => {
                        // Если нет выбранного тега - показываем все документы
                        if (!edit.tagId) {
                          // УДАЛЕН избыточный лог для оптимизации производительности
                          return true
                        }

                        // Проверяем соответствие tag_id (с fallback)
                        const docTagId = doc.tag_id
                        const selectedTagId = Number(edit.tagId)

                        // Fallback: если у документа нет tag_id, но есть tag.id - используем его
                        const actualTagId = docTagId || (doc.tag ? doc.tag.id : null)
                        const matches = actualTagId === selectedTagId

                        // Skip non-matching documents

                        return matches
                      })
                      .map((doc) => ({
                        value: doc.project_code,
                        label: `${doc.project_code} - ${doc.project_name || 'Без названия'}`,
                      })) ?? []
                  }
                  disabled={!edit.tagId}
                />
              )
            case 'projectName':
              return (
                <span style={{ padding: '4px 8px' }}>
                  {edit.projectName ||
                    (edit.projectCode &&
                      documentations?.find((d) => d.project_code === edit.projectCode)
                        ?.project_name) ||
                    '-'}
                </span>
              )
            case 'versionNumber':
              return (
                <Select
                  key={`select-versionNumber-${record.key}`}
                  style={{ width: 60 }}
                  placeholder="Вер."
                  allowClear
                  showSearch
                  value={edit.versionNumber}
                  onChange={(value) => {
                    handleEditChange(record.key, 'versionNumber', value)
                  }}
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                  options={
                    documentVersions
                      ?.filter((version) => version.documentation_id === edit.documentationId)
                      .map((version) => ({
                        value: version.version_number,
                        label: version.version_number.toString(),
                      })) ?? []
                  }
                  disabled={!edit.documentationId}
                />
              )
            case 'material':
              return (
                <AutoComplete
                  style={{ width: 300 }}
                  popupMatchSelectWidth={300}
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
                  onBlur={() => handleMaterialBlur(record.key, edit.material, true)}
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
                <div style={{ position: 'relative', width: '250px', minHeight: '32px' }}>
                  <MLNomenclatureSelect
                    style={{ width: '100%' }}
                    materialName={edit.material || ''}
                    context={{
                      projectId: appliedFilters?.projectId,
                      categoryId: edit.costCategoryId,
                      typeId: edit.costTypeId
                    }}
                    options={(() => {
                      const allNomenclature = [...(nomenclatures || [])]
                      if (edit.nomenclatureId && record.nomenclature && !allNomenclature.some(n => n.id === edit.nomenclatureId)) {
                        allNomenclature.push({ id: edit.nomenclatureId, name: record.nomenclature })
                      }
                      return allNomenclature.map(n => ({ value: n.id, label: n.name }))
                    })()}
                    value={edit.nomenclature}
                    onChange={(value, option) => {
                      if (option) {
                        // Обычный выбор из списка или ML предложение
                        handleEditChange(record.key, 'nomenclature', String(option?.label || option?.children?.props?.children?.[0] || value))
                        handleEditChange(record.key, 'nomenclatureId', String(value))
                        loadSupplierOptions(String(value), record.key)
                        handleEditChange(record.key, 'supplier', '')
                      } else {
                        // Ручной ввод
                        handleEditChange(record.key, 'nomenclature', value)
                        handleEditChange(record.key, 'nomenclatureId', '')
                      }
                    }}
                    onMLSuggestionSelect={(suggestion) => {
                      console.log('🤖 ML suggestion selected in edit mode:', suggestion) // LOG: выбор ML предложения в режиме редактирования
                      handleEditChange(record.key, 'nomenclature', suggestion.name)
                      handleEditChange(record.key, 'nomenclatureId', suggestion.id)
                      loadSupplierOptions(suggestion.id, record.key)
                      handleEditChange(record.key, 'supplier', '')
                    }}
                    filterOption={(input, option) => {
                      const text = (option?.label ?? '').toString()
                      return text.toLowerCase().includes(input.toLowerCase())
                    }}
                    allowClear
                    placeholder="ML-подбор номенклатуры по материалу..."
                  />
                </div>
              )
            case 'supplier':
              return (
                <div style={{ position: 'relative', width: '250px', minHeight: '32px' }}>
                  <MLSupplierSelect
                    key={`ml-supplier-${record.key}`}
                    style={{ width: '100%' }}
                    value={edit.supplier || undefined}
                    onChange={(value) => handleEditChange(record.key, 'supplier', value)}
                    materialName={edit.material || record.material || ''}
                    context={{
                      projectId: appliedFilters?.projectId,
                      categoryId: edit.costCategoryId || record.costCategoryId,
                      typeId: edit.costTypeId || record.costTypeId
                    }}
                    onSupplierSelect={(supplierId, supplierName) => {
                      handleMLSupplierSelect(record.key, supplierId, supplierName, true)
                    }}
                    placeholder="Кликните для ML-подбора поставщика..."
                    allowClear
                    showSearch
                    filterOption={(input, option) => {
                      const text = (option?.label ?? '').toString()
                      return text.toLowerCase().includes(input.toLowerCase())
                    }}
                  />
                </div>
              )
            case 'unit':
              return (
                <Select
                  key={`select-unit-${record.key}`}
                  style={{ minWidth: 80, width: 'auto' }}
                  value={edit.unitId}
                  onChange={(value) => handleEditChange(record.key, 'unitId', value)}
                  options={units?.map((u) => ({ value: u.id, label: u.name })) ?? []}
                />
              )
            case 'block':
              return (
                <Select
                  key={`select-block-${record.key}`}
                  style={{ minWidth: 100, width: 'auto' }}
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
                  style={{ minWidth: 120, width: 'auto' }}
                  value={edit.floors}
                  onChange={(e) => handleEditChange(record.key, 'floors', e.target.value)}
                  placeholder="1,2,3 или 1-5"
                />
              )
            case 'costCategory':
              return (
                <Select
                  key={`select-costCategory-${record.key}`}
                  style={{ minWidth: 150, width: 'auto' }}
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
                  key={`select-costType-${record.key}`}
                  style={{ minWidth: 150, width: 'auto' }}
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
                  key={`select-workName-${record.key}`}
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
                  key={`select-location-${record.key}`}
                  style={{ minWidth: 130, width: 'auto' }}
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
              break
            default: {
              if (col.dataIndex === 'comments') return null
              const value = record[col.dataIndex as keyof ViewRow]
              return Array.isArray(value) ? null : value
            }
          }
        }

        // Вычисляем динамическую ширину столбца
        const dynamicWidth = calculateColumnWidth(
          col.dataIndex,
          col.title,
          viewRows,
          col.maxWidth || 200,
        )

        return {
          ...col,
          title: createMultilineTitle(col.title),
          width: dynamicWidth,
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
              <SimpleDeleteConfirm
                content={`Вы уверены, что хотите удалить строку "${record.material}"?`}
                onConfirm={() => handleDelete(record.key)}
              >
                <Button type="text" icon={<DeleteOutlined />} />
              </SimpleDeleteConfirm>
            </Space>
          )
        },
      },
    ]

    // Добавляем checkbox колонку в начало если включен режим удаления
    return checkboxColumn ? [checkboxColumn, ...finalColumns] : finalColumns
  }, [
    viewRows,
    calculateColumnWidth,
    createMultilineTitle,
    editingRows,
    handleEditChange,
    startEdit,
    handleDelete,
    units,
    blocks,
    costCategories,
    costTypes,
    locations,
    sortedDocumentationTags,
    documentations,
    hiddenCols,
    deleteMode,
    selectedRows,
    toggleRowSelection,
    toggleSelectAll,
    columnVisibility,
    columnOrder,
    getRateOptions,
    openFloorModal,
    nomenclatureDropdownWidth,
    supplierOptions,
    supplierDropdownWidths,
    loadSupplierOptions,
    materialOptions,
    handleMaterialBlur,
    openCommentsModal,
    documentVersions,
  ])

  // Инициализация порядка и видимости столбцов
  const allColumns = useMemo(
    () => [
      { key: 'tagName', title: 'Раздел' },
      { key: 'projectCode', title: 'Шифр проекта' },
      { key: 'projectName', title: 'Название проекта' },
      { key: 'versionNumber', title: 'Вер.' },
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
      { key: 'comments', title: 'Комментарии' },
    ],
    [],
  )

  // Инициализация состояния видимости столбцов при первой загрузке
  useMemo(() => {
    // Проверяем версию схемы столбцов
    const COLUMN_SCHEMA_VERSION = '1.1' // Увеличиваем версию для обновления порядка
    const savedVersion = localStorage.getItem('chessboard-column-schema-version')

    // Если версия не совпадает, сбрасываем настройки
    if (savedVersion !== COLUMN_SCHEMA_VERSION) {
      localStorage.removeItem('chessboard-column-visibility')
      localStorage.removeItem('chessboard-column-order')
      localStorage.removeItem('chessboard-column-order-v2')
      localStorage.setItem('chessboard-column-schema-version', COLUMN_SCHEMA_VERSION)
    }

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
        // Добавляем новые столбцы в правильные позиции
        if (missingColumns.length > 0) {
          const tagNameCol = missingColumns.find((c) => c.key === 'tagName')
          const projectCodeCol = missingColumns.find((c) => c.key === 'projectCode')
          const projectNameCol = missingColumns.find((c) => c.key === 'projectName')
          const versionNumberCol = missingColumns.find((c) => c.key === 'versionNumber')

          // Создаем правильный порядок
          const newOrder = []
          const remainingMissing = [...missingColumns]

          // 1. tagName в начало
          if (tagNameCol) {
            newOrder.push('tagName')
            remainingMissing.splice(remainingMissing.indexOf(tagNameCol), 1)
          }

          // 2. projectCode после tagName
          if (projectCodeCol) {
            newOrder.push('projectCode')
            remainingMissing.splice(remainingMissing.indexOf(projectCodeCol), 1)
          }

          // 3. projectName после projectCode
          if (projectNameCol) {
            newOrder.push('projectName')
            remainingMissing.splice(remainingMissing.indexOf(projectNameCol), 1)
          }

          // 4. versionNumber после projectName
          if (versionNumberCol) {
            newOrder.push('versionNumber')
            remainingMissing.splice(remainingMissing.indexOf(versionNumberCol), 1)
          }

          // 5. Вставляем существующие столбцы, но учитываем новую структуру
          const updatedParsed = []
          for (const colKey of parsed) {
            if (colKey === 'tagName' && !newOrder.includes('tagName')) {
              newOrder.push('tagName')
            } else if (colKey === 'projectCode' && !newOrder.includes('projectCode')) {
              newOrder.push('projectCode')
              // После projectCode добавляем projectName если он есть в новых столбцах
              if (projectNameCol && !newOrder.includes('projectName')) {
                newOrder.push('projectName')
                remainingMissing.splice(remainingMissing.indexOf(projectNameCol), 1)
              }
              // После projectName добавляем versionNumber если он есть в новых столбцах
              if (versionNumberCol && !newOrder.includes('versionNumber')) {
                newOrder.push('versionNumber')
                remainingMissing.splice(remainingMissing.indexOf(versionNumberCol), 1)
              }
            } else if (
              colKey !== 'tagName' &&
              colKey !== 'projectCode' &&
              colKey !== 'projectName'
            ) {
              updatedParsed.push(colKey)
            }
          }

          newOrder.push(...updatedParsed)

          // 5. Оставшиеся новые столбцы в конец
          newOrder.push(...remainingMissing.map((c) => c.key))

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
    <DropdownPortalManager>
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          minHeight: 0,
        }}
      >
        {/* ML Шахматка заголовок */}
        <div style={{
          marginBottom: '16px',
          padding: '12px 20px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          color: 'white',
          boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold' }}>🤖 ML Шахматка</span>
            <span style={{
              fontSize: '10px',
              background: 'rgba(255,255,255,0.25)',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: '600'
            }}>
              ЭКСПЕРИМЕНТ
            </span>
            <span style={{ fontSize: '13px', marginLeft: 'auto', opacity: 0.95 }}>
              Умный подбор номенклатуры по материалам
            </span>
            <button
              onClick={() => setMLConfigOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                color: 'white',
                padding: '4px 8px',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Настройки ML алгоритма"
            >
              ⚙️ Настройки
            </button>
          </div>

          <div style={{ fontSize: '11px', opacity: 0.9, lineHeight: '1.3' }}>
            <strong>ML-стек:</strong> Levenshtein Distance + PostgreSQL ILIKE + многоэтапный поиск (точное → по словам → fallback) |
            <strong> Архитектура:</strong> FSD + TanStack Query + React Hooks, confidence 0.25-0.95, кэш 30с
          </div>
        </div>
      {/* Индикатор ошибки загрузки данных */}
      {isError && tableDataError && (
        <div
          style={{
            margin: '16px 0',
            padding: '12px',
            backgroundColor: '#fff2f0',
            border: '1px solid #ffccc7',
            borderRadius: '6px',
            color: '#cf1322',
          }}
        >
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ошибка загрузки данных</div>
          <div style={{ fontSize: '14px' }}>{tableDataError.message || 'Неизвестная ошибка'}</div>
          <Button
            size="small"
            type="primary"
            style={{ marginTop: '8px' }}
            onClick={() => {
              // ИСПРАВЛЕНИЕ: Принудительно инвалидируем кэш запроса перед refetch
              queryClient.invalidateQueries({
                queryKey: ['chessboard', appliedFilters, selectedVersions],
                exact: true
              })
              refetch()
            }}
          >
            Повторить попытку
          </Button>
        </div>
      )}

      <div className="filters" style={{ flexShrink: 0, paddingBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
          <Space align="center" size="middle">
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
            {filters.projectId && (
              <>
                <Select
                  placeholder="Раздел"
                  style={{ width: 200 }}
                  value={filters.tagId}
                  onChange={(value) =>
                    setFilters((f) => ({ ...f, tagId: value, documentationId: undefined }))
                  }
                  options={sortedDocumentationTags.map((tag) => ({
                    value: String(tag.id),
                    label: tag.name,
                  }))}
                  allowClear
                  showSearch
                  mode="multiple"
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
                    filterDocumentations
                      ?.filter(
                        (doc: DocumentationRecordForList) =>
                          !filters.tagId ||
                          filters.tagId.length === 0 ||
                          (doc.tag_id !== null && filters.tagId.includes(String(doc.tag_id))),
                      )
                      .map((doc: DocumentationRecordForList) => ({
                        value: doc.id,
                        label: doc.project_code,
                      })) ?? []
                  }
                  disabled={!filters.tagId || filters.tagId.length === 0}
                  allowClear
                  showSearch
                  mode="multiple"
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              </>
            )}
            <Button type="primary" size="large" onClick={handleApply} disabled={!filters.projectId}>
              Применить
            </Button>
            {appliedFilters?.documentationId && appliedFilters.documentationId.length > 0 && (
              <Button size="large" onClick={openVersionsModal}>
                Версии
              </Button>
            )}
            <Badge
              count={
                [
                  filters.blockId && filters.blockId.length > 0 ? filters.blockId : null,
                  filters.categoryId && filters.categoryId.length > 0 ? filters.categoryId : null,
                  filters.typeId && filters.typeId.length > 0 ? filters.typeId : null,
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
                <>
                  <Space.Compact>
                    <Button onClick={openSetsModal}>Комплект</Button>
                    <Tooltip
                      title={
                        matchedSet
                          ? `Найден комплект №${matchedSet.set_number}${
                              matchedSet.name ? `: ${matchedSet.name}` : ''
                            }`
                          : null
                      }
                    >
                      <Select
                        placeholder={
                          matchedSet
                            ? `Комплект №${matchedSet.set_number}${matchedSet.name ? `: ${matchedSet.name}` : ''}${matchedSet.status ? ` (${matchedSet.status.name})` : ''}`
                            : 'Выберите статус'
                        }
                        style={{
                          width: 200,
                          borderColor: matchedSet ? '#1890ff' : undefined,
                        }}
                        value={selectedSetStatus}
                        onChange={handleSetStatusChange}
                        allowClear
                        showSearch
                        filterOption={(input, option) => {
                          const status = setStatuses?.find((s) => s.id === option?.value)
                          return status?.name.toLowerCase().includes(input.toLowerCase()) || false
                        }}
                        options={setStatuses?.map((status) => ({
                          value: status.id,
                          label: status.name,
                          status: status,
                        }))}
                        optionRender={(option) => {
                          const status = option.data.status as ChessboardSetStatus
                          const color = normalizeColorToHex(status.color)
                          return (
                            <Space>
                              <div
                                style={{
                                  width: 12,
                                  height: 12,
                                  backgroundColor: color,
                                  borderRadius: 2,
                                  border: '1px solid #d9d9d9',
                                  display: 'inline-block',
                                }}
                              />
                              {status.name}
                            </Space>
                          )
                        }}
                        suffixIcon={
                          matchedSet && matchedSet.status ? (
                            <div
                              style={{
                                width: 12,
                                height: 12,
                                backgroundColor: normalizeColorToHex(matchedSet.status.color),
                                borderRadius: 2,
                                border: '1px solid #d9d9d9',
                                marginRight: 4,
                                flexShrink: 0,
                              }}
                            />
                          ) : undefined
                        }
                      />
                    </Tooltip>
                  </Space.Compact>
                  <Button type="primary" icon={<PlusOutlined />} onClick={startAdd}>
                    Добавить
                  </Button>
                </>
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
            {deleteMode && (
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
                  mode="multiple"
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
                  mode="multiple"
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
                  options={(() => {
                    const availableTypes =
                      costTypes
                        ?.filter(
                          (t) =>
                            !filters.categoryId ||
                            filters.categoryId.length === 0 ||
                            filters.categoryId.includes(String(t.cost_category_id)),
                        )
                        .map((t) => ({ value: String(t.id), label: t.name })) ?? []

                    return availableTypes
                  })()}
                  disabled={!filters.categoryId || filters.categoryId.length === 0}
                  allowClear
                  showSearch
                  mode="multiple"
                  filterOption={(input, option) => {
                    const text = (option?.label ?? '').toString()
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                />
              </Space>
              <Space>
                <Button icon={<SettingOutlined />} onClick={() => setColumnsSettingsOpen(true)}>
                  Настройка столбцов
                </Button>
              </Space>
            </div>

          </Card>
        )}
      </div>


      {/* Таблица */}
      {appliedFilters && (
        <div
          className="table-host chessboard-table"
          style={{
            borderRadius: '6px',
          }}
        >
          {mode === 'add' ? (
            <ChessboardOptimized
              originalTable={
                <Table<TableRow>
                  dataSource={tableRows}
                  columns={orderedAddColumns}
                  pagination={true}
                  rowKey="key"
                  sticky
                  scroll={{
                    x: 'max-content',
                  }}
                  rowClassName={(record) => (record.color ? `row-${record.color}` : '')}
                />
              }
              data={tableRows}
              columns={orderedAddColumns}
              loading={false}
              useVirtualization={useVirtualization}
              performanceMode={performanceMode}
              displayRowLimit={displayRowLimit}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              editingRows={{}} // Режим добавления не использует editingRows
            />
          ) : (
            <ChessboardOptimized
              originalTable={
                <Table<TableRow>
                  dataSource={tableRows}
                  columns={orderedViewColumns}
                  pagination={true}
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
              }
              data={tableRows}
              columns={orderedViewColumns}
              loading={false}
              useVirtualization={useVirtualization}
              onVirtualizationChange={handleVirtualizationChange}
              virtualRowHeight={virtualRowHeight}
              performanceMode={performanceMode}
              onPerformanceModeChange={handlePerformanceModeChange}
              displayRowLimit={displayRowLimit}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={handleRowsPerPageChange}
              editingRows={editingRows}
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
          <div>Название проекта: {floorModalInfo.projectName || '-'}</div>
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
          setIsImporting(false) // Отключаем режим импорта при отмене
        }}
        onOk={handleImport}
        okText="Импорт"
        cancelText="Отмена"
        okButtonProps={{ disabled: !importFile || !importState.projectId }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong style={{ fontSize: '16px' }}>
              Столбцы для импорта:
            </Typography.Text>
            <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f5f5f5', borderRadius: 6 }}>
              <Typography.Text style={{ fontSize: '14px' }}>
                Данные будут загружены из следующих столбцов Excel (любые столбцы могут быть
                пустыми):
              </Typography.Text>
              <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                <li>Раздел</li>
                <li>Шифр проекта</li>
                <li>Корпус</li>
                <li>Этажи</li>
                <li>Материал</li>
                <li>Кол-во по ПД</li>
                <li>Кол-во по спеке РД</li>
                <li>Кол-во по пересчету РД</li>
                <li>Номенклатура</li>
                <li>Наименование поставщика</li>
                <li>Ед.изм.</li>
              </ul>
              <Typography.Text style={{ fontSize: '12px', color: '#666' }}>
                Система автоматически найдет соответствующие столбцы по названиям
              </Typography.Text>
            </div>
          </div>
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
            onChange={(value) => {
              setImportState((s) => ({
                ...s,
                categoryId: value || undefined,
                typeId: undefined,
                locationId: undefined,
              }))
            }}
            popupMatchSelectWidth={false}
            options={(() => {
              const options =
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
              return options
            })()}
          />
          <Select
            placeholder="Вид затрат"
            style={{ width: '100%' }}
            value={importState.typeId}
            onChange={(value) => {
              const loc = costTypes?.find((t) => {
                const typeValue =
                  Array.isArray(value) && value.length > 0 ? value[0] : (value as unknown as string)
                return String(t.id) === typeValue
              })?.location_id
              setImportState((s) => ({
                ...s,
                typeId: value || undefined,
                locationId: loc ? String(loc) : undefined,
              }))
            }}
            options={
              costTypes
                ?.filter(
                  (t) =>
                    !importState.categoryId ||
                    importState.categoryId.length === 0 ||
                    importState.categoryId.includes(String(t.cost_category_id)),
                )
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
          <Select
            placeholder="Раздел"
            style={{ width: '100%' }}
            value={importState.tagId}
            onChange={(value) =>
              setImportState((s) => ({
                ...s,
                tagId: value || undefined,
                documentationId: undefined,
              }))
            }
            options={sortedDocumentationTags.map((tag) => ({
              value: String(tag.id),
              label: tag.name,
            }))}
            allowClear
            showSearch
            filterOption={(input, option) => {
              const text = (option?.label ?? '').toString()
              return text.toLowerCase().includes(input.toLowerCase())
            }}
          />
          <Select
            placeholder="Шифр тома"
            style={{ width: '100%' }}
            value={importState.documentationId}
            onChange={(value) =>
              setImportState((s) => ({
                ...s,
                documentationId: value || undefined,
                versionId: undefined,
              }))
            }
            options={
              documentations
                ?.filter(
                  (doc: DocumentationRecordForList) =>
                    !importState.tagId ||
                    (doc.tag_id !== null && String(doc.tag_id) === importState.tagId),
                )
                .map((doc: DocumentationRecordForList) => ({
                  value: doc.id,
                  label: doc.project_code,
                })) ?? []
            }
            disabled={!importState.tagId}
            allowClear
            showSearch
            filterOption={(input, option) => {
              const text = (option?.label ?? '').toString()
              return text.toLowerCase().includes(input.toLowerCase())
            }}
          />
          <Select
            placeholder="Версия"
            style={{ width: '100%' }}
            value={importState.versionId}
            onChange={(value) => setImportState((s) => ({ ...s, versionId: value || undefined }))}
            options={
              documentVersions
                ?.filter((version) => version.documentation_id === importState.documentationId)
                .sort((a, b) => b.version_number - a.version_number)
                .map((version) => ({
                  value: version.id,
                  label: `Версия ${version.version_number}`,
                })) ?? []
            }
            disabled={!importState.documentationId}
            allowClear
            showSearch
            filterOption={(input, option) => {
              const text = (option?.label ?? '').toString()
              return text.toLowerCase().includes(input.toLowerCase())
            }}
          />
        </Space>
      </Modal>

      {/* Модальное окно комментариев */}
      <Modal
        title="Комментарии"
        open={commentsModalOpen}
        onCancel={closeCommentsModal}
        footer={null}
        width={600}
      >
        <div style={{ marginBottom: 16 }}>
          <Input.TextArea
            value={newCommentText}
            onChange={(e) => setNewCommentText(e.target.value)}
            placeholder={
              editingCommentId ? 'Редактировать комментарий...' : 'Добавить комментарий...'
            }
            rows={3}
            style={{ marginBottom: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            {editingCommentId && (
              <Button
                onClick={() => {
                  setEditingCommentId(null)
                  setNewCommentText('')
                }}
              >
                Отмена
              </Button>
            )}
            <Button type="primary" onClick={saveComment} disabled={!newCommentText.trim()}>
              {editingCommentId ? 'Сохранить' : 'Добавить'}
            </Button>
          </div>
        </div>

        {comments.length > 0 && (
          <div>
            <Typography.Title level={5}>Все комментарии:</Typography.Title>
            {comments.map((comment) => (
              <Card key={comment.id} size="small" style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <Typography.Text>{comment.comment_text}</Typography.Text>
                    <div style={{ marginTop: 4, fontSize: '12px', color: '#666' }}>
                      Создан: {new Date(comment.created_at).toLocaleString('ru')}
                      {comment.updated_at !== comment.created_at && (
                        <span> • Изменен: {new Date(comment.updated_at).toLocaleString('ru')}</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => startEditComment(comment)}
                    />
                    <SimpleDeleteConfirm
                      title="Удалить комментарий?"
                      content="Вы уверены, что хотите удалить этот комментарий?"
                      onConfirm={() => deleteComment(comment.id)}
                    >
                      <Button type="text" size="small" icon={<DeleteOutlined />} danger />
                    </SimpleDeleteConfirm>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Modal>

      {/* Модальное окно версий документов */}
      <Modal
        title="Выбор версий документов"
        open={versionsModalOpen}
        onCancel={closeVersionsModal}
        onOk={applyVersions}
        width={800}
        okText="Применить версии"
        cancelText="Отмена"
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          {documentations
            ?.filter((doc) => appliedFilters?.documentationId?.includes(doc.id))
            .map((doc) => {
              const docVersions =
                documentVersions?.filter((v) => v.documentation_id === doc.id) || []
              return (
                <Card key={doc.id} size="small" style={{ marginBottom: 16 }}>
                  <Typography.Title level={5} style={{ marginBottom: 8 }}>
                    Шифр: {doc.project_code}
                  </Typography.Title>
                  {docVersions.length > 0 ? (
                    <Select
                      placeholder="Выберите версию"
                      style={{ width: '100%' }}
                      value={selectedVersions[doc.id]}
                      onChange={(value) => handleVersionSelect(doc.id, value)}
                      options={docVersions.map((version) => ({
                        value: version.id,
                        label: (
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <span>Версия {version.version_number}</span>
                            <div
                              style={{ display: 'flex', gap: 8, fontSize: '12px', color: '#666' }}
                            >
                              {version.issue_date && (
                                <span>{new Date(version.issue_date).toLocaleDateString('ru')}</span>
                              )}
                              <span
                                style={{
                                  color:
                                    version.status === 'filled_recalc'
                                      ? '#52c41a'
                                      : version.status === 'filled_spec'
                                        ? '#1890ff'
                                        : version.status === 'vor_created'
                                          ? '#722ed1'
                                          : '#faad14',
                                }}
                              >
                                {version.status === 'filled_recalc'
                                  ? 'Заполнено (пересчет)'
                                  : version.status === 'filled_spec'
                                    ? 'Заполнено (спец.)'
                                    : version.status === 'vor_created'
                                      ? 'ВОР создан'
                                      : 'Не заполнено'}
                              </span>
                            </div>
                          </div>
                        ),
                      }))}
                    />
                  ) : (
                    <Typography.Text type="secondary">Версии не найдены</Typography.Text>
                  )}
                </Card>
              )
            })}
        </div>
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

      {/* Модальное окно со списком комплектов */}
      <ChessboardSetsModal
        open={setsModalOpen}
        onClose={() => setSetsModalOpen(false)}
        projectId={appliedFilters?.projectId}
        onSelectSet={applySetFilters}
        currentSetId={matchedSet?.id || null}
      />

      {/* Модальное окно для ввода названия комплекта */}
      <Modal
        title="Название комплекта"
        open={setNameModalOpen}
        onOk={handleSetNameConfirm}
        onCancel={() => {
          setSetNameModalOpen(false)
          setPendingStatusId(undefined)
          setSetNameInput('')
          setSelectedSetStatus(undefined)
        }}
        okText="Создать"
        cancelText="Отмена"
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Text>Выберите название из справочника или введите свое:</Text>
          </div>

          {/* Выбор из существующих названий документации */}
          <Select
            placeholder="Выберите название из документации"
            style={{ width: '100%' }}
            allowClear
            showSearch
            value={setNameInput || undefined}
            onChange={(value) => setSetNameInput(value || '')}
            filterOption={(input, option) => {
              const text = option?.label?.toString() || ''
              return text.toLowerCase().includes(input.toLowerCase())
            }}
            options={documentations
              ?.filter(
                (doc) => appliedFilters?.documentationId?.includes(doc.id) && doc.project_name,
              )
              .map((doc) => ({
                value: doc.project_name,
                label: doc.project_name,
              }))
              .filter(
                (option, index, self) =>
                  // Убираем дубликаты по названию
                  option.value && index === self.findIndex((o) => o.value === option.value),
              )}
          />

          {/* Или ввод произвольного названия */}
          <Input
            placeholder="Или введите свое название"
            value={setNameInput}
            onChange={(e) => setSetNameInput(e.target.value)}
            onPressEnter={handleSetNameConfirm}
          />

          <div>
            <Text type="secondary">
              Название будет использоваться для идентификации комплекта. Если оставить пустым, будет
              использован номер комплекта.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Панель настроек ML */}
      <MLConfigPanel
        open={mlConfigOpen}
        onClose={() => setMLConfigOpen(false)}
        onConfigChange={(newConfig) => {
          console.log('🤖 ML Config updated:', newConfig) // LOG: обновление конфигурации ML
          // Можно добавить дополнительную логику обновления UI здесь
        }}
      />
      </div>
    </DropdownPortalManager>
  )
}
