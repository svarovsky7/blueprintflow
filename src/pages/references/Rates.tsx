import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Table,
  Button,
  Select,
  Space,
  Upload,
  Checkbox,
  Modal,
  Typography,
  Drawer,
  List,
  Input,
  Empty,
  App,
  InputNumber,
  Progress,
  AutoComplete,
} from 'antd'
import {
  UploadOutlined,
  SettingOutlined,
  InboxOutlined,
  FilterOutlined,
  CaretUpFilled,
  CaretDownFilled,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SaveOutlined,
  CloseOutlined,
  CopyOutlined,
  ArrowDownOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { ColumnsType } from 'antd/es/table'
import type { UploadFile } from 'antd/es/upload'
import * as XLSX from 'xlsx'
import {
  getAllWorkSetRates,
  getAllWorkSets,
  createWorkSetRateFromForm,
  updateWorkSetRateFromForm,
  bulkCreateWorkSetRatesFromForm,
  bulkUpdateWorkSetRatesFromForm,
  bulkDeleteWorkSetRates,
  deleteWorkSetRateById,
  type WorkSetRateWithRelations,
  type WorkSetRateExcelRow,
  type WorkSetRateFormData,
  type WorkSet,
} from '@/entities/rates'
import { supabase } from '@/lib/supabase'
import { useScale } from '@/shared/contexts/ScaleContext'
import { parseNumberWithSeparators } from '@/shared/lib'
// import ConflictResolutionDialog from '@/components/ConflictResolutionDialog'

const { Text, Title } = Typography

type TableMode = 'view' | 'add' | 'edit' | 'delete'

interface ConflictItem {
  row: WorkSetRateExcelRow
  existing: WorkSetRateWithRelations
  index: number
}

interface RateTableRow extends Omit<WorkSetRateWithRelations, 'work_name' | 'work_set'> {
  isNew?: boolean
  isEditing?: boolean
  // Поля для поддержки как объектов (из БД), так и строк (для новых строк)
  work_name?: string | { id: string; name: string }
  work_set?: string | { id: string; name: string; active: boolean }
}

// Настройки столбцов по умолчанию
const defaultColumnVisibility = {
  work_name: true,
  work_set: true,
  cost_category: true,
  detail_cost_category: true,
  unit: true,
  base_rate: true,
  active: true,
  actions: true,
}

const defaultColumnOrder = [
  'work_name',
  'work_set',
  'cost_category',
  'detail_cost_category',
  'unit',
  'base_rate',
  'active',
  'actions',
]

export default function Rates() {
  const { message } = App.useApp()
  const { scale } = useScale()
  const queryClient = useQueryClient()

  // Основные состояния
  const [mode, setMode] = useState<TableMode>('view')
  const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<Set<string>>(new Set())
  const [newRows, setNewRows] = useState<RateTableRow[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, RateTableRow>>({})

  // Модальное окно удаления
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; id?: string }>({ type: 'single' })

  // Фильтры
  const [filtersExpanded, setFiltersExpanded] = useState(true)
  const [costCategoryFilter, setCostCategoryFilter] = useState<number | undefined>()
  const [detailCostCategoryFilter, setDetailCostCategoryFilter] = useState<number | undefined>()
  const [appliedFilters, setAppliedFilters] = useState<{
    costCategory?: number
    detailCostCategory?: number
  }>({})

  // Настройки столбцов
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('rates-column-visibility')
    return saved ? JSON.parse(saved) : defaultColumnVisibility
  })
  const [columnOrder, setColumnOrder] = useState<string[]>(() => {
    const saved = localStorage.getItem('rates-column-order')
    return saved ? JSON.parse(saved) : defaultColumnOrder
  })
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false)

  // Импорт Excel
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [importLoading, setImportLoading] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 })
  const [importResult, setImportResult] = useState<{
    success: boolean
    created: number
    updated: number
    skipped: number
    totalRows: number
    errors: string[]
    unfoundUnits?: string[]
  } | null>(null)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [conflictDialogVisible, setConflictDialogVisible] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<WorkSetRateExcelRow[]>([])

  // Пагинация
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('rates-page-size')
    return saved ? parseInt(saved) : 100
  })

  // Загрузка данных
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['work-set-rates'],
    queryFn: () => getAllWorkSetRates(false),
    staleTime: 0,
    refetchOnMount: 'always',
  })

  // Загрузка справочников
  const { data: costCategories = [] } = useQuery({
    queryKey: ['cost-categories'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('cost_categories').select('*').order('number')
      if (error) throw error
      return data
    },
  })

  const { data: detailCostCategories = [] } = useQuery({
    queryKey: ['detail-cost-categories-with-mapping'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')

      // Получаем все виды затрат
      const { data: details, error: detailsError } = await supabase
        .from('detail_cost_categories')
        .select('id, name')
        .order('name')

      if (detailsError) throw detailsError

      // Получаем маппинг (категория <-> вид затрат)
      const { data: mapping, error: mappingError } = await supabase
        .from('detail_cost_categories_mapping')
        .select(`
          detail_cost_category_id,
          cost_category:cost_categories(id, name, number)
        `)

      if (mappingError) throw mappingError

      // Объединяем данные: для каждого вида затрат добавляем массив категорий
      return details?.map(detail => {
        const categories = mapping
          ?.filter(m => m.detail_cost_category_id === detail.id)
          .map(m => m.cost_category)
          .filter(Boolean) || []

        return {
          ...detail,
          cost_categories: categories, // Массив категорий
          cost_category: categories[0] || null // Первая категория (для обратной совместимости)
        }
      }) || []
    },
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('units').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  const { data: unitSynonyms = [] } = useQuery({
    queryKey: ['unit-synonyms'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('unit_synonyms')
        .select('unit_id, synonym')
      if (error) throw error
      return data as Array<{ unit_id: string; synonym: string }>
    },
  })

  const { data: workNames = [] } = useQuery({
    queryKey: ['work-names'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('work_names').select('*').order('name')
      if (error) throw error
      return data
    },
  })

  const { data: workSets = [] } = useQuery({
    queryKey: ['work-sets'],
    queryFn: () => getAllWorkSets(false),
  })

  // Сохранение настроек
  useEffect(() => {
    localStorage.setItem('rates-column-visibility', JSON.stringify(columnVisibility))
  }, [columnVisibility])

  useEffect(() => {
    localStorage.setItem('rates-column-order', JSON.stringify(columnOrder))
  }, [columnOrder])

  useEffect(() => {
    localStorage.setItem('rates-page-size', pageSize.toString())
  }, [pageSize])

  // Функции управления столбцами
  const toggleColumnVisibility = useCallback((key: string) => {
    setColumnVisibility((prev) => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev],
    }))
  }, [])

  const selectAllColumns = useCallback((select: boolean) => {
    const newVisibility = { ...defaultColumnVisibility }
    Object.keys(newVisibility).forEach((key) => {
      if (key !== 'actions') {
        newVisibility[key as keyof typeof defaultColumnVisibility] = select
      }
    })
    setColumnVisibility(newVisibility)
  }, [])

  const resetToDefaults = useCallback(() => {
    setColumnVisibility(defaultColumnVisibility)
    setColumnOrder(defaultColumnOrder)
  }, [])

  const moveColumn = useCallback(
    (key: string, direction: 'up' | 'down') => {
      const currentIndex = columnOrder.indexOf(key)
      if (currentIndex === -1) return

      const newOrder = [...columnOrder]
      const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1

      if (targetIndex >= 0 && targetIndex < newOrder.length) {
        ;[newOrder[currentIndex], newOrder[targetIndex]] = [
          newOrder[targetIndex],
          newOrder[currentIndex],
        ]
        setColumnOrder(newOrder)
      }
    },
    [columnOrder],
  )

  // Фильтрация данных
  const filteredData = useMemo(() => {
    let result = [...rates, ...newRows]

    if (appliedFilters.costCategory !== undefined) {
      result = result.filter(
        (row) => row.cost_category_id === appliedFilters.costCategory,
      )
    }

    if (appliedFilters.detailCostCategory !== undefined) {
      result = result.filter(
        (row) => row.detail_cost_category_id === appliedFilters.detailCostCategory,
      )
    }

    return result
  }, [rates, newRows, appliedFilters])

  // Функция применения фильтров
  const applyFilters = useCallback(() => {
    setAppliedFilters({
      costCategory: costCategoryFilter,
      detailCostCategory: detailCostCategoryFilter,
    })
    setFiltersExpanded(false) // Сворачиваем блок фильтров после применения
  }, [costCategoryFilter, detailCostCategoryFilter])

  // Функция сброса фильтров
  const resetFilters = useCallback(() => {
    setCostCategoryFilter(undefined)
    setDetailCostCategoryFilter(undefined)
    setAppliedFilters({})
  }, [])

  // Отфильтрованные виды затрат на основе выбранной категории
  const filteredDetailCategories = useMemo(() => {
    if (!costCategoryFilter) return detailCostCategories
    // Фильтруем по всем категориям вида затрат (не только первой)
    return detailCostCategories.filter((detail) =>
      detail.cost_categories?.some(cat => cat?.id === costCategoryFilter)
    )
  }, [detailCostCategories, costCategoryFilter])

  // Сброс вида затрат при смене категории
  useEffect(() => {
    if (costCategoryFilter && detailCostCategoryFilter) {
      const isValidDetail = filteredDetailCategories.some(
        (detail) => detail.id === detailCostCategoryFilter,
      )
      if (!isValidDetail) {
        setDetailCostCategoryFilter(undefined)
      }
    }
  }, [costCategoryFilter, detailCostCategoryFilter, filteredDetailCategories])

  // Функции режимов
  const enterAddMode = useCallback(() => {
    setMode('add')
    const newId = `new-${Date.now()}`
    setNewRows([
      {
        id: newId,
        work_name: '',
        work_set: '',
        base_rate: 0,
        detail_cost_category_id: undefined,
        active: true, // По умолчанию активна
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        isNew: true,
      },
    ])
  }, [])

  const enterDeleteMode = useCallback(() => {
    setMode('delete')
    setSelectedRowsForDelete(new Set())
  }, [])

  const cancelMode = useCallback(() => {
    setMode('view')
    setNewRows([])
    setEditingRows({})
    setSelectedRowsForDelete(new Set())
  }, [])

  // Функции CRUD операций
  const handleSave = useCallback(async () => {
    try {
      // Сохранение новых строк
      for (const newRow of newRows) {
        const workNameValue = typeof newRow.work_name === 'string' ? newRow.work_name : newRow.work_name?.name || ''
        if (!workNameValue.trim()) continue

        const workSetValue = typeof newRow.work_set === 'string' ? newRow.work_set : newRow.work_set?.name

        const formData: WorkSetRateFormData = {
          work_name: workNameValue,
          work_set_name: workSetValue || undefined,
          base_rate: newRow.base_rate,
          unit_id: newRow.unit_id || undefined,
          detail_cost_category_id: newRow.detail_cost_category_id,
          cost_category_id: newRow.cost_category_id,
          active: newRow.active,
        }

        await createWorkSetRateFromForm(formData)
      }

      // Сохранение отредактированных строк
      for (const [id, editedRow] of Object.entries(editingRows)) {
        const workNameValue = typeof editedRow.work_name === 'string' ? editedRow.work_name : editedRow.work_name?.name || ''
        const workSetValue = typeof editedRow.work_set === 'string' ? editedRow.work_set : editedRow.work_set?.name

        const formData: WorkSetRateFormData = {
          work_name: workNameValue,
          work_set_name: workSetValue || undefined,
          base_rate: editedRow.base_rate,
          unit_id: editedRow.unit_id || undefined,
          detail_cost_category_id: editedRow.detail_cost_category_id,
          cost_category_id: editedRow.cost_category_id,
          active: editedRow.active,
        }

        await updateWorkSetRateFromForm(id, formData)
      }

      await queryClient.invalidateQueries({ queryKey: ['work-set-rates'] })
      message.success('Данные успешно сохранены')
      cancelMode()
    } catch (error) {
      console.error('Save error:', error)
      message.error('Ошибка при сохранении данных')
    }
  }, [newRows, editingRows, queryClient, message, cancelMode])

  const handleBulkDelete = useCallback(async () => {
    try {
      await bulkDeleteWorkSetRates(Array.from(selectedRowsForDelete))
      await queryClient.invalidateQueries({ queryKey: ['work-set-rates'] })
      message.success(`Удалено ${selectedRowsForDelete.size} записей`)
      cancelMode()
    } catch (error) {
      console.error('Delete error:', error)
      message.error('Ошибка при удалении данных')
    }
  }, [selectedRowsForDelete, queryClient, message, cancelMode])

  // Обработчики модального окна удаления
  const openDeleteModal = useCallback((type: 'single' | 'bulk', id?: string) => {
    setDeleteTarget({ type, id })
    setDeleteModalOpen(true)
  }, [])

  const handleConfirmDelete = useCallback(async () => {
    try {
      if (deleteTarget.type === 'single' && deleteTarget.id) {
        await deleteWorkSetRateById(deleteTarget.id)
        await queryClient.invalidateQueries({ queryKey: ['work-set-rates'] })
        message.success('Запись удалена')
      } else if (deleteTarget.type === 'bulk') {
        await handleBulkDelete()
      }
      setDeleteModalOpen(false)
    } catch (error) {
      console.error('Delete error:', error)
      message.error('Ошибка при удалении')
    }
  }, [deleteTarget, queryClient, message, handleBulkDelete])

  // Excel импорт
  const processImportData = useCallback(
    async (data: WorkSetRateExcelRow[], resolutions?: Map<number, 'skip' | 'replace'>) => {
      console.log(`🔄 Начало импорта: ${data.length} строк`)
      const errors: string[] = []
      let skippedCount = 0
      const unfoundUnits = new Set<string>()

      try {
        const processedData: WorkSetRateFormData[] = []

        // Функция поиска единицы измерения по имени или синониму
        const findUnitByNameOrSynonym = (unitName: string) => {
          const lowerName = unitName.toLowerCase().trim()

          // Сначала ищем точное совпадение по имени
          let unit = units.find((u) => u.name.toLowerCase() === lowerName)
          if (unit) return unit

          // Затем ищем по синонимам
          const synonym = unitSynonyms.find((s) => s.synonym.toLowerCase() === lowerName)
          if (synonym) {
            unit = units.find((u) => u.id === synonym.unit_id)
          }

          return unit
        }

        for (let i = 0; i < data.length; i++) {
          const row = data[i]
          const resolution = resolutions?.get(i)

          if (resolution === 'skip') {
            skippedCount++
            continue
          }

          // Fuzzy matching для заголовков
          const findColumnValue = (possibleNames: string[]) => {
            const typedRow = row as unknown as Record<string, unknown>
            const rowKeys = Object.keys(typedRow)
            for (const possibleName of possibleNames) {
              // Точное совпадение
              if (typedRow[possibleName] !== undefined) {
                return typedRow[possibleName]
              }
              // Поиск по частичному совпадению (нечувствительно к регистру)
              const fuzzyMatch = rowKeys.find(
                (key) =>
                  key.toLowerCase().includes(possibleName.toLowerCase()) ||
                  possibleName.toLowerCase().includes(key.toLowerCase()),
              )
              if (fuzzyMatch && typedRow[fuzzyMatch] !== undefined) {
                return typedRow[fuzzyMatch]
              }
            }
            return undefined
          }

          const workName = findColumnValue([
            'НАИМЕНОВАНИЕ РАБОТ УПРОЩЕННОЕ',
            'НАИМЕНОВАНИЕ РАБОТ',
            'наименование работ упрощенное',
            'наименование работ',
            'работы',
            'наименование',
            'название работ',
            'название',
          ])
            ?.toString()
            .trim()

          if (!workName) {
            errors.push(`Строка ${i + 1}: Пропущена - пустое наименование работ`)
            skippedCount++
            continue
          }

          // Поиск единицы измерения
          const unitName = findColumnValue([
            'Единица',
            'Ед.изм.',
            'ед.изм',
            'единица',
            'единицы',
            'ед',
            'изм',
          ])
            ?.toString()
            .trim()
          const unit = unitName ? findUnitByNameOrSynonym(unitName) : undefined

          // Трекинг не найденных единиц измерения
          if (unitName && !unit) {
            unfoundUnits.add(unitName)
          }

          // Поиск категорий и вида затрат
          const categoryName = findColumnValue([
            'Категория затрат',
            'Категории затрат',
            'категория затрат',
            'категории затрат',
            'категория',
            'затраты',
          ])
            ?.toString()
            .trim()
          const costTypeName = findColumnValue([
            'Вид затрат',
            'вид затрат',
            'тип затрат',
            'подкategория',
          ])
            ?.toString()
            .trim()

          let detailCostCategoryId: number | undefined
          let costCategoryId: number | undefined

          // Сначала ищем категорию затрат по имени
          if (categoryName) {
            const matchingCostCategory = costCategories.find((category) =>
              category.name.toLowerCase().includes(categoryName.toLowerCase())
            )
            costCategoryId = matchingCostCategory?.id
          }

          // Затем ищем вид затрат
          if (costTypeName) {
            const matchingDetailCategory = detailCostCategories.find((detail) => {
              const nameMatches = detail.name.toLowerCase().includes(costTypeName.toLowerCase())
              const categoryMatches = categoryName && costCategoryId
                ? detail.cost_categories?.some(cat => cat?.id === costCategoryId)
                : true
              return nameMatches && categoryMatches
            })
            detailCostCategoryId = matchingDetailCategory?.id

            // Если категория не была найдена напрямую, берём первую из вида затрат
            if (!costCategoryId && matchingDetailCategory) {
              costCategoryId = matchingDetailCategory.cost_categories?.[0]?.id
            }
          }

          const baseRate = Number(
            findColumnValue([
              'Расценка БАЗОВАЯ',
              'расценка базовая',
              'расценка',
              'базовая расценка',
              'стоимость',
              'цена',
            ]) || 0,
          )

          const workSet = findColumnValue([
            'РАБОЧИЙ НАБОР',
            'рабочий набор',
            'набор',
            'группа работ',
            'тип работ',
          ])
            ?.toString()
            .trim()

          const rateData: WorkSetRateFormData = {
            work_name: workName,
            work_set_name: workSet || undefined,
            base_rate: baseRate,
            unit_id: unit?.id || null,
            detail_cost_category_id: detailCostCategoryId,
            cost_category_id: costCategoryId,
            active: true,
          }

          processedData.push(rateData)
        }

        console.log(`📊 Обработано строк: ${processedData.length}`)

        // Разделяем данные на create, update и skip
        const toCreate: WorkSetRateFormData[] = []
        const toUpdate: Array<{ id: string; data: WorkSetRateFormData }> = []

        for (const rateData of processedData) {
          const existing = rates.find(
            (r) => r.work_name?.name?.toLowerCase() === rateData.work_name?.toLowerCase(),
          )

          const originalIndex = data.findIndex(
            (d) => {
              const workNameInFile = d['НАИМЕНОВАНИЕ РАБОТ УПРОЩЕННОЕ'] || d['НАИМЕНОВАНИЕ РАБОТ']
              return workNameInFile?.toString().trim().toLowerCase() === rateData.work_name?.toLowerCase()
            }
          )

          if (existing && resolutions?.get(originalIndex) === 'replace') {
            toUpdate.push({ id: existing.id, data: rateData })
          } else if (!existing) {
            toCreate.push(rateData)
          } else {
            skippedCount++
          }
        }

        console.log(`📋 Планирование операций:`, {
          toCreate: toCreate.length,
          toUpdate: toUpdate.length,
          toSkip: skippedCount,
        })

        // Создание записей батчами
        let createdCount = 0
        let updatedCount = 0

        if (toCreate.length > 0) {
          try {
            setImportProgress({ current: 0, total: toCreate.length + toUpdate.length })
            console.log(`➕ Создаем ${toCreate.length} новых записей батчами...`)
            await bulkCreateWorkSetRatesFromForm(toCreate)
            createdCount = toCreate.length
            setImportProgress({ current: createdCount, total: toCreate.length + toUpdate.length })
          } catch (error) {
            console.error('Ошибка при массовом создании:', error)
            errors.push(`Ошибка при создании записей: ${(error as Error).message}`)
          }
        }

        // Обновление записей батчами
        if (toUpdate.length > 0) {
          try {
            setImportProgress({
              current: createdCount,
              total: toCreate.length + toUpdate.length,
            })
            console.log(`🔄 Обновляем ${toUpdate.length} записей батчами...`)
            await bulkUpdateWorkSetRatesFromForm(toUpdate)
            updatedCount = toUpdate.length
            setImportProgress({
              current: createdCount + updatedCount,
              total: toCreate.length + toUpdate.length,
            })
          } catch (error) {
            console.error('Ошибка при массовом обновлении:', error)
            errors.push(`Ошибка при обновлении записей: ${(error as Error).message}`)
          }
        }

        console.log(`📈 Результат импорта:`, {
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          total: processedData.length,
          hasErrors: errors.length > 0,
        })

        await queryClient.invalidateQueries({ queryKey: ['work-set-rates'] })

        // Добавляем не найденные единицы в errors если они есть
        if (unfoundUnits.size > 0) {
          errors.push(`Не найдены единицы измерения (${unfoundUnits.size}): ${Array.from(unfoundUnits).join(', ')}`)
        }

        // Сохраняем результат импорта
        // success=true только если нет ошибок
        setImportResult({
          success: errors.length === 0,
          created: createdCount,
          updated: updatedCount,
          skipped: skippedCount,
          totalRows: data.length,
          errors,
          unfoundUnits: unfoundUnits.size > 0 ? Array.from(unfoundUnits) : undefined,
        })
      } catch (error) {
        console.error('Process import error:', error)
        // Сохраняем результат с ошибкой
        setImportResult({
          success: false,
          created: 0,
          updated: 0,
          skipped: skippedCount,
          totalRows: data.length,
          errors: [...errors, `Критическая ошибка: ${(error as Error).message}`],
        })
      }
    },
    [rates, units, unitSynonyms, detailCostCategories, costCategories, queryClient],
  )

  const handleImport = useCallback(
    async (file: File) => {
      console.log('📁 Начало импорта файла:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
      })
      setImportLoading(true)
      setImportProgress({ current: 0, total: 0 })
      try {
        const arrayBuffer = await file.arrayBuffer()
        console.log('📄 Файл прочитан, размер буфера:', arrayBuffer.byteLength)

        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        console.log('📊 Workbook создан, листы:', workbook.SheetNames)

        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        console.log('📋 Лист выбран:', workbook.SheetNames[0])

        const jsonData: WorkSetRateExcelRow[] = XLSX.utils.sheet_to_json(worksheet)
        console.log('🔄 Данные преобразованы в JSON:', {
          rowCount: jsonData.length,
          firstRow: jsonData[0],
          allHeaders: jsonData.length > 0 ? Object.keys(jsonData[0]) : [],
        })

        // Проверка конфликтов
        const existingRates = new Map(rates.map((rate) => [rate.work_name?.name?.toLowerCase() || '', rate]))
        const conflictItems: ConflictItem[] = []

        jsonData.forEach((row, index) => {
          const typedRow = row as any
          const workName = (typedRow['НАИМЕНОВАНИЕ РАБОТ'] || typedRow['НАИМЕНОВАНИЕ РАБОТ УПРОЩЕННОЕ'])?.toString().trim()
          if (workName && existingRates.has(workName.toLowerCase())) {
            console.log(`🔍 Найден конфликт в строке ${index}:`, {
              workName,
              existing: existingRates.get(workName.toLowerCase()),
            })
            conflictItems.push({
              row,
              existing: existingRates.get(workName.toLowerCase())!,
              index,
            })
          }
        })

        console.log('⚔️ Проверка конфликтов завершена:', { conflictsFound: conflictItems.length })

        if (conflictItems.length > 0) {
          console.log('⚠️ Показываем диалог разрешения конфликтов')
          setConflicts(conflictItems)
          setPendingImportData(jsonData)
          setConflictDialogVisible(true)
        } else {
          console.log('✅ Конфликтов нет, начинаем обработку данных')
          await processImportData(jsonData)
        }
      } catch (error) {
        console.error('Import error:', error)
        message.error('Ошибка при импорте файла')
      } finally {
        setImportLoading(false)
        setImportProgress({ current: 0, total: 0 })
      }
    },
    [rates, message, processImportData],
  )

  // Колонки таблицы
  const allColumns: ColumnsType<RateTableRow> = useMemo(
    () => [
      {
        title: 'Наименование работ',
        dataIndex: 'work_name',
        key: 'work_name',
        width: '30%',
        sorter: (a, b) => {
          const aName = a.work_name?.name || ''
          const bName = b.work_name?.name || ''
          return aName.localeCompare(bName)
        },
        onCell: () => ({
          style: {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          },
        }),
        render: (workName, record) => {
          if (record.isNew || editingRows[record.id]) {
            const currentValue = editingRows[record.id]?.work_name ?? record.work_name?.name ?? ''
            const options = workNames.map((wn) => ({ value: wn.name }))

            return (
              <AutoComplete
                value={currentValue}
                onChange={(value) => {
                  if (record.isNew) {
                    setNewRows((prev) =>
                      prev.map((row) =>
                        row.id === record.id ? { ...row, work_name: value } : row,
                      ),
                    )
                  } else {
                    setEditingRows((prev) => ({
                      ...prev,
                      [record.id]: { ...record, ...prev[record.id], work_name: value },
                    }))
                  }
                }}
                placeholder="Выберите или введите наименование работ"
                style={{ width: '100%' }}
                allowClear
                filterOption={(input, option) =>
                  (option?.value?.toString() || '').toLowerCase().includes(input.toLowerCase())
                }
                options={options}
              />
            )
          }
          return workName?.name || '-'
        },
      },
      {
        title: 'Рабочий набор',
        dataIndex: 'work_set',
        key: 'work_set',
        width: '15%',
        sorter: (a, b) => {
          const aName = typeof a.work_set === 'string' ? a.work_set : a.work_set?.name || ''
          const bName = typeof b.work_set === 'string' ? b.work_set : b.work_set?.name || ''
          return aName.localeCompare(bName)
        },
        onCell: () => ({
          style: {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          },
        }),
        render: (workSet, record) => {
          if (record.isNew || editingRows[record.id]) {
            const currentValue = editingRows[record.id]?.work_set ?? (typeof record.work_set === 'string' ? record.work_set : record.work_set?.name) ?? ''
            return (
              <Input
                value={currentValue}
                onChange={(e) => {
                  if (record.isNew) {
                    setNewRows((prev) =>
                      prev.map((row) =>
                        row.id === record.id ? { ...row, work_set: e.target.value } : row,
                      ),
                    )
                  } else {
                    setEditingRows((prev) => ({
                      ...prev,
                      [record.id]: { ...record, ...prev[record.id], work_set: e.target.value },
                    }))
                  }
                }}
                placeholder="Введите рабочий набор"
              />
            )
          }
          return (typeof workSet === 'string' ? workSet : workSet?.name) || '-'
        },
      },
      {
        title: 'Категория затрат',
        dataIndex: 'cost_category',
        key: 'cost_category',
        width: '15%',
        onCell: () => ({
          style: {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          },
        }),
        render: (costCategory, record: RateTableRow) => {
          if (record.isNew || editingRows[record.id]) {
            return (
              <Select
                value={editingRows[record.id]?.cost_category_id ?? record.cost_category_id}
                onChange={(value) => {
                  if (record.isNew) {
                    setNewRows((prev) =>
                      prev.map((row) =>
                        row.id === record.id
                          ? { ...row, cost_category_id: value, detail_cost_category_id: undefined }
                          : row,
                      ),
                    )
                  } else {
                    setEditingRows((prev) => ({
                      ...prev,
                      [record.id]: {
                        ...record,
                        ...prev[record.id],
                        cost_category_id: value,
                        detail_cost_category_id: undefined,
                      },
                    }))
                  }
                }}
                placeholder="Выберите категорию"
                style={{ width: '100%' }}
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const text = (option?.children || option?.label)?.toString() || ''
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
              >
                {costCategories.map((category) => (
                  <Select.Option key={category.id} value={category.id}>
                    {category.name}
                  </Select.Option>
                ))}
              </Select>
            )
          }
          return costCategory?.name || '-'
        },
      },
      {
        title: 'Вид затрат',
        dataIndex: 'detail_cost_category',
        key: 'detail_cost_category',
        width: '15%',
        onCell: () => ({
          style: {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          },
        }),
        render: (detailCategory: { name: string } | undefined, record: RateTableRow) => {
          if (record.isNew || editingRows[record.id]) {
            // Фильтруем виды затрат по выбранной категории
            const selectedCostCategoryId = editingRows[record.id]?.cost_category_id ?? record.cost_category_id
            const filteredDetails = selectedCostCategoryId
              ? detailCostCategories.filter((detail) =>
                  detail.cost_categories?.some((cat: any) => cat?.id === selectedCostCategoryId),
                )
              : detailCostCategories

            return (
              <Select
                value={
                  editingRows[record.id]?.detail_cost_category_id ?? record.detail_cost_category_id
                }
                onChange={(value) => {
                  if (record.isNew) {
                    setNewRows((prev) =>
                      prev.map((row) =>
                        row.id === record.id ? { ...row, detail_cost_category_id: value } : row,
                      ),
                    )
                  } else {
                    setEditingRows((prev) => ({
                      ...prev,
                      [record.id]: {
                        ...record,
                        ...prev[record.id],
                        detail_cost_category_id: value,
                      },
                    }))
                  }
                }}
                placeholder={selectedCostCategoryId ? "Выберите вид затрат" : "Сначала выберите категорию"}
                disabled={!selectedCostCategoryId}
                style={{ width: '100%' }}
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const text = (option?.children || option?.label)?.toString() || ''
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
              >
                {filteredDetails.map((detail) => (
                  <Select.Option key={detail.id} value={detail.id}>
                    {detail.name}
                  </Select.Option>
                ))}
              </Select>
            )
          }
          return detailCategory?.name || '-'
        },
      },
      {
        title: 'Ед.изм.',
        dataIndex: 'unit',
        key: 'unit',
        width: 80,
        onCell: () => ({
          style: {
            whiteSpace: 'normal',
            wordBreak: 'break-word',
          },
        }),
        render: (unit, record) => {
          if (record.isNew || editingRows[record.id]) {
            return (
              <Select
                value={editingRows[record.id]?.unit_id ?? record.unit_id}
                onChange={(value) => {
                  if (record.isNew) {
                    setNewRows((prev) =>
                      prev.map((row) => (row.id === record.id ? { ...row, unit_id: value } : row)),
                    )
                  } else {
                    setEditingRows((prev) => ({
                      ...prev,
                      [record.id]: { ...record, ...prev[record.id], unit_id: value },
                    }))
                  }
                }}
                placeholder="Выберите единицу"
                style={{ width: '100%' }}
                allowClear
                showSearch
                filterOption={(input, option) => {
                  const text = (option?.children || option?.label)?.toString() || ''
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
              >
                {units.map((unit) => (
                  <Select.Option key={unit.id} value={unit.id}>
                    {unit.name}
                  </Select.Option>
                ))}
              </Select>
            )
          }
          return unit?.name || '-'
        },
      },
      {
        title: 'Расценка базовая',
        dataIndex: 'base_rate',
        key: 'base_rate',
        width: 120,
        sorter: (a, b) => a.base_rate - b.base_rate,
        render: (value, record) => {
          if (record.isNew || editingRows[record.id]) {
            return (
              <InputNumber
                value={editingRows[record.id]?.base_rate ?? record.base_rate}
                onChange={(val) => {
                  if (record.isNew) {
                    setNewRows((prev) =>
                      prev.map((row) =>
                        row.id === record.id ? { ...row, base_rate: val || 0 } : row,
                      ),
                    )
                  } else {
                    setEditingRows((prev) => ({
                      ...prev,
                      [record.id]: { ...record, ...prev[record.id], base_rate: val || 0 },
                    }))
                  }
                }}
                min={0}
                precision={2}
                parser={parseNumberWithSeparators}
                style={{ width: '100%' }}
                placeholder="Введите расценку"
              />
            )
          }
          return value?.toLocaleString('ru-RU', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
        },
      },
      {
        title: 'Актив',
        dataIndex: 'active',
        key: 'active',
        width: 80,
        render: (value: boolean, record: RateTableRow) => {
          if (record.isNew || editingRows[record.id]) {
            return (
              <Checkbox
                checked={editingRows[record.id]?.active ?? record.active}
                onChange={(e) => {
                  if (record.isNew) {
                    setNewRows((prev) =>
                      prev.map((row) =>
                        row.id === record.id ? { ...row, active: e.target.checked } : row,
                      ),
                    )
                  } else {
                    setEditingRows((prev) => ({
                      ...prev,
                      [record.id]: { ...record, ...prev[record.id], active: e.target.checked },
                    }))
                  }
                }}
              />
            )
          }
          return (
            <Checkbox
              checked={value}
              disabled
            />
          )
        },
      },
      {
        title: 'Действия',
        key: 'actions',
        width: 120,
        render: (_: unknown, record: RateTableRow) => {
          if (mode === 'delete') return null
          if (record.isNew) return null

          return (
            <Space size="small">
              <Button
                type="text"
                icon={<CopyOutlined />}
                onClick={() => {
                  const newId = `new-${Date.now()}`
                  const workNameCopy = typeof record.work_name === 'string'
                    ? `${record.work_name} (копия)`
                    : record.work_name?.name
                      ? `${record.work_name.name} (копия)`
                      : '(копия)'
                  const copiedRow: RateTableRow = {
                    ...record,
                    id: newId,
                    work_name: workNameCopy,
                    active: record.active, // Копируем статус активности
                    isNew: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  }
                  setNewRows((prev) => [...prev, copiedRow])
                  setMode('add')
                }}
                title="Копировать"
              />
              <Button
                type="text"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingRows((prev) => ({ ...prev, [record.id]: record }))
                  setMode('edit')
                }}
                title="Редактировать"
              />
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                title="Удалить"
                onClick={() => openDeleteModal('single', record.id)}
              />
            </Space>
          )
        },
      },
    ],
    [mode, editingRows, detailCostCategories, units, workNames, queryClient, message],
  )

  // Конфигурация столбцов с учетом настроек
  const visibleColumns = useMemo(() => {
    const orderedColumns = columnOrder
      .map((key) => allColumns.find((col) => col.key === key))
      .filter((col): col is NonNullable<typeof col> =>
        Boolean(col && columnVisibility[col.key as string]),
      )

    // Добавляем чекбокс для режима удаления
    if (mode === 'delete') {
      const checkboxColumn = {
        title: (
          <Checkbox
            checked={
              selectedRowsForDelete.size > 0 && selectedRowsForDelete.size === filteredData.length
            }
            indeterminate={
              selectedRowsForDelete.size > 0 && selectedRowsForDelete.size < filteredData.length
            }
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowsForDelete(new Set(filteredData.map((row) => row.id)))
              } else {
                setSelectedRowsForDelete(new Set())
              }
            }}
          />
        ),
        key: 'selection',
        width: 50,
        render: (_: unknown, record: RateTableRow) => (
          <Checkbox
            checked={selectedRowsForDelete.has(record.id)}
            onChange={(e) => {
              const newSelected = new Set(selectedRowsForDelete)
              if (e.target.checked) {
                newSelected.add(record.id)
              } else {
                newSelected.delete(record.id)
              }
              setSelectedRowsForDelete(newSelected)
            }}
          />
        ),
      }
      return [checkboxColumn, ...orderedColumns]
    }

    return orderedColumns
  }, [allColumns, columnOrder, columnVisibility, mode, selectedRowsForDelete, filteredData])

  const hasUnsavedChanges = newRows.length > 0 || Object.keys(editingRows).length > 0

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',

        minHeight: 0,
      }}
    >
      <div className="filters" style={{ flexShrink: 0, paddingBottom: 16 }}>
        <Title level={2} style={{ margin: '0 0 16px 0' }}>
          Расценки
        </Title>

        {/* Фильтры */}
        {/* Статичный блок фильтров */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Категория затрат"
              value={costCategoryFilter}
              onChange={setCostCategoryFilter}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const text = (option?.children || option?.label)?.toString() || ''
                return text.toLowerCase().includes(input.toLowerCase())
              }}
              style={{ width: 500 }}
            >
              {costCategories.map((cat) => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>

            <Select
              placeholder="Вид затрат"
              value={detailCostCategoryFilter}
              onChange={setDetailCostCategoryFilter}
              allowClear
              showSearch
              filterOption={(input, option) => {
                const text = (option?.children || option?.label)?.toString() || ''
                return text.toLowerCase().includes(input.toLowerCase())
              }}
              style={{ width: 500 }}
              disabled={!costCategoryFilter}
            >
              {filteredDetailCategories.map((detail) => (
                <Select.Option key={detail.id} value={detail.id}>
                  {detail.name}
                </Select.Option>
              ))}
            </Select>

            <Button type="primary" onClick={applyFilters}>
              Применить
            </Button>

            <Button onClick={resetFilters}>
              Сбросить
            </Button>

            <Button
              type="text"
              icon={filtersExpanded ? <CaretUpFilled /> : <CaretDownFilled />}
              onClick={() => setFiltersExpanded(!filtersExpanded)}
            >
              <FilterOutlined /> Фильтры
            </Button>
          </Space>
        </div>

        {/* Скрываемый блок фильтров */}
        {filtersExpanded && (
          <div style={{ marginTop: 16, padding: 16, backgroundColor: '#fafafa', borderRadius: 6 }}>
            <Space wrap>
              <Button icon={<SettingOutlined />} onClick={() => setSettingsDrawerOpen(true)}>
                Настройка столбцов
              </Button>
            </Space>
          </div>
        )}

        {/* Кнопки действий */}
        <div style={{ marginTop: 16 }}>
          {mode === 'view' && (
            <Space>
              <Button type="primary" icon={<PlusOutlined />} onClick={enterAddMode}>
                Добавить
              </Button>
              <Button icon={<DeleteOutlined />} onClick={enterDeleteMode}>
                Удалить
              </Button>
              <Button icon={<UploadOutlined />} onClick={() => setImportModalOpen(true)}>
                Импорт Excel
              </Button>
            </Space>
          )}

          {(mode === 'add' || mode === 'edit') && hasUnsavedChanges && (
            <Space>
              <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
                Сохранить
              </Button>
              <Button icon={<CloseOutlined />} onClick={cancelMode}>
                Отмена
              </Button>
            </Space>
          )}

          {mode === 'delete' && (
            <Space>
              <Button
                danger
                disabled={selectedRowsForDelete.size === 0}
                onClick={() => openDeleteModal('bulk')}
              >
                Удалить ({selectedRowsForDelete.size})
              </Button>
              <Button onClick={cancelMode}>Отмена</Button>
            </Space>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div className="table-host">
        <Table
          columns={visibleColumns}
          dataSource={filteredData}
          rowKey="id"
          loading={isLoading}
          sticky
          tableLayout="fixed"
          pagination={{
            current: 1,
            pageSize,
            total: filteredData.length,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100', '200', '500'],
            onShowSizeChange: (_, size) => setPageSize(size),
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} из ${total}`,
          }}
          locale={{ emptyText: <Empty description="Нет данных" /> }}
        />
      </div>

      {/* Настройки столбцов */}
      <Drawer
        title="Настройка столбцов"
        placement="right"
        width={350}
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Checkbox
            checked={Object.values(columnVisibility).every((v) => v)}
            indeterminate={
              Object.values(columnVisibility).some((v) => v) &&
              !Object.values(columnVisibility).every((v) => v)
            }
            onChange={(e) => selectAllColumns(e.target.checked)}
          >
            Выделить все
          </Checkbox>

          <Button onClick={resetToDefaults} block>
            По умолчанию
          </Button>

          <List
            size="small"
            dataSource={columnOrder.filter((key) => key !== 'actions')}
            renderItem={(key, index) => {
              const column = allColumns.find((col) => col.key === key)
              if (!column) return null

              return (
                <List.Item
                  actions={[
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowUpOutlined />}
                      onClick={() => moveColumn(key, 'up')}
                      disabled={index === 0}
                    />,
                    <Button
                      type="text"
                      size="small"
                      icon={<ArrowDownOutlined />}
                      onClick={() => moveColumn(key, 'down')}
                      disabled={index === columnOrder.length - 2}
                    />,
                  ]}
                >
                  <Checkbox
                    checked={columnVisibility[key] !== false}
                    onChange={() => toggleColumnVisibility(key)}
                  >
                    {column.title as string}
                  </Checkbox>
                </List.Item>
              )
            }}
          />
        </Space>
      </Drawer>

      {/* Импорт Excel */}
      <Modal
        title={importResult ? 'Результат импорта' : 'Импорт расценок из Excel'}
        open={importModalOpen}
        onCancel={() => {
          if (!importLoading) {
            setImportModalOpen(false)
            setFileList([])
            setImportProgress({ current: 0, total: 0 })
            setImportResult(null)
          }
        }}
        footer={
          importResult
            ? [
                <Button
                  key="close"
                  type="primary"
                  onClick={() => {
                    setImportModalOpen(false)
                    setFileList([])
                    setImportProgress({ current: 0, total: 0 })
                    setImportResult(null)
                  }}
                >
                  Закрыть
                </Button>,
              ]
            : [
                <Button
                  key="cancel"
                  onClick={() => {
                    setImportModalOpen(false)
                    setFileList([])
                    setImportProgress({ current: 0, total: 0 })
                    setImportResult(null)
                  }}
                  disabled={importLoading}
                >
                  Отмена
                </Button>,
                <Button
                  key="import"
                  type="primary"
                  onClick={() => {
                    if (fileList.length > 0) {
                      handleImport(fileList[0] as unknown as File)
                    }
                  }}
                  disabled={!fileList.length || importLoading}
                  loading={importLoading}
                >
                  Импортировать
                </Button>,
              ]
        }
        width={600}
        closable={!importLoading}
      >
        {importResult ? (
          <div style={{ padding: '20px 0' }}>
            <div style={{ marginBottom: 24, textAlign: 'center' }}>
              <Text
                strong
                style={{
                  fontSize: 18,
                  color: importResult.success ? '#52c41a' : '#ff4d4f',
                }}
              >
                {importResult.success ? '✓ Импорт завершен успешно' : '✗ Импорт завершен с ошибками'}
              </Text>
            </div>

            <div style={{ marginBottom: 16 }}>
              <Text>Всего строк обработано: {importResult.totalRows}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#52c41a' }}>Создано новых записей: {importResult.created}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#1890ff' }}>Обновлено записей: {importResult.updated}</Text>
            </div>
            <div style={{ marginBottom: 16 }}>
              <Text style={{ color: '#faad14' }}>Пропущено записей: {importResult.skipped}</Text>
            </div>

            {importResult.errors.length > 0 && (
              <div style={{ marginTop: 24 }}>
                <Text strong style={{ color: '#ff4d4f' }}>
                  Ошибки и предупреждения:
                </Text>
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 200,
                    overflowY: 'auto',
                    border: '1px solid #f0f0f0',
                    borderRadius: 4,
                    padding: 8,
                    textAlign: 'left',
                  }}
                >
                  {importResult.errors.map((error, index) => (
                    <div key={index} style={{ marginBottom: 4, fontSize: 13 }}>
                      <Text type="secondary">{error}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center' }}>
            <Upload.Dragger
              accept=".xlsx,.xls"
              fileList={fileList}
              beforeUpload={(file) => {
                setFileList([file])
                return false
              }}
              onRemove={() => setFileList([])}
              disabled={importLoading}
            >
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">Нажмите или перетащите файл Excel для загрузки</p>
              <p className="ant-upload-hint">
                Поддерживаются файлы .xlsx и .xls
                <br />
                Ожидаемые столбцы: Категории затрат, Вид затрат, РАБОЧИЙ НАБОР, НАИМЕНОВАНИЕ РАБОТ,
                Ед.изм., Расценка БАЗОВАЯ
              </p>
            </Upload.Dragger>

            {importLoading && (
              <div style={{ marginTop: 24 }}>
                <Progress
                  percent={
                    importProgress.total > 0
                      ? Math.round((importProgress.current / importProgress.total) * 100)
                      : 0
                  }
                  status="active"
                />
                <div style={{ marginTop: 8, color: '#666' }}>
                  Обработано {importProgress.current} из {importProgress.total} записей
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Диалог разрешения конфликтов */}
      <Modal
        title="Конфликты при импорте"
        open={conflictDialogVisible}
        onCancel={() => {
          setConflictDialogVisible(false)
          setConflicts([])
          setPendingImportData([])
        }}
        width={800}
        footer={[
          <Button
            key="cancel"
            onClick={() => {
              setConflictDialogVisible(false)
              setConflicts([])
              setPendingImportData([])
            }}
          >
            Отмена
          </Button>,
          <Button
            key="resolve"
            type="primary"
            onClick={async () => {
              setConflictDialogVisible(false)
              const resolutionMap = new Map<number, 'skip' | 'replace'>()
              conflicts.forEach((conflict) => {
                resolutionMap.set(conflict.index, 'replace')
              })
              await processImportData(pendingImportData, resolutionMap)
              setConflicts([])
              setPendingImportData([])
            }}
          >
            Заменить все
          </Button>,
        ]}
      >
        <div>
          <Text>Обнаружено {conflicts.length} конфликтов. Выберите действие:</Text>
          <div style={{ marginTop: 16 }}>
            {conflicts.map((conflict, index) => (
              <div
                key={index}
                style={{
                  marginBottom: 16,
                  padding: 16,
                  border: '1px solid #d9d9d9',
                  borderRadius: 6,
                }}
              >
                <Text strong>Наименование: {(conflict.row as any)['НАИМЕНОВАНИЕ РАБОТ'] || (conflict.row as any)['НАИМЕНОВАНИЕ РАБОТ УПРОЩЕННОЕ']}</Text>
                <br />
                <Text>Новая расценка: {(conflict.row as any)['Расценка БАЗОВАЯ']}</Text>
                <br />
                <Text>Текущая расценка: {conflict.existing.base_rate}</Text>
              </div>
            ))}
          </div>
        </div>
      </Modal>

      {/* Модальное окно подтверждения удаления */}
      <Modal
        title="Подтверждение удаления"
        open={deleteModalOpen}
        onOk={handleConfirmDelete}
        onCancel={() => setDeleteModalOpen(false)}
        okText="Удалить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <p>
          {deleteTarget.type === 'single'
            ? 'Вы уверены, что хотите удалить эту запись?'
            : `Вы уверены, что хотите удалить ${selectedRowsForDelete.size} записей?`}
        </p>
      </Modal>
    </div>
  )
}
