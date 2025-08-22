import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
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
  Popconfirm,
  Empty,
  App,
  InputNumber,
  Tag,
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
import { ratesApi, type RateWithRelations, type RateExcelRow, type RateFormData } from '@/entities/rates'
import { supabase } from '@/lib/supabase'
// import ConflictResolutionDialog from '@/components/ConflictResolutionDialog'

const { Text, Title } = Typography

type TableMode = 'view' | 'add' | 'edit' | 'delete'

interface ConflictItem {
  row: RateExcelRow
  existing: RateWithRelations
  index: number
}

interface RateTableRow extends RateWithRelations {
  isNew?: boolean
  isEditing?: boolean
}

// Настройки столбцов по умолчанию
const defaultColumnVisibility = {
  work_name: true,
  work_set: true,
  cost_categories: true,
  detail_cost_category: true,
  unit: true,
  base_rate: true,
  actions: true,
}

const defaultColumnOrder = ['work_name', 'work_set', 'cost_categories', 'detail_cost_category', 'unit', 'base_rate', 'actions']

export default function Rates() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()
  const headerRef = useRef<HTMLDivElement>(null)
  const filtersRef = useRef<HTMLDivElement>(null)
  
  // Логгирование для диагностики
  useEffect(() => {
    const logElementInfo = () => {
      console.log('=== ДИАГНОСТИКА ЗАКРЕПЛЕННЫХ ЭЛЕМЕНТОВ ===')
      
      if (headerRef.current) {
        const headerRect = headerRef.current.getBoundingClientRect()
        console.log('📋 Шапка портала:', {
          top: headerRect.top,
          bottom: headerRect.bottom,
          height: headerRect.height,
          position: window.getComputedStyle(headerRef.current).position,
          zIndex: window.getComputedStyle(headerRef.current).zIndex
        })
      }
      
      if (filtersRef.current) {
        const filtersRect = filtersRef.current.getBoundingClientRect()
        console.log('🔍 Блок фильтров:', {
          top: filtersRect.top,
          bottom: filtersRect.bottom,
          height: filtersRect.height,
          position: window.getComputedStyle(filtersRef.current).position,
          zIndex: window.getComputedStyle(filtersRef.current).zIndex
        })
      }
      
      const tableHeader = document.querySelector('.ant-table-thead')
      if (tableHeader) {
        const tableHeaderRect = tableHeader.getBoundingClientRect()
        console.log('📊 Шапка таблицы:', {
          top: tableHeaderRect.top,
          bottom: tableHeaderRect.bottom,
          height: tableHeaderRect.height,
          position: window.getComputedStyle(tableHeader as Element).position,
          zIndex: window.getComputedStyle(tableHeader as Element).zIndex
        })
      }
      
      const stickyTable = document.querySelector('.ant-table-sticky-holder')
      if (stickyTable) {
        const stickyRect = stickyTable.getBoundingClientRect()
        console.log('🔗 Sticky таблица:', {
          top: stickyRect.top,
          bottom: stickyRect.bottom,
          height: stickyRect.height,
          position: window.getComputedStyle(stickyTable as Element).position,
          zIndex: window.getComputedStyle(stickyTable as Element).zIndex
        })
      }
      
      console.log('📜 Общие параметры:', {
        windowHeight: window.innerHeight,
        scrollY: window.scrollY,
        documentHeight: document.body.scrollHeight
      })
      
      console.log('=== КОНЕЦ ДИАГНОСТИКИ ===')
    }
    
    // Лог при загрузке компонента
    const timer = setTimeout(logElementInfo, 1000)
    
    // Лог при прокрутке
    const handleScroll = () => {
      console.log('📜 Прокрутка:', { scrollY: window.scrollY })
      logElementInfo()
    }
    
    window.addEventListener('scroll', handleScroll)
    window.addEventListener('resize', logElementInfo)
    
    return () => {
      clearTimeout(timer)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', logElementInfo)
    }
  }, [])
  
  // Основные состояния
  const [mode, setMode] = useState<TableMode>('view')
  const [selectedRowsForDelete, setSelectedRowsForDelete] = useState<Set<string>>(new Set())
  const [newRows, setNewRows] = useState<RateTableRow[]>([])
  const [editingRows, setEditingRows] = useState<Record<string, RateTableRow>>({})
  
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
  const [, setImportLoading] = useState(false)
  const [conflicts, setConflicts] = useState<ConflictItem[]>([])
  const [conflictDialogVisible, setConflictDialogVisible] = useState(false)
  const [pendingImportData, setPendingImportData] = useState<RateExcelRow[]>([])
  
  // Пагинация
  const [pageSize, setPageSize] = useState(() => {
    const saved = localStorage.getItem('rates-page-size')
    return saved ? parseInt(saved) : 100
  })

  // Загрузка данных
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['rates'],
    queryFn: ratesApi.getAll,
  })

  // Загрузка справочников
  const { data: costCategories = [] } = useQuery({
    queryKey: ['cost-categories'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('cost_categories').select('*').order('number')
      if (error) throw error
      return data
    }
  })

  const { data: detailCostCategories = [] } = useQuery({
    queryKey: ['detail-cost-categories'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase
        .from('detail_cost_categories')
        .select('*, cost_category:cost_categories(id, name, number)')
        .order('name')
      if (error) throw error
      return data
    }
  })

  const { data: units = [] } = useQuery({
    queryKey: ['units'],
    queryFn: async () => {
      if (!supabase) throw new Error('Supabase is not configured')
      const { data, error } = await supabase.from('units').select('*').order('name')
      if (error) throw error
      return data
    }
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
    setColumnVisibility(prev => ({
      ...prev,
      [key]: !prev[key as keyof typeof prev]
    }))
  }, [])

  const selectAllColumns = useCallback((select: boolean) => {
    const newVisibility = { ...defaultColumnVisibility }
    Object.keys(newVisibility).forEach(key => {
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

  const moveColumn = useCallback((key: string, direction: 'up' | 'down') => {
    const currentIndex = columnOrder.indexOf(key)
    if (currentIndex === -1) return
    
    const newOrder = [...columnOrder]
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    if (targetIndex >= 0 && targetIndex < newOrder.length) {
      [newOrder[currentIndex], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[currentIndex]]
      setColumnOrder(newOrder)
    }
  }, [columnOrder])

  // Фильтрация данных
  const filteredData = useMemo(() => {
    let result = [...rates, ...newRows]
    
    if (appliedFilters.costCategory !== undefined) {
      result = result.filter(row => 
        row.cost_categories?.some(cat => cat.id === appliedFilters.costCategory)
      )
    }
    
    if (appliedFilters.detailCostCategory !== undefined) {
      result = result.filter(row => 
        row.detail_cost_category?.id === appliedFilters.detailCostCategory
      )
    }
    
    
    return result
  }, [rates, newRows, appliedFilters])
  
  // Функция применения фильтров
  const applyFilters = useCallback(() => {
    setAppliedFilters({
      costCategory: costCategoryFilter,
      detailCostCategory: detailCostCategoryFilter
    })
  }, [costCategoryFilter, detailCostCategoryFilter])
  
  // Отфильтрованные виды затрат на основе выбранной категории
  const filteredDetailCategories = useMemo(() => {
    if (!costCategoryFilter) return detailCostCategories
    return detailCostCategories.filter(detail => 
      detail.cost_category?.id === costCategoryFilter
    )
  }, [detailCostCategories, costCategoryFilter])
  
  // Сброс вида затрат при смене категории
  useEffect(() => {
    if (costCategoryFilter && detailCostCategoryFilter) {
      const isValidDetail = filteredDetailCategories.some(detail => detail.id === detailCostCategoryFilter)
      if (!isValidDetail) {
        setDetailCostCategoryFilter(undefined)
      }
    }
  }, [costCategoryFilter, detailCostCategoryFilter, filteredDetailCategories])

  // Функции режимов
  const enterAddMode = useCallback(() => {
    setMode('add')
    const newId = `new-${Date.now()}`
    setNewRows([{
      id: newId,
      work_name: '',
      work_set: '',
      base_rate: 0,
      detail_cost_category_id: undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      isNew: true,
      cost_categories: []
    }])
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
        if (!newRow.work_name.trim()) continue
        
        const formData: RateFormData = {
          work_name: newRow.work_name,
          work_set: newRow.work_set || undefined,
          base_rate: newRow.base_rate,
          unit_id: newRow.unit_id || undefined,
          detail_cost_category_id: newRow.detail_cost_category_id,
          cost_category_ids: newRow.cost_categories?.map(cat => cat.id) || []
        }
        
        await ratesApi.create(formData)
      }
      
      // Сохранение отредактированных строк
      for (const [id, editedRow] of Object.entries(editingRows)) {
        const formData: RateFormData = {
          work_name: editedRow.work_name,
          work_set: editedRow.work_set || undefined,
          base_rate: editedRow.base_rate,
          unit_id: editedRow.unit_id || undefined,
          detail_cost_category_id: editedRow.detail_cost_category_id,
          cost_category_ids: editedRow.cost_categories?.map(cat => cat.id) || []
        }
        
        await ratesApi.update(id, formData)
      }
      
      await queryClient.invalidateQueries({ queryKey: ['rates'] })
      message.success('Данные успешно сохранены')
      cancelMode()
    } catch (error) {
      console.error('Save error:', error)
      message.error('Ошибка при сохранении данных')
    }
  }, [newRows, editingRows, queryClient, message, cancelMode])

  const handleBulkDelete = useCallback(async () => {
    try {
      await ratesApi.bulkDelete(Array.from(selectedRowsForDelete))
      await queryClient.invalidateQueries({ queryKey: ['rates'] })
      message.success(`Удалено ${selectedRowsForDelete.size} записей`)
      cancelMode()
    } catch (error) {
      console.error('Delete error:', error)
      message.error('Ошибка при удалении данных')
    }
  }, [selectedRowsForDelete, queryClient, message, cancelMode])

  // Excel импорт
  const processImportData = useCallback(async (data: RateExcelRow[], resolutions?: Map<number, 'skip' | 'replace'>) => {
    console.log('🔄 Начало обработки импорта данных', { dataLength: data.length, data })
    try {
      const processedData: RateFormData[] = []
      
      for (let i = 0; i < data.length; i++) {
        const row = data[i]
        const resolution = resolutions?.get(i)
        
        console.log(`📝 Обработка строки ${i}:`, { row, resolution })
        
        if (resolution === 'skip') {
          console.log(`⏭️ Пропускаем строку ${i} по резолюции`)
          continue
        }
        
        // Fuzzy matching для заголовков
        const findColumnValue = (possibleNames: string[]) => {
          const rowKeys = Object.keys(row)
          for (const possibleName of possibleNames) {
            // Точное совпадение
            if ((row as any)[possibleName] !== undefined) {
              return (row as any)[possibleName]
            }
            // Поиск по частичному совпадению (нечувствительно к регистру)
            const fuzzyMatch = rowKeys.find(key => 
              key.toLowerCase().includes(possibleName.toLowerCase()) ||
              possibleName.toLowerCase().includes(key.toLowerCase())
            )
            if (fuzzyMatch && (row as any)[fuzzyMatch] !== undefined) {
              return (row as any)[fuzzyMatch]
            }
          }
          return undefined
        }
        
        const workName = findColumnValue(['НАИМЕНОВАНИЕ РАБОТ', 'наименование работ', 'работы', 'наименование', 'название работ', 'название'])?.toString().trim()
        console.log(`🏷️ Наименование работ в строке ${i}:`, { workName, available_keys: Object.keys(row) })
        
        if (!workName) {
          console.log(`❌ Пропускаем строку ${i} - пустое наименование работ`)
          continue
        }
        
        // Поиск единицы измерения
        const unitName = findColumnValue(['Ед.изм.', 'ед.изм', 'единица', 'единицы', 'ед', 'изм'])?.toString().trim()
        const unit = unitName ? units.find(u => u.name.toLowerCase() === unitName.toLowerCase()) : undefined
        console.log(`📏 Единица измерения в строке ${i}:`, { unitName, unit, availableUnits: units.length })
        
        // Поиск категорий затрат
        const categoryName = findColumnValue(['Категории затрат', 'категории затрат', 'категория затрат', 'категория', 'затраты'])?.toString().trim()
        const costTypeName = findColumnValue(['Вид затрат', 'вид затрат', 'тип затрат', 'подкategория'])?.toString().trim()
        
        const matchingCategories = costCategories.filter(cat => {
          if (categoryName && !cat.name.toLowerCase().includes(categoryName.toLowerCase())) {
            return false
          }
          return true
        })
        console.log(`🏷️ Категории затрат в строке ${i}:`, { categoryName, matchingCategories, availableCategories: costCategories.length })
        
        // Поиск вида затрат
        let detailCostCategoryId: number | undefined
        if (costTypeName && matchingCategories.length > 0) {
          const matchingDetailCategory = detailCostCategories.find(detail => {
            const nameMatches = detail.name.toLowerCase().includes(costTypeName.toLowerCase())
            const categoryMatches = matchingCategories.some(cat => cat.id === detail.cost_category?.id)
            return nameMatches && categoryMatches
          })
          detailCostCategoryId = matchingDetailCategory?.id
          console.log(`🔍 Вид затрат в строке ${i}:`, { costTypeName, matchingDetailCategory, detailCostCategoryId })
        }
        
        const baseRate = Number(findColumnValue(['Расценка БАЗОВАЯ', 'расценка базовая', 'расценка', 'базовая расценка', 'стоимость', 'цена']) || 0)
        console.log(`💰 Расценка в строке ${i}:`, { baseRate, originalColumn: findColumnValue(['Расценка БАЗОВАЯ', 'расценка базовая', 'расценка', 'базовая расценка', 'стоимость', 'цена']) })
        
        const workSet = findColumnValue(['РАБОЧИЙ НАБОР', 'рабочий набор', 'набор', 'группа работ', 'тип работ'])?.toString().trim()
        
        const rateData: RateFormData = {
          work_name: workName,
          work_set: workSet || undefined,
          base_rate: baseRate,
          unit_id: unit?.id,
          detail_cost_category_id: detailCostCategoryId,
          cost_category_ids: matchingCategories.map(cat => cat.id)
        }
        
        console.log(`✅ Создаем объект расценки для строки ${i}:`, rateData)
        processedData.push(rateData)
      }
      
      console.log(`📊 Обработано строк: ${processedData.length}`)
      
      // Создание записей
      let createdCount = 0
      let updatedCount = 0
      
      for (const rateData of processedData) {
        const existing = rates.find(r => r.work_name.toLowerCase() === rateData.work_name.toLowerCase())
        
        if (existing && resolutions?.get(data.findIndex(d => d['НАИМЕНОВАНИЕ РАБОТ']?.toString().trim().toLowerCase() === rateData.work_name.toLowerCase())) === 'replace') {
          console.log(`🔄 Обновляем существующую запись:`, { existing, rateData })
          await ratesApi.update(existing.id, rateData)
          updatedCount++
        } else if (!existing) {
          console.log(`➕ Создаем новую запись:`, rateData)
          await ratesApi.create(rateData)
          createdCount++
        } else {
          console.log(`⏭️ Пропускаем существующую запись:`, { existing, rateData })
        }
      }
      
      console.log(`📈 Результат импорта:`, { created: createdCount, updated: updatedCount, total: processedData.length })
      
      await queryClient.invalidateQueries({ queryKey: ['rates'] })
      message.success(`Импортировано ${processedData.length} записей (создано: ${createdCount}, обновлено: ${updatedCount})`)
      setImportModalOpen(false)
      setFileList([])
    } catch (error) {
      console.error('Process import error:', error)
      message.error('Ошибка при обработке импорта')
    }
  }, [rates, units, costCategories, detailCostCategories, queryClient, message])

  const handleImport = useCallback(async (file: File) => {
    console.log('📁 Начало импорта файла:', { fileName: file.name, fileSize: file.size, fileType: file.type })
    setImportLoading(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      console.log('📄 Файл прочитан, размер буфера:', arrayBuffer.byteLength)
      
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      console.log('📊 Workbook создан, листы:', workbook.SheetNames)
      
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      console.log('📋 Лист выбран:', workbook.SheetNames[0])
      
      const jsonData: RateExcelRow[] = XLSX.utils.sheet_to_json(worksheet)
      console.log('🔄 Данные преобразованы в JSON:', { 
        rowCount: jsonData.length, 
        firstRow: jsonData[0],
        allHeaders: jsonData.length > 0 ? Object.keys(jsonData[0]) : []
      })
      
      // Проверка конфликтов
      const existingRates = new Map(rates.map(rate => [rate.work_name.toLowerCase(), rate]))
      const conflictItems: ConflictItem[] = []
      
      jsonData.forEach((row, index) => {
        const workName = row['НАИМЕНОВАНИЕ РАБОТ']?.toString().trim()
        if (workName && existingRates.has(workName.toLowerCase())) {
          console.log(`🔍 Найден конфликт в строке ${index}:`, { workName, existing: existingRates.get(workName.toLowerCase()) })
          conflictItems.push({
            row,
            existing: existingRates.get(workName.toLowerCase())!,
            index
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
    }
  }, [rates, message, processImportData])

  // Колонки таблицы
  const allColumns: ColumnsType<RateTableRow> = useMemo(() => [
    {
      title: 'Наименование работ',
      dataIndex: 'work_name',
      key: 'work_name',
      sorter: (a, b) => a.work_name.localeCompare(b.work_name),
      render: (text, record) => {
        if (record.isNew || editingRows[record.id]) {
          return (
            <Input
              value={editingRows[record.id]?.work_name ?? record.work_name}
              onChange={(e) => {
                if (record.isNew) {
                  setNewRows(prev => prev.map(row => 
                    row.id === record.id ? { ...row, work_name: e.target.value } : row
                  ))
                } else {
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: { ...record, ...prev[record.id], work_name: e.target.value }
                  }))
                }
              }}
              placeholder="Введите наименование работ"
            />
          )
        }
        return text
      }
    },
    {
      title: 'Рабочий набор',
      dataIndex: 'work_set',
      key: 'work_set',
      sorter: (a, b) => (a.work_set || '').localeCompare(b.work_set || ''),
      render: (text, record) => {
        if (record.isNew || editingRows[record.id]) {
          return (
            <Input
              value={editingRows[record.id]?.work_set ?? record.work_set ?? ''}
              onChange={(e) => {
                if (record.isNew) {
                  setNewRows(prev => prev.map(row => 
                    row.id === record.id ? { ...row, work_set: e.target.value } : row
                  ))
                } else {
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: { ...record, ...prev[record.id], work_set: e.target.value }
                  }))
                }
              }}
              placeholder="Введите рабочий набор"
            />
          )
        }
        return text || '-'
      }
    },
    {
      title: 'Категории затрат',
      dataIndex: 'cost_categories',
      key: 'cost_categories',
      render: (categories: any[], record) => {
        if (record.isNew || editingRows[record.id]) {
          const selectedIds = editingRows[record.id]?.cost_categories?.map(cat => cat.id) ?? 
                             record.cost_categories?.map(cat => cat.id) ?? []
          
          return (
            <Select
              mode="multiple"
              value={selectedIds}
              onChange={(values) => {
                const selectedCategories = costCategories.filter(cat => values.includes(cat.id))
                if (record.isNew) {
                  setNewRows(prev => prev.map(row => 
                    row.id === record.id ? { ...row, cost_categories: selectedCategories } : row
                  ))
                } else {
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: { ...record, ...prev[record.id], cost_categories: selectedCategories }
                  }))
                }
              }}
              placeholder="Выберите категории"
              style={{ width: '100%' }}
            >
              {costCategories.map(cat => (
                <Select.Option key={cat.id} value={cat.id}>
                  {cat.name}
                </Select.Option>
              ))}
            </Select>
          )
        }
        
        return (
          <Space size={[0, 4]} wrap>
            {categories?.map(cat => (
              <Tag key={cat.id} color="blue">{cat.name}</Tag>
            ))}
          </Space>
        )
      }
    },
    {
      title: 'Вид затрат',
      dataIndex: 'detail_cost_category',
      key: 'detail_cost_category',
      render: (detailCategory, record) => {
        if (record.isNew || editingRows[record.id]) {
          return (
            <Select
              value={editingRows[record.id]?.detail_cost_category_id ?? record.detail_cost_category_id}
              onChange={(value) => {
                if (record.isNew) {
                  setNewRows(prev => prev.map(row => 
                    row.id === record.id ? { ...row, detail_cost_category_id: value } : row
                  ))
                } else {
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: { ...record, ...prev[record.id], detail_cost_category_id: value }
                  }))
                }
              }}
              placeholder="Выберите вид затрат"
              style={{ width: '100%' }}
              allowClear
            >
              {detailCostCategories.map(detail => (
                <Select.Option key={detail.id} value={detail.id}>
                  {detail.name} ({detail.cost_category?.name})
                </Select.Option>
              ))}
            </Select>
          )
        }
        return detailCategory?.name || '-'
      }
    },
    {
      title: 'Ед.изм.',
      dataIndex: 'unit',
      key: 'unit',
      render: (unit, record) => {
        if (record.isNew || editingRows[record.id]) {
          return (
            <Select
              value={editingRows[record.id]?.unit_id ?? record.unit_id}
              onChange={(value) => {
                if (record.isNew) {
                  setNewRows(prev => prev.map(row => 
                    row.id === record.id ? { ...row, unit_id: value } : row
                  ))
                } else {
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: { ...record, ...prev[record.id], unit_id: value }
                  }))
                }
              }}
              placeholder="Выберите единицу"
              style={{ width: '100%' }}
              allowClear
            >
              {units.map(unit => (
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.name}
                </Select.Option>
              ))}
            </Select>
          )
        }
        return unit?.name || '-'
      }
    },
    {
      title: 'Расценка базовая',
      dataIndex: 'base_rate',
      key: 'base_rate',
      sorter: (a, b) => a.base_rate - b.base_rate,
      render: (value, record) => {
        if (record.isNew || editingRows[record.id]) {
          return (
            <InputNumber
              value={editingRows[record.id]?.base_rate ?? record.base_rate}
              onChange={(val) => {
                if (record.isNew) {
                  setNewRows(prev => prev.map(row => 
                    row.id === record.id ? { ...row, base_rate: val || 0 } : row
                  ))
                } else {
                  setEditingRows(prev => ({
                    ...prev,
                    [record.id]: { ...record, ...prev[record.id], base_rate: val || 0 }
                  }))
                }
              }}
              min={0}
              precision={2}
              style={{ width: '100%' }}
              placeholder="Введите расценку"
            />
          )
        }
        return value?.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 120,
      render: (_, record) => {
        if (mode === 'delete') return null
        if (record.isNew) return null
        
        return (
          <Space size="small">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => {
                const newId = `new-${Date.now()}`
                const copiedRow: RateTableRow = {
                  ...record,
                  id: newId,
                  work_name: `${record.work_name} (копия)`,
                  isNew: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }
                setNewRows(prev => [...prev, copiedRow])
                setMode('add')
              }}
              title="Копировать"
            />
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => {
                setEditingRows(prev => ({ ...prev, [record.id]: record }))
                setMode('edit')
              }}
              title="Редактировать"
            />
            <Popconfirm
              title="Удалить запись?"
              onConfirm={async () => {
                try {
                  await ratesApi.delete(record.id)
                  await queryClient.invalidateQueries({ queryKey: ['rates'] })
                  message.success('Запись удалена')
                } catch (error) {
                  console.error('Delete error:', error)
                  message.error('Ошибка при удалении')
                }
              }}
            >
              <Button
                type="text"
                icon={<DeleteOutlined />}
                danger
                title="Удалить"
              />
            </Popconfirm>
          </Space>
        )
      }
    }
  ], [mode, editingRows, costCategories, detailCostCategories, units, queryClient, message])

  // Конфигурация столбцов с учетом настроек
  const visibleColumns = useMemo(() => {
    const orderedColumns = columnOrder
      .map(key => allColumns.find(col => col.key === key))
      .filter((col): col is NonNullable<typeof col> => Boolean(col && columnVisibility[col.key as string]))
    
    // Добавляем чекбокс для режима удаления
    if (mode === 'delete') {
      const checkboxColumn = {
        title: (
          <Checkbox
            checked={selectedRowsForDelete.size > 0 && selectedRowsForDelete.size === filteredData.length}
            indeterminate={selectedRowsForDelete.size > 0 && selectedRowsForDelete.size < filteredData.length}
            onChange={(e) => {
              if (e.target.checked) {
                setSelectedRowsForDelete(new Set(filteredData.map(row => row.id)))
              } else {
                setSelectedRowsForDelete(new Set())
              }
            }}
          />
        ),
        key: 'selection',
        width: 50,
        render: (_: any, record: RateTableRow) => (
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
        )
      }
      return [checkboxColumn, ...orderedColumns]
    }
    
    return orderedColumns
  }, [allColumns, columnOrder, columnVisibility, mode, selectedRowsForDelete, filteredData])

  const hasUnsavedChanges = newRows.length > 0 || Object.keys(editingRows).length > 0

  return (
    <div style={{ 
      height: 'calc(100vh - 64px)', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      <div style={{ flexShrink: 0, paddingBottom: 16 }}>
        <Title level={2} style={{ margin: '0 0 16px 0' }}>Расценки</Title>
        
        {/* Фильтры */}
        {/* Статичный блок фильтров */}
        <div style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              placeholder="Категория затрат"
              value={costCategoryFilter}
              onChange={setCostCategoryFilter}
              allowClear
              style={{ width: 200 }}
            >
              {costCategories.map(cat => (
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
              style={{ width: 200 }}
              disabled={!costCategoryFilter}
            >
              {filteredDetailCategories.map(detail => (
                <Select.Option key={detail.id} value={detail.id}>
                  {detail.name}
                </Select.Option>
              ))}
            </Select>
            
            <Button type="primary" onClick={applyFilters}>
              Применить
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
              <Button
                icon={<SettingOutlined />}
                onClick={() => setSettingsDrawerOpen(true)}
              >
                Настройка столбцов
              </Button>
            </Space>
          </div>
        )}

        {/* Кнопки действий */}
        <div style={{ marginTop: 16 }}>
          {mode === 'view' && (
            <Space>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={enterAddMode}
              >
                Добавить
              </Button>
              <Button 
                icon={<DeleteOutlined />} 
                onClick={enterDeleteMode}
              >
                Удалить
              </Button>
              <Button 
                icon={<UploadOutlined />} 
                onClick={() => setImportModalOpen(true)}
              >
                Импорт Excel
              </Button>
            </Space>
          )}
          
          {(mode === 'add' || mode === 'edit') && hasUnsavedChanges && (
            <Space>
              <Button 
                type="primary" 
                icon={<SaveOutlined />} 
                onClick={handleSave}
              >
                Сохранить
              </Button>
              <Button 
                icon={<CloseOutlined />} 
                onClick={cancelMode}
              >
                Отмена
              </Button>
            </Space>
          )}
          
          {mode === 'delete' && (
            <Space>
              <Popconfirm
                title={`Удалить ${selectedRowsForDelete.size} записей?`}
                onConfirm={handleBulkDelete}
                disabled={selectedRowsForDelete.size === 0}
              >
                <Button 
                  danger 
                  disabled={selectedRowsForDelete.size === 0}
                >
                  Удалить ({selectedRowsForDelete.size})
                </Button>
              </Popconfirm>
              <Button onClick={cancelMode}>Отмена</Button>
            </Space>
          )}
        </div>
      </div>

      {/* Таблица */}
      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Table
        columns={visibleColumns}
        dataSource={filteredData}
        rowKey="id"
        loading={isLoading}
        sticky
        scroll={{ 
          x: 'max-content',
          y: '100%'
        }}
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
            checked={Object.values(columnVisibility).every(v => v)}
            indeterminate={Object.values(columnVisibility).some(v => v) && !Object.values(columnVisibility).every(v => v)}
            onChange={(e) => selectAllColumns(e.target.checked)}
          >
            Выделить все
          </Checkbox>
          
          <Button onClick={resetToDefaults} block>
            По умолчанию
          </Button>
          
          <List
            size="small"
            dataSource={columnOrder.filter(key => key !== 'actions')}
            renderItem={(key, index) => {
              const column = allColumns.find(col => col.key === key)
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
                    />
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
        title="Импорт расценок из Excel"
        open={importModalOpen}
        onCancel={() => {
          setImportModalOpen(false)
          setFileList([])
        }}
        footer={null}
        width={600}
      >
        <div style={{ textAlign: 'center' }}>
          <Upload.Dragger
            accept=".xlsx,.xls"
            fileList={fileList}
            beforeUpload={(file) => {
              setFileList([file])
              handleImport(file)
              return false
            }}
            onRemove={() => setFileList([])}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Нажмите или перетащите файл Excel для загрузки</p>
            <p className="ant-upload-hint">
              Поддерживаются файлы .xlsx и .xls
              <br />
              Ожидаемые столбцы: Категории затрат, Вид затрат, РАБОЧИЙ НАБОР, НАИМЕНОВАНИЕ РАБОТ, Ед.изм., Расценка БАЗОВАЯ
            </p>
          </Upload.Dragger>
        </div>
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
          <Button key="cancel" onClick={() => {
            setConflictDialogVisible(false)
            setConflicts([])
            setPendingImportData([])
          }}>
            Отмена
          </Button>,
          <Button key="resolve" type="primary" onClick={async () => {
            setConflictDialogVisible(false)
            const resolutionMap = new Map<number, 'skip' | 'replace'>()
            conflicts.forEach(conflict => {
              resolutionMap.set(conflict.index, 'replace')
            })
            await processImportData(pendingImportData, resolutionMap)
            setConflicts([])
            setPendingImportData([])
          }}>
            Заменить все
          </Button>
        ]}
      >
        <div>
          <Text>Обнаружено {conflicts.length} конфликтов. Выберите действие:</Text>
          <div style={{ marginTop: 16 }}>
            {conflicts.map((conflict, index) => (
              <div key={index} style={{ marginBottom: 16, padding: 16, border: '1px solid #d9d9d9', borderRadius: 6 }}>
                <Text strong>Наименование: {conflict.row['НАИМЕНОВАНИЕ РАБОТ']}</Text>
                <br />
                <Text>Новая расценка: {conflict.row['Расценка БАЗОВАЯ']}</Text>
                <br />
                <Text>Текущая расценка: {conflict.existing.base_rate}</Text>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  )
}