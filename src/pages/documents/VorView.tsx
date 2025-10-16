import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Table, Typography, Space, Spin, Alert, Button, InputNumber, message, Select, Input } from 'antd'
import { ArrowLeftOutlined, DownloadOutlined, EditOutlined, SaveOutlined, CloseOutlined, PlusOutlined, MinusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons'
import * as XLSX from 'xlsx'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useScale } from '@/shared/contexts/ScaleContext'
import {
  getVorTableData,
  type VorTableItem,
  updateVorWork,
  updateVorMaterial,
  createVorMaterial,
  deleteVorWork,
  deleteVorMaterial,
  deleteVorMaterialsByWorkId,
  getSupplierNamesOptions,
  getUnitsOptions,
  getRatesOptions,
  populateVorFromChessboardSet
} from '@/entities/vor'
import AddWorkModal from './VorView/components/AddWorkModal'
import { parseNumberWithSeparators } from '@/shared/lib'

const { Title, Text } = Typography

interface ChessboardItem {
  id: string
  project_id: string | null
  material: string | null
  materials?: { name: string | null } | null
  unit_id: string | null
  units?: {
    name: string | null
    abbreviation: string | null
  } | null
  chessboard_rates_mapping?: Array<{
    work_set_rate_id: string | null
    work_set_rate?: { work_name_id: string | null; work_names?: { id: string; name: string } | null; base_rate?: number | null; units?: { id: string; name: string } | null } | null
  }> | null
  chessboard_mapping?: {
    block_id: string | null
    cost_category_id: number | null
    cost_type_id: number | null
    location_id: number | null
  } | null
  chessboard_documentation_mapping?: Array<{
    version_id: string | null
    documentation_versions?: {
      documentation_id: string | null
    } | null
  }> | null
  chessboard_nomenclature_mapping?: Array<{
    supplier_names_id: string | null
    conversion_coefficient: number | null
    supplier_names?: {
      id: string | null
      name: string | null
      material_prices?: Array<{
        price: number
        purchase_date: string
      }> | null
    } | null
  }> | null
  quantityRd?: number // Объем по пересчету РД
}

interface RateItem {
  material_name: string
  nomenclature_price: number
  work_price: number
}

interface VorItem {
  id: string
  name: string
  unit: string
  quantity: number
  nomenclature_price: number
  work_price: number
  nomenclature_total: number
  work_total: number
  type: 'work' | 'material' // Тип элемента: работа или материал
  parent_id?: string // ID родительской работы для материалов
  level: number // Уровень вложенности (1 для работ, 2 для материалов)
  coefficient?: number // Коэффициент для строк работ
  base_rate?: number // Базовая расценка без коэффициента для пересчёта
  work_set_rate?: { base_rate?: number } // Информация о расценке из work_set_rates
}

interface ProjectDocument {
  code: string
  project_name: string
}

// Типы для режимов работы
type ViewMode = 'view' | 'edit' | 'add' | 'delete'

// Функция для создания компактных заголовков с максимум 3 строками
const formatHeaderText = (text: string): JSX.Element => {
  // Предопределенные сокращенные варианты заголовков
  const compactHeaders: { [key: string]: string } = {
    Наименование: 'Наименование',
    'Ед Изм': 'Ед.\nИзм.',
    'Кол-во': 'Кол-во',
    'Номенклатура цены за ед руб вкл НДС': 'Номенклатура\nцена за ед.\nруб с НДС',
    'Работа цены за ед руб вкл НДС': 'Работа\nцена за ед.\nруб с НДС',
    'Номенклатура Итого руб вкл НДС': 'Номенклатура\nИтого\nруб с НДС',
    'Работа Итого руб вкл НДС': 'Работа\nИтого\nруб с НДС',
    'Сумма Итого руб вкл НДС': 'Сумма\nИтого\nруб с НДС',
  }

  const headerText = compactHeaders[text] || text

  return (
    <div
      style={{
        whiteSpace: 'pre-line',
        textAlign: 'center',
        lineHeight: '1.2',
        fontSize: '12px',
        minHeight: '45px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {headerText}
    </div>
  )
}

const VorView = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vorId = searchParams.get('vor_id')
  const [coefficient, setCoefficient] = useState<number>(1)
  const [vorItemsData, setVorItemsData] = useState<VorItem[]>([])
  const queryClient = useQueryClient()
  const [messageApi, contextHolder] = message.useMessage()

  // Отслеживание изменений для новой схемы ВОР
  const [editedItems, setEditedItems] = useState<Set<string>>(new Set())
  const [editedItemsData, setEditedItemsData] = useState<Record<string, any>>({})

  // Состояния для режимов работы
  const [viewMode, setViewMode] = useState<ViewMode>('view')
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [editableVorData, setEditableVorData] = useState<VorTableItem[]>([])
  const [isEditingEnabled, setIsEditingEnabled] = useState(false)

  // Состояния для модальных окон
  const [addWorkModalVisible, setAddWorkModalVisible] = useState(false)

  // Функции форматирования для InputNumber - убирают лишние нули
  const formatNumber = (value: string | number | undefined): string => {
    if (!value) return ''
    const num = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(num)) return ''
    // Убираем лишние нули после запятой
    return num % 1 === 0 ? num.toString() : num.toString()
  }

  const parseNumber = (value: string | undefined): number => {
    if (!value) return 0
    const num = parseFloat(value.replace(/\s/g, ''))
    return isNaN(num) ? 0 : num
  }

  // Адаптивная высота таблицы
  const [tableScrollHeight, setTableScrollHeight] = useState('calc(100vh - 350px)')

  // Состояния для inline редактирования материалов
  const [inlineEditingMaterialId, setInlineEditingMaterialId] = useState<string | null>(null)
  const [newMaterialRows, setNewMaterialRows] = useState<Set<string>>(new Set())
  const [tempMaterialData, setTempMaterialData] = useState<Record<string, {
    supplier_material_name: string
    unit_id: string
    quantity: number
    price: number
  }>>({})

  // Состояния для редактирования названий
  const [editingNameId, setEditingNameId] = useState<string | null>(null)
  const [editingNameValue, setEditingNameValue] = useState<string>('')

  // Состояния для редактирования рабочего набора
  const [editingWorkSetId, setEditingWorkSetId] = useState<string | null>(null)
  const [editingWorkSetValue, setEditingWorkSetValue] = useState<string>('')

  // Состояния для отслеживания удалений и изменений названий (применяются при сохранении)
  const [deletedItems, setDeletedItems] = useState<Set<string>>(new Set())
  const [nameChanges, setNameChanges] = useState<Record<string, string>>({})
  const [pendingNameChanges, setPendingNameChanges] = useState<Record<string, string>>({})

  // Состояние для сворачивания/разворачивания заголовка
  const [headerExpanded, setHeaderExpanded] = useState<boolean>(false)

  // Получаем масштаб приложения
  const { scale } = useScale()


  // Состояние для поиска материалов
  const [materialSearchTerm, setMaterialSearchTerm] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounced функция для поиска материалов
  const debouncedSetMaterialSearchTerm = useCallback((value: string) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setMaterialSearchTerm(value)
    }, 300)
  }, [])

  // Убираем старые состояния модального окна материалов
  // const [addMaterialModalVisible, setAddMaterialModalVisible] = useState(false)
  // const [selectedWorkForMaterial, setSelectedWorkForMaterial] = useState<{ id: string; name: string } | null>(null)

  // Загружаем данные ВОР и связанной информации
  const { data: vorData, isLoading: vorLoading } = useQuery({
    queryKey: ['vor-data', vorId],
    queryFn: async () => {
      if (!supabase || !vorId) return null

      // Загружаем ВОР с связанными комплектами
      const { data: vor, error: vorError } = await supabase
        .from('vor')
        .select(
          `
          id,
          name,
          project_id,
          rate_coefficient,
          created_at,
          updated_at,
          vor_chessboard_sets_mapping (
            set_id
          )
        `,
        )
        .eq('id', vorId)
        .single()

      if (vorError) throw vorError

      return {
        vor,
      }
    },
    enabled: !!vorId,
  })

  // Загружаем данные комплектов для кнопки "Назад" и фильтрации
  const { data: setsData } = useQuery({
    queryKey: ['vor-sets', vorId],
    queryFn: async () => {
      if (!supabase || !vorData?.vor) return []

      // Получаем ID комплектов, связанных с ВОР
      const setIds = vorData.vor.vor_chessboard_sets_mapping?.map((m) => m.set_id) || []
      if (setIds.length === 0) return []

      // Загружаем информацию о комплектах с проектами
      const { data: setsData, error } = await supabase
        .from('chessboard_sets')
        .select(
          `
          *,
          documentations:documentation_id(code, project_name),
          projects:project_id(id, name)
        `,
        )
        .in('id', setIds)

      if (error) throw error
      if (!setsData || setsData.length === 0) return []

      // Загружаем документации, связанные с конкретными комплектами через маппинг
      const { data: docsData, error: docsError } = await supabase
        .from('chessboard_sets_documents_mapping')
        .select(
          `
          set_id,
          documentations:documentation_id(id, code, project_name)
        `,
        )
        .in('set_id', setIds)

      if (docsError) {
        console.warn('Ошибка загрузки документаций:', docsError)
      }

      // Добавляем информацию о документациях к каждому комплекту
      const result = setsData.map((set) => ({
        ...set,
        set_documentations:
          docsData
            ?.filter((mapping) => mapping.set_id === set.id)
            ?.map((mapping) => mapping.documentations)
            ?.filter(Boolean) || [],
      }))

      return result
    },
    enabled: !!vorData?.vor,
  })

  // Вычисляем фильтры комплекта для ограничения рабочих наборов
  const setFilters = useMemo(() => {
    if (!setsData || setsData.length === 0) return undefined

    // Собираем все уникальные cost_type_ids и cost_category_ids из всех комплектов
    const allCostTypeIds = new Set<number>()
    const allCostCategoryIds = new Set<number>()

    setsData.forEach(set => {
      if (set.cost_type_ids && Array.isArray(set.cost_type_ids)) {
        set.cost_type_ids.forEach(id => allCostTypeIds.add(id))
      }
      if (set.cost_category_ids && Array.isArray(set.cost_category_ids)) {
        set.cost_category_ids.forEach(id => allCostCategoryIds.add(id))
      }
    })

    const costTypeIds = Array.from(allCostTypeIds)
    const costCategoryIds = Array.from(allCostCategoryIds)

    // Возвращаем фильтры только если есть данные для фильтрации
    if (costTypeIds.length > 0 || costCategoryIds.length > 0) {
      return {
        costTypeIds: costTypeIds.length > 0 ? costTypeIds : undefined,
        costCategoryIds: costCategoryIds.length > 0 ? costCategoryIds : undefined
      }
    }

    return undefined
  }, [setsData])

  // Инициализируем коэффициент из БД
  useEffect(() => {
    if (vorData?.vor?.rate_coefficient) {
      setCoefficient(vorData.vor.rate_coefficient)
    }
  }, [vorData?.vor?.rate_coefficient])

  // Мутация для обновления коэффициента в БД
  const updateCoefficientMutation = useMutation({
    mutationFn: async (newCoefficient: number) => {
      if (!supabase || !vorId) throw new Error('No supabase client or vorId')

      const { error } = await supabase
        .from('vor')
        .update({ rate_coefficient: newCoefficient })
        .eq('id', vorId)

      if (error) throw error
    },
    onSuccess: () => {
      // Обновляем кеш запросов
      queryClient.invalidateQueries({ queryKey: ['vor-data', vorId] })
    },
  })

  // Обработчик изменения коэффициента
  const handleCoefficientChange = (value: number | null) => {
    const newValue = value || 1
    setCoefficient(newValue)
    updateCoefficientMutation.mutate(newValue)
  }

  // Функция для навигации назад с передачей фильтров
  const handleGoBack = () => {
    if (setsData && setsData.length > 0) {
      // Получаем фильтры из первого комплекта
      const firstSet = setsData[0]
      const searchParams = new URLSearchParams()

      if (firstSet.project_id) {
        searchParams.set('project_id', firstSet.project_id)
      }

      if (firstSet.tag_id) {
        searchParams.set('section', firstSet.tag_id.toString())
      }

      if (firstSet.cost_category_ids && firstSet.cost_category_ids.length > 0) {
        searchParams.set('cost_category', firstSet.cost_category_ids[0].toString())
      }

      navigate(`/documents/vor?${searchParams.toString()}`)
    } else {
      // Если нет данных комплектов, переходим на главную страницу ВОР
      navigate('/documents/vor')
    }
  }

  // Функция для навигации к шахматке с фильтрами из комплекта
  const handleGoToChessboard = () => {
    if (setsData && setsData.length > 0) {
      // Получаем фильтры из первого комплекта
      const firstSet = setsData[0]
      const searchParams = new URLSearchParams()

      if (firstSet.project_id) {
        searchParams.set('project_id', firstSet.project_id)
      }

      // Собираем все уникальные документации из всех комплектов связанных с этим ВОР
      const allDocumentationIds = new Set<string>()

      setsData.forEach((set) => {
        // Проверяем новую структуру с множественными документами
        if (set.set_documentations && set.set_documentations.length > 0) {
          set.set_documentations.forEach((doc) => {
            if (doc.id) {
              allDocumentationIds.add(doc.id)
            }
          })
        }
        // Обратная совместимость со старой структурой
        else if (set.documentation_id) {
          allDocumentationIds.add(set.documentation_id)
        }
        // Альтернативный способ через связанную документацию
        else if (set.documentations?.id) {
          allDocumentationIds.add(set.documentations.id)
        }
      })

      // Добавляем все найденные документации как отдельные параметры
      Array.from(allDocumentationIds).forEach((docId) => {
        searchParams.append('documentation_id', docId)
      })

      if (firstSet.version_id) {
        searchParams.set('version_id', firstSet.version_id)
      }

      if (firstSet.tag_id) {
        searchParams.set('tag_id', firstSet.tag_id.toString())
      }

      if (firstSet.block_ids && firstSet.block_ids.length > 0) {
        searchParams.set('block_ids', firstSet.block_ids.join(','))
      }

      if (firstSet.cost_category_ids && firstSet.cost_category_ids.length > 0) {
        searchParams.set('cost_category_ids', firstSet.cost_category_ids.join(','))
      }

      if (firstSet.cost_type_ids && firstSet.cost_type_ids.length > 0) {
        searchParams.set('cost_type_ids', firstSet.cost_type_ids.join(','))
      }

      navigate(`/documents/chessboard?${searchParams.toString()}`)
    } else {
      // Если нет данных комплектов, переходим на шахматку без фильтров
      navigate('/documents/chessboard')
    }
  }

  // Загружаем данные ВОР из шахматки и расценок
  const { data: vorItems } = useQuery({
    queryKey: ['vor-items', vorId, coefficient],
    queryFn: async () => {
      if (!supabase || !vorData?.vor) return []

      // 1. Получаем ID комплектов, связанных с ВОР
      const setIds = vorData.vor.vor_chessboard_sets_mapping?.map((m) => m.set_id) || []
      if (setIds.length === 0) return []

      // 2. Загружаем информацию о комплектах и их фильтрах
      const { data: setsData, error: setsError } = await supabase
        .from('chessboard_sets')
        .select('*')
        .in('id', setIds)

      if (setsError) throw setsError
      if (!setsData || setsData.length === 0) return []

      // 3. Собираем все уникальные значения фильтров для загрузки всех нужных данных
      const allProjectIds = [...new Set(setsData.map((s) => s.project_id).filter(Boolean))]
      const allDocumentationIds = [
        ...new Set(setsData.map((s) => s.documentation_id).filter(Boolean)),
      ]

      if (allProjectIds.length === 0) return []

      // 4. Загружаем базовые данные шахматки для этих проектов
      const { data: chessboardData, error: chessboardError } = await supabase
        .from('chessboard')
        .select('id, project_id, material, unit_id')
        .in('project_id', allProjectIds)

      if (chessboardError) throw chessboardError

      if (!chessboardData || chessboardData.length === 0) return []

      // 5. Получаем ID всех записей для дополнительных запросов
      const chessboardIds = chessboardData.map((item) => item.id)

      // 6. Загружаем связанные данные отдельными запросами
      const [
        materialsData,
        unitsData,
        ratesData,
        mappingData,
        floorMappingData,
        nomenclatureMappingData,
      ] = await Promise.all([
        // Материалы
        supabase
          .from('materials')
          .select('uuid, name')
          .in('uuid', chessboardData.map((item) => item.material).filter(Boolean)),

        // Единицы измерения
        supabase
          .from('units')
          .select('id, name')
          .in('id', chessboardData.map((item) => item.unit_id).filter(Boolean)),

        // Расценки через mapping с единицами измерения
        supabase
          .from('chessboard_rates_mapping')
          .select(
            `
            chessboard_id,
            work_set_rate_id,
            work_set_rate:work_set_rate_id(work_name_id, base_rate, unit_id, units:unit_id(id, name), work_names:work_name_id(id, name))
          `,
          )
          .in('chessboard_id', chessboardIds),

        // Mapping данные
        supabase
          .from('chessboard_mapping')
          .select('chessboard_id, block_id, cost_category_id, cost_type_id, location_id')
          .in('chessboard_id', chessboardIds),

        // Объемы из floor mapping (quantityRd)
        supabase
          .from('chessboard_floor_mapping')
          .select('chessboard_id, "quantityRd"')
          .in('chessboard_id', chessboardIds),

        // Номенклатура через mapping с ценами
        supabase
          .from('chessboard_nomenclature_mapping')
          .select(
            `
            chessboard_id,
            supplier_names_id,
            conversion_coefficient,
            supplier_names:supplier_names_id(id, name, material_prices(price, purchase_date))
          `,
          )
          .in('chessboard_id', chessboardIds),
      ])

      // Создаем индексы для быстрого поиска
      const materialsMap = new Map(materialsData.data?.map((m) => [m.uuid, m]) || [])
      const unitsMap = new Map(unitsData.data?.map((u) => [u.id, u]) || [])
      const ratesMap = new Map<string, any[]>()
      ratesData.data?.forEach((r) => {
        if (!ratesMap.has(r.chessboard_id)) {
          ratesMap.set(r.chessboard_id, [])
        }
        ratesMap.get(r.chessboard_id)?.push(r)
      })
      const mappingMap = new Map(mappingData.data?.map((m) => [m.chessboard_id, m]) || [])

      // Создаем индекс для объемов - суммируем quantityRd по chessboard_id
      const floorQuantitiesMap = new Map<string, number>()
      floorMappingData.data?.forEach((f) => {
        const currentSum = floorQuantitiesMap.get(f.chessboard_id) || 0
        const quantityRd = f.quantityRd || 0
        floorQuantitiesMap.set(f.chessboard_id, currentSum + quantityRd)
      })

      // Создаем индекс для номенклатуры с ценами
      const nomenclatureMap = new Map<string, any[]>()
      nomenclatureMappingData.data?.forEach((n) => {
        if (!nomenclatureMap.has(n.chessboard_id)) {
          nomenclatureMap.set(n.chessboard_id, [])
        }
        nomenclatureMap.get(n.chessboard_id)?.push(n)
      })

      // 7. Обогащаем данные шахматки связанными данными
      const enrichedChessboardData = chessboardData.map((item) => ({
        ...item,
        materials: item.material ? materialsMap.get(item.material) : null,
        units: item.unit_id ? unitsMap.get(item.unit_id) : null,
        chessboard_rates_mapping: ratesMap.get(item.id) || [],
        chessboard_mapping: mappingMap.get(item.id) || null,
        chessboard_documentation_mapping: [], // Пока не используется в фильтрации
        chessboard_nomenclature_mapping: nomenclatureMap.get(item.id) || [], // Номенклатура с ценами
        quantityRd: floorQuantitiesMap.get(item.id) || 0, // Объем по пересчету РД
      }))

      // 8. Фильтруем данные шахматки в соответствии с настройками каждого комплекта
      const filteredChessboardData =
        enrichedChessboardData?.filter((item) => {
          return setsData.some((set) => {
            // Проверяем соответствие всем фильтрам комплекта
            if (set.project_id !== item.project_id) return false

            // Фильтр по документации (если указан)
            if (set.documentation_id) {
              const hasMatchingDoc = item.chessboard_documentation_mapping?.some(
                (mapping) =>
                  mapping.documentation_versions?.documentation_id === set.documentation_id,
              )
              if (!hasMatchingDoc) return false
            }

            // Фильтр по блоку (если указан)
            if (set.block_ids && set.block_ids.length > 0) {
              const hasMatchingBlock =
                item.chessboard_mapping?.block_id &&
                set.block_ids.includes(item.chessboard_mapping.block_id)
              if (!hasMatchingBlock) return false
            }

            // Фильтр по категории затрат (если указан)
            if (set.cost_category_ids && set.cost_category_ids.length > 0) {
              const hasMatchingCategory =
                item.chessboard_mapping?.cost_category_id &&
                set.cost_category_ids.includes(item.chessboard_mapping.cost_category_id)
              if (!hasMatchingCategory) return false
            }

            // Фильтр по типу затрат (если указан)
            if (set.cost_type_ids && set.cost_type_ids.length > 0) {
              const hasMatchingType =
                item.chessboard_mapping?.cost_type_id &&
                set.cost_type_ids.includes(item.chessboard_mapping.cost_type_id)
              if (!hasMatchingType) return false
            }

            return true
          })
        }) || []

      // 9. Пока используем заглушки для расценок, так как структура БД сложнее
      const typedRates: RateItem[] = []

      // 10. Группируем отфильтрованные данные по наименованию работ
      const workGroups = new Map<string, ChessboardItem[]>()
      filteredChessboardData.forEach((item) => {
        // Получаем наименование работы из связанных расценок
        const workName = item.chessboard_rates_mapping?.[0]?.work_set_rate?.work_names?.name || 'Работа не указана'
        if (!workGroups.has(workName)) {
          workGroups.set(workName, [])
        }
        workGroups.get(workName)?.push(item)
      })

      // 11. Формируем иерархическую структуру
      const result: VorItem[] = []
      let workIndex = 1

      workGroups.forEach((materials: ChessboardItem[], workName: string) => {
        // Получаем информацию о расценке из первого материала в группе
        const firstMaterial = materials[0]
        const rateInfo = firstMaterial?.chessboard_rates_mapping?.[0]?.work_set_rate
        const baseRate = rateInfo?.base_rate || 0
        const rateUnitName = rateInfo?.units?.name || ''

        // Рассчитываем количество для работы: суммируем количества материалов с той же единицей измерения, что у расценки
        let workQuantity = 0
        if (rateUnitName) {
          workQuantity = materials
            .filter((material) => material.units?.name === rateUnitName)
            .reduce((sum, material) => sum + (material.quantityRd || 0), 0)
        }

        // Если нет подходящих материалов, используем общее количество
        if (workQuantity === 0) {
          workQuantity = materials.reduce((sum, material) => sum + (material.quantityRd || 0), 0)
        }

        // Добавляем работу (пункт 1.)
        const workItem: VorItem = {
          id: `work_${workIndex}`,
          name: workName,
          unit: rateUnitName,
          quantity: workQuantity,
          nomenclature_price: 0, // Для работ номенклатурная цена = 0
          work_price: baseRate * coefficient,
          nomenclature_total: 0,
          work_total: baseRate * workQuantity * coefficient,
          type: 'work',
          level: 1,
          coefficient: coefficient,
          base_rate: baseRate,
          work_set_rate: { base_rate: baseRate },
        }
        result.push(workItem)

        // Добавляем материалы из номенклатуры (пункты 1.1, 1.2, ...)
        let materialIndex = 1
        materials.forEach((material) => {
          // Обрабатываем все позиции номенклатуры для этого material
          const nomenclatureItems = material.chessboard_nomenclature_mapping || []

          if (nomenclatureItems.length > 0) {
            // Если есть номенклатура, используем её
            nomenclatureItems.forEach((nomenclatureItem) => {
              const nomenclatureName =
                nomenclatureItem.supplier_names?.name || 'Номенклатура не указана'

              // Получаем последнюю цену из справочника
              const prices = nomenclatureItem.supplier_names?.material_prices || []
              const latestPrice =
                prices.length > 0
                  ? prices.sort(
                      (a, b) =>
                        new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime(),
                    )[0].price
                  : 0

              const quantity = material.quantityRd || 0

              const materialItem: VorItem = {
                id: `material_${workIndex}_${materialIndex}`,
                name: nomenclatureName,
                unit: material.units?.name || 'шт',
                quantity: quantity,
                nomenclature_price: latestPrice,
                work_price: 0, // Для материалов цена работы = 0
                nomenclature_total: latestPrice * quantity,
                work_total: 0, // Для материалов итого работы = 0
                type: 'material',
                parent_id: workItem.id,
                level: 2,
              }
              result.push(materialItem)

              // Обновляем итоги по работе
              workItem.nomenclature_total += materialItem.nomenclature_total

              materialIndex++
            })
          } else {
            // Если номенклатуры нет, используем материал как fallback
            const materialName = material.materials?.name || 'Материал не указан'
            const quantity = material.quantityRd || 0

            const materialItem: VorItem = {
              id: `material_${workIndex}_${materialIndex}`,
              name: materialName + ' (без номенклатуры)',
              unit: material.units?.name || 'шт',
              quantity: quantity,
              nomenclature_price: 0, // Нет цены если нет номенклатуры
              work_price: 0,
              nomenclature_total: 0,
              work_total: 0,
              type: 'material',
              parent_id: workItem.id,
              level: 2,
            }
            result.push(materialItem)
            materialIndex++
          }
        })

        workIndex++
      })

      return result
    },
    enabled: !!vorData?.vor,
  })

  // Функция для вычисления среднего коэффициента по всем работам в таблице
  const calculateAverageCoefficient = useCallback(() => {
    // Используем текущие данные таблицы для расчета
    const currentData = isEditingEnabled && editableVorData.length > 0
      ? editableVorData
      : (vorItemsData.length > 0 ? vorItemsData : (vorItems || []))

    // Фильтруем только работы (type === 'work') и исключаем удаленные элементы
    const workItems = currentData.filter(item =>
      item.type === 'work' && !deletedItems.has(item.id)
    )

    if (workItems.length === 0) return 1.0

    // Вычисляем средний коэффициент
    const totalCoefficient = workItems.reduce((sum, item) => {
      return sum + (item.coefficient || 1.0)
    }, 0)

    const averageCoefficient = totalCoefficient / workItems.length
    return Math.round(averageCoefficient * 10) / 10 // Округляем до 1 знака после запятой
  }, [isEditingEnabled, editableVorData, vorItemsData, vorItems, deletedItems])

  // Вычисляем и устанавливаем средний коэффициент
  const averageCoefficient = calculateAverageCoefficient()

  // Автоматическое обновление среднего коэффициента в БД
  useEffect(() => {
    if (averageCoefficient !== coefficient) {
      const timeoutId = setTimeout(() => {
        updateCoefficientMutation.mutate(averageCoefficient)
      }, 500) // Задержка 500мс для избежания частых обновлений

      return () => clearTimeout(timeoutId)
    }
  }, [averageCoefficient, coefficient, updateCoefficientMutation])

  // Загружаем данные ВОР из БД (новая схема)
  const { data: editableVorItems, isLoading: editableVorLoading } = useQuery({
    queryKey: ['editable-vor-items', vorId],
    queryFn: async () => {
      if (!vorId) return []
      return await getVorTableData(vorId)
    },
    enabled: !!vorId, // Загружаем всегда, не только при редактировании
  })

  // Загружаем единицы измерения для inline редактирования материалов
  const { data: units = [] } = useQuery({
    queryKey: ['units-options'],
    queryFn: getUnitsOptions,
    enabled: viewMode === 'edit' || viewMode === 'add', // Загружаем только в режиме редактирования
  })

  // Загружаем поставщиков для inline редактирования материалов с поиском
  const { data: suppliers = [] } = useQuery({
    queryKey: ['supplier-names-options', materialSearchTerm],
    queryFn: () => getSupplierNamesOptions(materialSearchTerm || undefined),
    enabled: (viewMode === 'edit' || viewMode === 'add'), // Загружаем только в режиме редактирования
  })

  // Загружаем расценки для inline редактирования работ
  const { data: rates = [] } = useQuery({
    queryKey: ['rates-options'],
    queryFn: getRatesOptions,
    enabled: viewMode === 'edit' || viewMode === 'add', // Загружаем только в режиме редактирования
  })

  // Загружаем рабочие наборы для редактирования с учетом фильтров комплекта
  const { data: workSets = [] } = useQuery({
    queryKey: ['work-sets-options', setFilters?.costTypeIds, setFilters?.costCategoryIds],
    queryFn: async () => {
      const { getWorkSetsByFilters } = await import('@/entities/vor')
      return getWorkSetsByFilters(setFilters?.costTypeIds, setFilters?.costCategoryIds)
    },
    enabled: (viewMode === 'edit' || viewMode === 'add') && !!setFilters,
  })

  // Синхронизируем локальные данные с данными из запроса
  useEffect(() => {
    if (vorItems) {
      setVorItemsData(vorItems)
    }
  }, [vorItems])

  // Синхронизируем редактируемые данные
  useEffect(() => {
    if (editableVorItems) {
      setEditableVorData(editableVorItems)
    }
  }, [editableVorItems])

  // Адаптивный расчёт высоты таблицы
  useEffect(() => {
    const calculateTableHeight = () => {
      const viewportHeight = window.innerHeight
      // Подробный расчёт всех элементов:
      const headerHeight = 96 // header приложения
      const pageHeaderHeight = 160 // заголовок ВОР + описание + название
      const legendHeight = 60 // легенда цветов
      const tableHeaderHeight = 45 // заголовки столбцов таблицы
      const summaryRowHeight = 40 // итоговая строка
      const paddingAndMargins = 40 // отступы контейнера + borders

      // Общий отступ с учётом ВСЕХ элементов
      const totalOffset = headerHeight + pageHeaderHeight + legendHeight +
                         tableHeaderHeight + summaryRowHeight + paddingAndMargins

      // Адаптивный расчёт с учётом размера экрана
      if (viewportHeight <= 768) {
        // Маленькие экраны - минимальные отступы
        setTableScrollHeight(`calc(100vh - ${totalOffset - 40}px)`)
      } else if (viewportHeight <= 1080) {
        // Средние экраны - стандартные отступы
        setTableScrollHeight(`calc(100vh - ${totalOffset}px)`)
      } else {
        // Большие экраны - дополнительный запас
        setTableScrollHeight(`calc(100vh - ${totalOffset + 20}px)`)
      }
    }

    calculateTableHeight()
    window.addEventListener('resize', calculateTableHeight)

    return () => {
      window.removeEventListener('resize', calculateTableHeight)
    }
  }, [])

  // Функция для обновления коэффициента в строке работы
  const updateItemCoefficient = (itemId: string, newCoefficient: number) => {
    setVorItemsData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === 'work') {
          const baseRate = item.base_rate || 0
          return {
            ...item,
            coefficient: newCoefficient,
            work_price: baseRate * newCoefficient,
            work_total: baseRate * item.quantity * newCoefficient,
          }
        }
        return item
      })
    )
  }

  // Функция для обновления количества
  const updateItemQuantity = (itemId: string, newQuantity: number, itemType: 'work' | 'material') => {
    setVorItemsData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === itemType) {
          if (itemType === 'work') {
            const baseRate = item.base_rate || 0
            const workPrice = baseRate * item.coefficient
            return {
              ...item,
              quantity: newQuantity,
              work_total: workPrice * newQuantity,
            }
          } else {
            // Для материалов
            return {
              ...item,
              quantity: newQuantity,
              material_total: item.material_price * newQuantity,
            }
          }
        }
        return item
      })
    )
  }

  // Функция для обновления цены материала
  const updateMaterialPrice = (itemId: string, newPrice: number) => {
    setVorItemsData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === 'material') {
          return {
            ...item,
            material_price: newPrice,
            material_total: newPrice * item.quantity,
          }
        }
        return item
      })
    )
  }

  // Функция для обновления цены работы (с пересчетом коэффициента или base_rate)
  const updateWorkPrice = (itemId: string, newPrice: number) => {
    setVorItemsData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === 'work') {
          const baseRateFromRates = item.work_set_rate?.base_rate

          if (baseRateFromRates && baseRateFromRates > 0) {
            // Есть базовая цена в справочнике - пересчитываем коэффициент
            const newCoefficient = newPrice / baseRateFromRates
            return {
              ...item,
              coefficient: newCoefficient,
              work_price: newPrice,
              work_total: newPrice * item.quantity,
            }
          } else {
            // Нет базовой цены - сохраняем как base_rate, коэффициент = 1
            return {
              ...item,
              base_rate: newPrice,
              coefficient: 1,
              work_price: newPrice,
              work_total: newPrice * item.quantity,
            }
          }
        }
        return item
      })
    )
  }

  // Функции для работы с новой схемой ВОР (VorTableItem)
  const updateTableItemQuantity = (itemId: string, newQuantity: number, itemType: 'work' | 'material') => {
    setEditableVorData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === itemType) {
          const updatedItem = { ...item, quantity: newQuantity }

          if (itemType === 'work') {
            const workPrice = (item.base_rate || 0) * (item.coefficient || 1)
            updatedItem.work_total = workPrice * newQuantity
          } else {
            updatedItem.material_total = (item.material_price || 0) * newQuantity
          }

          return updatedItem
        }
        return item
      })
    )

    // Отмечаем элемент как измененный
    setEditedItems(prev => new Set([...prev, itemId]))
    setEditedItemsData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        quantity: newQuantity
      }
    }))
  }

  const updateTableMaterialPrice = (itemId: string, newPrice: number) => {
    setEditableVorData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === 'material') {
          return {
            ...item,
            material_price: newPrice,
            material_total: newPrice * item.quantity
          }
        }
        return item
      })
    )

    // Отмечаем элемент как измененный
    setEditedItems(prev => new Set([...prev, itemId]))
    setEditedItemsData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        material_price: newPrice
      }
    }))
  }

  const updateTableMaterialUnit = (itemId: string, newUnitId: string, itemType: 'work' | 'material') => {
    setEditableVorData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === itemType) {
          const unitName = units.find(u => u.id === newUnitId)?.name || ''
          return {
            ...item,
            unit: unitName
          }
        }
        return item
      })
    )

    // Отмечаем элемент как измененный
    setEditedItems(prev => new Set([...prev, itemId]))
    setEditedItemsData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        unit_id: newUnitId
      }
    }))
  }

  const updateTableWorkPrice = (itemId: string, newPrice: number) => {
    setEditableVorData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === 'work') {
          // Логика пересчета согласно алгоритму
          const ratesBaseRate = item.work_set_rate?.base_rate || 0

          if (ratesBaseRate > 0) {
            // Есть базовая цена в справочнике - пересчитываем коэффициент
            const newCoefficient = newPrice / ratesBaseRate
            return {
              ...item,
              coefficient: newCoefficient,
              work_price: newPrice,
              work_total: newPrice * item.quantity
            }
          } else {
            // Нет базовой цены - сохраняем как base_rate, коэффициент = 1
            return {
              ...item,
              base_rate: newPrice,
              coefficient: 1,
              work_price: newPrice,
              work_total: newPrice * item.quantity
            }
          }
        }
        return item
      })
    )

    // Отмечаем элемент как измененный
    setEditedItems(prev => new Set([...prev, itemId]))
    setEditedItemsData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        work_price: newPrice
      }
    }))
  }

  const updateTableItemCoefficient = (itemId: string, newCoefficient: number) => {
    setEditableVorData(prevData =>
      prevData.map(item => {
        if (item.id === itemId && item.type === 'work') {
          const baseRate = item.base_rate || 0
          const workPrice = baseRate * newCoefficient
          return {
            ...item,
            coefficient: newCoefficient,
            work_price: workPrice,
            work_total: workPrice * item.quantity
          }
        }
        return item
      })
    )

    // Отмечаем элемент как измененный
    setEditedItems(prev => new Set([...prev, itemId]))
    setEditedItemsData(prev => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        coefficient: newCoefficient
      }
    }))
  }

  // Функции управления режимами
  const handleEditMode = () => {
    setViewMode('edit')
    setIsEditingEnabled(true)
    setSelectedRowKeys([])
  }

  const handleAddMode = () => {
    setViewMode('add')
    setIsEditingEnabled(true)
    setSelectedRowKeys([])
  }

  const handleAddWork = () => {
    setAddWorkModalVisible(true)
  }

  const handleAddWorkSuccess = () => {
    setAddWorkModalVisible(false)
    // Обновляем данные после добавления работы
    queryClient.invalidateQueries({ queryKey: ['editable-vor-items', vorId] })
    messageApi.success('Работа успешно добавлена')
  }

  const handleAddMaterial = (workId: string, workName: string) => {
    // Создаем временный ID для новой строки материала
    const tempId = `temp-material-${Date.now()}`

    // Создаем новую временную строку материала
    const newMaterialItem: VorTableItem = {
      id: tempId,
      type: 'material',
      name: '', // Будет заполняться через inline редактирование
      unit: '',
      quantity: 1,
      material_price: 0,
      material_total: 0,
      vor_work_id: workId,
      level: 2,
      sort_order: 1,
      parent_id: workId,
      is_modified: true
    }

    // Добавляем новую строку в данные таблицы сразу после работы
    setEditableVorData(prevData => {
      const workIndex = prevData.findIndex(item => item.id === workId && item.type === 'work')
      if (workIndex === -1) return prevData

      // Находим последний материал этой работы или сразу после работы
      let insertIndex = workIndex + 1
      while (insertIndex < prevData.length &&
             prevData[insertIndex].type === 'material' &&
             prevData[insertIndex].vor_work_id === workId) {
        insertIndex++
      }

      const newData = [...prevData]
      newData.splice(insertIndex, 0, newMaterialItem)
      return newData
    })

    // Отмечаем как новую строку для редактирования
    setNewMaterialRows(prev => new Set([...prev, tempId]))
    setInlineEditingMaterialId(tempId)

    // Инициализируем временные данные
    setTempMaterialData(prev => ({
      ...prev,
      [tempId]: {
        supplier_material_name: '',
        unit_id: '',
        quantity: 1,
        price: 0
      }
    }))
  }

  // Функции для inline редактирования материалов
  const handleSaveInlineMaterial = async (materialId: string) => {
    const tempData = tempMaterialData[materialId]
    if (!tempData || !tempData.supplier_material_name) {
      messageApi.warning('Заполните название материала')
      return
    }

    try {
      // Если это новая строка - создаем материал в БД
      if (newMaterialRows.has(materialId)) {
        const materialItem = editableVorData.find(item => item.id === materialId)
        if (!materialItem || !materialItem.vor_work_id) {
          messageApi.error('Ошибка: не найдена связанная работа')
          return
        }

        const materialData = {
          vor_work_id: materialItem.vor_work_id,
          supplier_material_name: tempData.supplier_material_name,
          unit_id: tempData.unit_id || undefined,
          quantity: tempData.quantity,
          price: tempData.price,
        }

        const newMaterial = await createVorMaterial(materialData)

        // Заменяем временную строку на реальную
        setEditableVorData(prevData =>
          prevData.map(item =>
            item.id === materialId
              ? {
                  ...item,
                  id: newMaterial.id,
                  name: tempData.supplier_material_name,
                  unit: tempData.unit_id ? units?.find(u => u.id === tempData.unit_id)?.name || '' : '',
                  quantity: tempData.quantity,
                  material_price: tempData.price,
                  material_total: tempData.price * tempData.quantity,
                  is_modified: false
                }
              : item
          )
        )

        // Убираем из временных состояний
        setNewMaterialRows(prev => {
          const newSet = new Set(prev)
          newSet.delete(materialId)
          return newSet
        })

        setTempMaterialData(prev => {
          const newData = { ...prev }
          delete newData[materialId]
          return newData
        })

        messageApi.success('Материал успешно добавлен')
      }

      setInlineEditingMaterialId(null)
    } catch (error) {
      console.error('Ошибка сохранения материала:', error)
      messageApi.error('Ошибка при сохранении материала')
    }
  }

  const handleCancelInlineMaterial = (materialId: string) => {
    if (newMaterialRows.has(materialId)) {
      // Удаляем новую строку
      setEditableVorData(prevData => prevData.filter(item => item.id !== materialId))
      setNewMaterialRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(materialId)
        return newSet
      })
      setTempMaterialData(prev => {
        const newData = { ...prev }
        delete newData[materialId]
        return newData
      })
    }
    setInlineEditingMaterialId(null)
  }

  const handleTempMaterialDataChange = (materialId: string, field: string, value: any) => {
    setTempMaterialData(prev => ({
      ...prev,
      [materialId]: {
        ...prev[materialId],
        [field]: value
      }
    }))

    // Обновляем отображение в таблице
    setEditableVorData(prevData =>
      prevData.map(item => {
        if (item.id === materialId) {
          const updatedItem = { ...item }
          if (field === 'supplier_material_name') {
            updatedItem.name = value
          } else if (field === 'quantity') {
            updatedItem.quantity = value
            updatedItem.material_total = value * (tempMaterialData[materialId]?.price || 0)
          } else if (field === 'price') {
            updatedItem.material_price = value
            updatedItem.material_total = (tempMaterialData[materialId]?.quantity || 1) * value
          } else if (field === 'unit_id') {
            updatedItem.unit = units?.find(u => u.id === value)?.name || ''
          }
          return updatedItem
        }
        return item
      })
    )
  }

  const handleDeleteMode = () => {
    setViewMode('delete')
    setSelectedRowKeys([])
  }

  const handleViewMode = () => {
    setViewMode('view')
    setIsEditingEnabled(false)
    setSelectedRowKeys([])
    setEditableVorData([])
  }

  // Функция для применения pending изменений названий к реальным записям БД
  const applyPendingNameChanges = async (pendingChanges: Record<string, string>) => {
    if (Object.keys(pendingChanges).length === 0) return


    // Получаем свежие данные реальных записей
    await queryClient.invalidateQueries({ queryKey: ['editable-vor-items', vorId] })
    const freshEditableItems = queryClient.getQueryData<VorTableItem[]>(['editable-vor-items', vorId])

    if (!freshEditableItems || freshEditableItems.length === 0) {
      return
    }


    // Создаем маппинг синтетических ID к реальным записям
    // Логика: work_1 -> первая работа, work_2 -> вторая работа, material_1_1 -> первый материал первой работы
    const workIndex = new Map<string, VorTableItem>()
    const materialIndex = new Map<string, VorTableItem>()

    let workCounter = 1
    const workMaterialCounters = new Map<number, number>()

    freshEditableItems.forEach(item => {
      if (item.type === 'work') {
        workIndex.set(`work_${workCounter}`, item)
        workMaterialCounters.set(workCounter, 1)
        workCounter++
      } else if (item.type === 'material') {
        // Находим родительскую работу по parent_id или vor_work_id
        const parentWorkItem = freshEditableItems.find(w =>
          w.type === 'work' && (w.id === item.parent_id || w.id === item.vor_work_id)
        )
        if (parentWorkItem) {
          // Находим номер работы
          const parentWorkNumber = Array.from(workIndex.entries())
            .find(([, work]) => work.id === parentWorkItem.id)?.[0]?.replace('work_', '')

          if (parentWorkNumber) {
            const materialCounter = workMaterialCounters.get(parseInt(parentWorkNumber)) || 1
            materialIndex.set(`material_${parentWorkNumber}_${materialCounter}`, item)
            workMaterialCounters.set(parseInt(parentWorkNumber), materialCounter + 1)
          }
        }
      }
    })

    // Применяем изменения
    for (const [syntheticId, newName] of Object.entries(pendingChanges)) {

      let realItem: VorTableItem | undefined

      if (syntheticId.startsWith('work_')) {
        realItem = workIndex.get(syntheticId)
      } else if (syntheticId.startsWith('material_')) {
        realItem = materialIndex.get(syntheticId)
      }

      if (realItem) {

        try {
          if (realItem.type === 'work') {
            // Обновляем работу
            await updateVorWork(realItem.id, { rate_id: newName })
          } else if (realItem.type === 'material') {
            // Обновляем материал
            await updateVorMaterial(realItem.id, { supplier_material_name: newName })
          }
        } catch (error) {
        }
      } else {
      }
    }

  }

  const handleSave = async () => {

    try {
      // Используем тот же приоритет данных, что и в таблице
      const currentData = isEditingEnabled && editableVorData.length > 0
        ? editableVorData
        : editableVorItems && editableVorItems.length > 0
          ? editableVorItems
          : vorItemsData.length > 0
            ? vorItemsData
            : vorItems || []

      for (const itemId of editedItems) {
        const item = currentData.find(item => item.id === itemId)
        const editedData = editedItemsData[itemId]

        if (!item || !editedData) {
          continue
        }


        // Проверяем, синтетический ли это ID (содержит подчеркивание)
        const isSyntheticId = itemId.includes('_')

        if (isSyntheticId) {
          continue
        }

        if (item.type === 'material') {
          // Материал - обновляем согласно алгоритму
          const updateData: any = {}
          let shouldModify = false

          // 1. Номенклатура цена за ед - is_modified остается неизменным
          if (editedData.material_price !== undefined) {
            updateData.price = editedData.material_price
          }

          // 2. Кол-во - is_modified меняется на true
          if (editedData.quantity !== undefined) {
            updateData.quantity = editedData.quantity
            shouldModify = true
          }

          // Если нужно изменить is_modified
          if (shouldModify) {
            updateData.is_modified = true
          }

          const result = await updateVorMaterial(itemId, updateData)

        } else if (item.type === 'work') {
          // Работа - обновляем согласно алгоритму
          const updateData: any = {}
          let shouldModify = false

          // 3. Кол-во и коэффициент - is_modified меняется на true
          if (editedData.quantity !== undefined) {
            updateData.quantity = editedData.quantity
            shouldModify = true
          }

          if (editedData.coefficient !== undefined) {
            updateData.coefficient = editedData.coefficient
            shouldModify = true
          }

          // 4. Работа цена за ед - сложная логика
          if (editedData.work_price !== undefined) {
            const ratesBaseRate = item.work_set_rate?.base_rate || 0

            if (ratesBaseRate > 0) {
              // Есть базовая цена в справочнике - пересчитываем коэффициент
              const newCoefficient = editedData.work_price / ratesBaseRate
              updateData.coefficient = newCoefficient
            } else {
              // Нет базовой цены - сохраняем в base_rate, коэффициент = 1
              updateData.base_rate = editedData.work_price
              updateData.coefficient = 1.0
            }
          }

          // Если нужно изменить is_modified (только для кол-ва и коэффициента)
          if (shouldModify) {
            updateData.is_modified = true
          }

          const result = await updateVorWork(itemId, updateData)
        }
      }

      // Сохраняем новые материалы
      for (const materialId of newMaterialRows) {
        const tempData = tempMaterialData[materialId]
        const materialItem = editableVorData.find(item => item.id === materialId)

        if (!tempData || !materialItem || !materialItem.vor_work_id) {
          continue
        }

        if (!tempData.supplier_material_name) {
          continue
        }

        const materialData = {
          vor_work_id: materialItem.vor_work_id,
          supplier_material_name: tempData.supplier_material_name,
          unit_id: tempData.unit_id || undefined,
          quantity: tempData.quantity,
          price: tempData.price,
        }

        const newMaterial = await createVorMaterial(materialData)

        // Заменяем временную строку на реальную
        setEditableVorData(prevData =>
          prevData.map(item =>
            item.id === materialId
              ? {
                  ...item,
                  id: newMaterial.id,
                  name: tempData.supplier_material_name,
                  unit: tempData.unit_id ? units?.find(u => u.id === tempData.unit_id)?.name || '' : '',
                  quantity: tempData.quantity,
                  material_price: tempData.price,
                  material_total: tempData.price * tempData.quantity,
                  is_modified: false
                }
              : item
          )
        )
      }

      // Применяем изменения названий
      // Используем тот же источник данных currentData, что и выше
      for (const [itemId, newName] of Object.entries(nameChanges)) {

        // Проверяем, синтетический ли это ID (содержит подчеркивание)
        const isSyntheticId = itemId.includes('_')
        if (isSyntheticId) {
          // Сохраняем изменения синтетических ID в pending для применения к реальным записям
          setPendingNameChanges(prev => ({ ...prev, [itemId]: newName }))
          continue
        }

        const item = currentData.find(item => item.id === itemId)
        if (!item) {
          continue
        }

        if (item.type === 'material') {
          // Нужно найти поставщика по названию номенклатуры из справочника
          const selectedSupplier = suppliers.find(supplier => supplier.name === newName)
          if (selectedSupplier) {
            await updateVorMaterial(itemId, {
              supplier_material_name: newName,
              // Если у поставщика есть дополнительная информация, добавляем её
              ...(selectedSupplier.supplier_name && { supplier_name: selectedSupplier.supplier_name })
            })
          } else {
            // Если не найдено в справочнике, просто обновляем название
            await updateVorMaterial(itemId, {
              supplier_material_name: newName
            })
          }
        } else if (item.type === 'work') {
          // Нужно найти rate_id по названию работы из справочника расценок
          const selectedRate = rates.find(rate => rate.work_name === newName)
          if (selectedRate) {
            await updateVorWork(itemId, {
              rate_id: selectedRate.id,
              base_rate: selectedRate.base_rate
            })
          } else {
          }
        }
      }

      // Применяем удаления
      for (const itemId of deletedItems) {
        const item = editableVorData.find(item => item.id === itemId)
        if (!item) continue


        if (item.type === 'work') {
          // Сначала удаляем все материалы этой работы
          await deleteVorMaterialsByWorkId(itemId)
          // Затем удаляем саму работу
          await deleteVorWork(itemId)
        } else if (item.type === 'material') {
          await deleteVorMaterial(itemId)
        }
      }

      // Проверяем наличие pending изменений для синтетических ID ПЕРЕД очисткой состояний
      if (Object.keys(pendingNameChanges).length > 0) {

        // Если нет реальных записей в БД, но есть pending изменения - создаем записи и применяем изменения
        if ((!editableVorItems || editableVorItems.length === 0) && setsData && setsData.length > 0) {

          try {
            // Создаем реальные записи в БД
            await handleReloadFromChessboard()

            // Ждем создания записей и получаем их
            await queryClient.invalidateQueries({ queryKey: ['editable-vor-items', vorId] })

            // Применяем pending изменения к созданным записям
            await applyPendingNameChanges(pendingNameChanges)

          } catch (error) {
          }
        }
      }

      // Очищаем все состояния после обработки
      setNewMaterialRows(new Set())
      setTempMaterialData({})
      setDeletedItems(new Set())
      setNameChanges({})
      setPendingNameChanges({})

      messageApi.success('Изменения сохранены')

      // Перезагружаем данные
      await queryClient.invalidateQueries({ queryKey: ['editable-vor-items', vorId] })

      setViewMode('view')
      setIsEditingEnabled(false)
      setEditedItems(new Set())
      setEditedItemsData({})

    } catch (error) {
      messageApi.error('Ошибка при сохранении изменений')
    }
  }

  const handleCancel = () => {
    setViewMode('view')
    setIsEditingEnabled(false)
    setSelectedRowKeys([])
    setEditableVorData([])
    // Очищаем отслеживание изменений
    setEditedItems(new Set())
    setEditedItemsData({})
    // Очищаем новые материалы
    setNewMaterialRows(new Set())
    setTempMaterialData({})
    // Очищаем редактирование названий
    setEditingNameId(null)
    setEditingNameValue('')
    // Очищаем удаления и изменения названий
    setDeletedItems(new Set())
    setNameChanges({})
  }

  const handleDeleteSelected = async () => {
    try {
      // TODO: Реализовать удаление выбранных элементов
      messageApi.success(`Удалено ${selectedRowKeys.length} элементов`)
      setSelectedRowKeys([])
      setViewMode('view')
      queryClient.invalidateQueries({ queryKey: ['vor-items', vorId] })
    } catch (error) {
      console.error('Ошибка удаления:', error)
      messageApi.error('Ошибка при удалении элементов')
    }
  }

  // Пометка работы как удаленной (не удаляем сразу)
  const handleDeleteWork = (workId: string) => {

    // Помечаем работу как удаленную
    setDeletedItems(prev => new Set([...prev, workId]))

    // Находим все материалы этой работы и тоже помечаем их как удаленные
    const workMaterials = editableVorData.filter(item =>
      item.type === 'material' && item.vor_work_id === workId
    )

    if (workMaterials.length > 0) {
      setDeletedItems(prev => {
        const newSet = new Set(prev)
        workMaterials.forEach(material => newSet.add(material.id))
        return newSet
      })
    }

    messageApi.success(`Работа помечена для удаления (${workMaterials.length} материалов тоже)`)
  }

  // Пометка материала как удаленного (не удаляем сразу)
  const handleDeleteMaterial = (materialId: string) => {

    // Если это новый материал (еще не сохранен в БД)
    if (newMaterialRows.has(materialId)) {
      // Просто убираем из временных состояний
      setEditableVorData(prevData => prevData.filter(item => item.id !== materialId))
      setNewMaterialRows(prev => {
        const newSet = new Set(prev)
        newSet.delete(materialId)
        return newSet
      })
      setTempMaterialData(prev => {
        const newData = { ...prev }
        delete newData[materialId]
        return newData
      })
      messageApi.success('Новый материал удален')
      return
    }

    // Если это существующий материал - помечаем как удаленный
    setDeletedItems(prev => new Set([...prev, materialId]))
    messageApi.success('Материал помечен для удаления')
  }

  // Функции для редактирования названий
  const handleStartEditName = (id: string, currentName: string) => {
    setEditingNameId(id)
    setEditingNameValue(currentName)
  }

  const handleSaveEditName = (itemId: string, itemType: 'work' | 'material') => {

    // Сохраняем изменение названия во временном состоянии
    setNameChanges(prev => ({
      ...prev,
      [itemId]: editingNameValue
    }))

    // Обновляем локальные данные для отображения
    setEditableVorData(prevData =>
      prevData.map(item =>
        item.id === itemId
          ? { ...item, name: editingNameValue, is_modified: true }
          : item
      )
    )

    // Сбрасываем состояние редактирования
    setEditingNameId(null)
    setEditingNameValue('')

    messageApi.success('Изменение названия сохранено (будет применено при общем сохранении)')
  }

  const handleCancelEditName = () => {
    setEditingNameId(null)
    setEditingNameValue('')
  }

  // Функции для редактирования рабочего набора
  const handleStartEditWorkSet = (id: string, currentWorkSet: string) => {
    setEditingWorkSetId(id)
    setEditingWorkSetValue(currentWorkSet)
  }

  const handleSaveEditWorkSet = async (itemId: string) => {
    if (!editingWorkSetValue) {
      messageApi.error('Выберите рабочий набор')
      return
    }

    try {
      // Находим выбранный рабочий набор
      const selectedWorkSet = workSets.find(ws => ws.work_set === editingWorkSetValue)
      if (!selectedWorkSet) {
        messageApi.error('Рабочий набор не найден')
        return
      }

      // Обновляем work_set_rate_id в БД
      await updateVorWork(itemId, {
        work_set_rate_id: selectedWorkSet.id,
        is_modified: true
      })

      // Обновляем локальные данные
      setEditableVorData(prevData =>
        prevData.map(item =>
          item.id === itemId
            ? { ...item, work_set_name: editingWorkSetValue, work_set_rate_id: selectedWorkSet.id, is_modified: true }
            : item
        )
      )

      // Сбрасываем состояние редактирования
      setEditingWorkSetId(null)
      setEditingWorkSetValue('')

      messageApi.success('Рабочий набор обновлен')

      // Обновляем данные
      queryClient.invalidateQueries({ queryKey: ['editable-vor-items', vorId] })
    } catch (error) {
      console.error('Ошибка обновления рабочего набора:', error)
      messageApi.error('Ошибка при обновлении рабочего набора')
    }
  }

  const handleCancelEditWorkSet = () => {
    setEditingWorkSetId(null)
    setEditingWorkSetValue('')
  }

  // Функция для принудительной загрузки данных из комплекта в БД
  const handleReloadFromChessboard = async () => {
    if (!vorId || !setsData || setsData.length === 0) {
      messageApi.error('Нет данных комплекта для загрузки')
      return
    }

    try {
      const setId = setsData[0].id

      // Очищаем существующие данные ВОР

      // Сначала удаляем материалы (у них есть внешний ключ на работы)
      const { error: deleteMaterialsError } = await supabase
        .from('vor_materials')
        .delete()
        .in('vor_work_id',
          supabase
            .from('vor_works')
            .select('id')
            .eq('vor_id', vorId)
        )

      if (deleteMaterialsError) {
        throw deleteMaterialsError
      }

      // Затем удаляем работы
      const { error: deleteWorksError } = await supabase
        .from('vor_works')
        .delete()
        .eq('vor_id', vorId)

      if (deleteWorksError) {
        throw deleteWorksError
      }


      // Вызываем функцию заполнения ВОР данными из комплекта
      await populateVorFromChessboardSet(vorId, setId)


      // Инвалидируем кеш для обновления данных
      queryClient.invalidateQueries({ queryKey: ['editable-vor-items', vorId] })
      queryClient.invalidateQueries({ queryKey: ['vor-items', vorId] })

      messageApi.success('Данные ВОР успешно загружены из комплекта')
    } catch (error) {
      messageApi.error('Ошибка при загрузке данных из комплекта')
    }
  }

  // Функция экспорта в Excel
  const handleExportToExcel = () => {
    try {
      // Используем ту же логику выбора данных, что и таблица
      const currentData = isEditingEnabled && editableVorData.length > 0
        ? editableVorData
        : editableVorItems && editableVorItems.length > 0
          ? editableVorItems
          : vorItemsData.length > 0
            ? vorItemsData
            : (vorItems || [])
      if (!vorData?.vor || !currentData.length || !projectCodes) {
        messageApi.error('Нет данных для экспорта')
        return
      }

      // Подготавливаем данные для экспорта
      const exportData = []

      // Заголовок документа
      exportData.push([`ВЕДОМОСТЬ ОБЪЕМОВ РАБОТ по комплекту ${setInfo}`])
      exportData.push([
        `Выполнение комплекса строительно-монтажных работ по комплекту: ${projectCodes}`,
      ])
      exportData.push(['']) // Пустая строка

      // Заголовки таблицы
      exportData.push([
        '№',
        'Наименование',
        'Ед Изм',
        'Кол-во',
        'Номенклатура цены за ед руб вкл НДС',
        'Работа цены за ед руб вкл НДС',
        'Номенклатура Итого руб вкл НДС',
        'Работа Итого руб вкл НДС',
        'Сумма Итого руб вкл НДС',
      ])

      // Данные таблицы
      currentData.forEach((item, index) => {
        let rowNumber = ''
        if (item.type === 'work') {
          const workItems = currentData.filter((i) => i.type === 'work')
          const workIndex = workItems.findIndex((i) => i.id === item.id) + 1
          rowNumber = `${workIndex}.`
        } else {
          const workItems = currentData.filter((i) => i.type === 'work')
          // Поддерживаем обе схемы: новую (vor_work_id) и старую (parent_id)
          const parentWorkId = item.vor_work_id || item.parent_id
          const parentWork = workItems.find((i) => i.id === parentWorkId)
          if (parentWork) {
            const workIndex = workItems.findIndex((i) => i.id === parentWork.id) + 1
            const materialsInWork = currentData.filter(
              (i) => i.type === 'material' && (i.vor_work_id === parentWork.id || i.parent_id === parentWork.id),
            )
            const materialIndex = materialsInWork.findIndex((i) => i.id === item.id) + 1
            rowNumber = `${workIndex}.${materialIndex}`
          }
        }

        const currentRowIndex = 5 + index // Excel строка (начинаем с 5, так как Excel считает с 1)

        const nomenclaturePrice = item.type === 'work' ? '' : Math.round(item.material_price || item.nomenclature_price || 0) || ''
        const workPrice = Math.round(item.work_price) || ''

        // Формулы для итоговых столбцов
        let nomenclatureTotal, workTotal, total

        if (item.type === 'work') {
          // Для работ номенклатурные итоги пустые
          nomenclatureTotal = ''
          workTotal = item.quantity && workPrice
            ? { f: `D${currentRowIndex}*F${currentRowIndex}` } // Количество * Работа цена за ед
            : Math.round(item.work_total) || ''
        } else {
          // Для материалов
          nomenclatureTotal = item.quantity && nomenclaturePrice
            ? { f: `D${currentRowIndex}*E${currentRowIndex}` } // Количество * Номенклатура цена за ед
            : Math.round(item.nomenclature_total) || ''
          workTotal = ''
        }

        // Общая сумма - сумма номенклатуры и работы
        if (item.type === 'work') {
          total = workTotal ? { f: `SUM(G${currentRowIndex}:H${currentRowIndex})` } : Math.round(item.work_total) || ''
        } else {
          total = nomenclatureTotal ? { f: `SUM(G${currentRowIndex}:H${currentRowIndex})` } : Math.round(item.nomenclature_total) || ''
        }

        exportData.push([
          rowNumber,
          item.name,
          item.unit,
          item.quantity || '',
          nomenclaturePrice,
          workPrice,
          nomenclatureTotal,
          workTotal,
          total,
        ])
      })

      // Добавляем строку-разделитель
      exportData.push([''])

      // Добавляем строку итогов с формулами
      const firstDataRow = 5 // Строка 5 в Excel (данные начинаются с 5-й строки)
      const lastDataRow = firstDataRow + currentData.length - 1

      exportData.push([
        '', // № (пустая)
        'Итого:', // Наименование
        '', // Ед Изм (пустая)
        '', // Кол-во (пустая)
        '', // Номенклатура цены за ед (пустая)
        '', // Работа цены за ед (пустая)
        { f: `SUM(G${firstDataRow}:G${lastDataRow})` }, // Номенклатура Итого (формула)
        { f: `SUM(H${firstDataRow}:H${lastDataRow})` }, // Работа Итого (формула)
        { f: `SUM(I${firstDataRow}:I${lastDataRow})` }  // Сумма Итого (формула)
      ])

      // Создаем workbook и worksheet
      const ws = XLSX.utils.aoa_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'ВОР')

      // Автоматическое определение ширины колонок
      const colWidths = exportData[4].map((_, colIndex) => {
        const maxLength = exportData.reduce((max, row) => {
          const cellValue = row[colIndex] ? String(row[colIndex]) : ''
          return Math.max(max, cellValue.length)
        }, 0)

        // Для столбца A (индекс 0) делаем ширину в 4 раза меньше
        if (colIndex === 0) {
          return { wch: Math.min(Math.max(maxLength + 2, 10), 50) / 4 }
        }

        return { wch: Math.min(Math.max(maxLength + 2, 10), 50) }
      })
      ws['!cols'] = colWidths

      // Объединяем ячейки для заголовков
      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }, // ВЕДОМОСТЬ ОБЪЕМОВ РАБОТ по комплекту
        { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }, // Выполнение комплекса...
      ]

      // Стили для заголовков
      const headerStyle = {
        font: { bold: true, sz: 14 },
        alignment: { horizontal: 'center', vertical: 'center' },
      }

      const tableHeaderStyle = {
        font: { bold: true, sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        fill: { fgColor: { rgb: 'E6E6FA' } },
        border: {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        }
      }



      const totalRowIndex = firstDataRow + currentData.length + 1 // +1 для пустой строки разделителя

      // Генерируем имя файла
      const fileName = `ВОР_${vorData.vor.name.replace(/[^\w\s]/gi, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`

      // Сохраняем файл
      XLSX.writeFile(wb, fileName)
      messageApi.success('Файл успешно экспортирован')
    } catch (error) {
      console.error('Ошибка при экспорте в Excel:', error)
      messageApi.error('Ошибка при экспорте в Excel')
    }
  }

  // Функция для определения стилей строк таблицы
  const getRowClassName = (record: VorItem | VorTableItem) => {
    const baseClass = record.type === 'work' ? 'vor-work-row' : ''

    // Добавляем класс для измененных строк
    if ('is_modified' in record && record.is_modified) {
      return `${baseClass} vor-modified-row`.trim()
    }

    return baseClass
  }

  const columns = [
    {
      title: '№',
      key: 'index',
      width: '3%',
      render: (_: unknown, record: VorItem) => {
        const currentData = vorItemsData.length > 0 ? vorItemsData : (vorItems || [])
        if (record.type === 'work') {
          // Находим номер работы среди всех работ
          const workItems = currentData.filter((item) => item.type === 'work')
          const workIndex = workItems.findIndex((item) => item.id === record.id) + 1
          return `${workIndex}.`
        } else {
          // Для материалов находим номер работы и номер материала внутри работы
          const workItems = currentData.filter((item) => item.type === 'work')
          // Поддерживаем обе схемы: новую (vor_work_id) и старую (parent_id)
          const parentWorkId = record.vor_work_id || record.parent_id
          const parentWork = workItems.find((item) => item.id === parentWorkId)
          if (parentWork) {
            const workIndex = workItems.findIndex((item) => item.id === parentWork.id) + 1
            const materialsInWork = currentData.filter(
              (item) => item.type === 'material' && (item.vor_work_id === parentWork.id || item.parent_id === parentWork.id),
            )
            const materialIndex = materialsInWork.findIndex((item) => item.id === record.id) + 1
            return `${workIndex}.${materialIndex}`
          }
        }
        return ''
      },
    },
    {
      title: formatHeaderText('Рабочий набор'),
      dataIndex: 'work_set_name',
      key: 'work_set_name',
      width: '10%',
      render: (text: string, record: VorItem | VorTableItem) => {
        // Показываем рабочий набор только для работ
        if (record.type !== 'work') {
          return ''
        }

        // Режим редактирования рабочего набора
        if (viewMode === 'edit' && editingWorkSetId === record.id) {
          return (
            <div>
              <Select
                value={editingWorkSetValue}
                onChange={setEditingWorkSetValue}
                style={{ width: '100%', marginBottom: 8 }}
                dropdownStyle={{ width: 500 }}
                showSearch
                allowClear
                placeholder="Выберите рабочий набор"
                filterOption={(input, option) => {
                  const text = option?.children?.toString() || ""
                  return text.toLowerCase().includes(input.toLowerCase())
                }}
              >
                {workSets.map(ws => (
                  <Select.Option key={ws.id} value={ws.work_set}>
                    {ws.work_set}
                  </Select.Option>
                ))}
              </Select>
              <Space>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => handleSaveEditWorkSet(record.id)}
                >
                  Сохранить
                </Button>
                <Button
                  size="small"
                  onClick={handleCancelEditWorkSet}
                >
                  Отмена
                </Button>
              </Space>
            </div>
          )
        }

        const isDeleted = deletedItems.has(record.id)
        const currentWorkSet = ('work_set_name' in record) ? (record.work_set_name || '') : ''

        return (
          <div
            style={{
              cursor: viewMode === 'edit' && !isDeleted ? 'pointer' : 'default',
              opacity: isDeleted ? 0.5 : 1,
              textDecoration: isDeleted ? 'line-through' : 'none',
            }}
            onClick={() => {
              if (viewMode === 'edit' && !isDeleted && record.type === 'work') {
                handleStartEditWorkSet(record.id, currentWorkSet)
              }
            }}
          >
            {currentWorkSet || '-'}
          </div>
        )
      },
    },
    {
      title: formatHeaderText('Наименование'),
      dataIndex: 'name',
      key: 'name',
      width: '24%', // Динамическая ширина для наименования
      render: (text: string, record: VorItem | VorTableItem) => {
        const isModified = 'is_modified' in record && record.is_modified
        const isNewMaterial = newMaterialRows.has(record.id)
        const isInlineEditing = inlineEditingMaterialId === record.id

        // Если это новый материал в режиме редактирования - показываем селект
        if (isNewMaterial && isInlineEditing && record.type === 'material') {
          return (
            <div style={{ paddingLeft: 20 }}>
              <Select
                showSearch
                placeholder="Выберите материал"
                style={{ width: '100%' }}
                dropdownStyle={{ width: 500 }}
                value={tempMaterialData[record.id]?.supplier_material_name}
                onSearch={(value) => {
                  // Обновляем локальные данные немедленно для отзывчивости UI
                  handleTempMaterialDataChange(record.id, 'supplier_material_name', value)
                  // Запускаем debounced поиск в API
                  debouncedSetMaterialSearchTerm(value)
                }}
                onChange={(value) => {
                  handleTempMaterialDataChange(record.id, 'supplier_material_name', value)
                  // При выборе из списка также можем обновить поиск
                  if (value) {
                    debouncedSetMaterialSearchTerm(value)
                  }
                }}
                filterOption={false}
                notFoundContent="Введите название материала"
                dropdownRender={(menu) => (
                  <>
                    {menu}
                    <div style={{ padding: 8, borderTop: '1px solid #d9d9d9' }}>
                      <Button
                        size="small"
                        type="primary"
                        onClick={() => handleSaveInlineMaterial(record.id)}
                        style={{ marginRight: 8 }}
                      >
                        Сохранить
                      </Button>
                      <Button
                        size="small"
                        onClick={() => handleCancelInlineMaterial(record.id)}
                      >
                        Отмена
                      </Button>
                    </div>
                  </>
                )}
              >
                {suppliers.map(supplier => (
                  <Select.Option key={supplier.id} value={supplier.name}>
                    {supplier.name}
                  </Select.Option>
                ))}
              </Select>
            </div>
          )
        }

        // В режиме редактирования показываем возможность редактирования названий
        if (viewMode === 'edit' && editingNameId === record.id) {
          // Фильтруем расценки по рабочему набору текущей работы
          const filteredRates = record.type === 'work' && record.work_set_name
            ? rates.filter(rate => rate.work_set === record.work_set_name)
            : rates

          return (
            <div style={{ paddingLeft: record.level === 2 ? 20 : 0 }}>
              {record.type === 'work' ? (
                // Для работ показываем выпадающий список расценок, отфильтрованных по рабочему набору
                <Select
                  value={editingNameValue}
                  onChange={setEditingNameValue}
                  style={{ width: '100%', marginBottom: 8 }}
                  dropdownStyle={{ width: 500 }}
                  showSearch
                  allowClear
                  placeholder="Выберите расценку"
                  filterOption={(input, option) => {
                    const text = option?.children?.toString() || ""
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {filteredRates.map(rate => (
                    <Select.Option key={rate.id} value={rate.work_name}>
                      {rate.work_name}
                    </Select.Option>
                  ))}
                </Select>
              ) : (
                // Для материалов показываем выпадающий список номенклатуры
                <Select
                  value={editingNameValue}
                  onChange={setEditingNameValue}
                  style={{ width: '100%', marginBottom: 8 }}
                  dropdownStyle={{ width: 500 }}
                  showSearch
                  allowClear
                  placeholder="Выберите номенклатуру"
                  filterOption={(input, option) => {
                    const text = option?.children?.toString() || ""
                    return text.toLowerCase().includes(input.toLowerCase())
                  }}
                >
                  {suppliers.map(supplier => (
                    <Select.Option key={supplier.id} value={supplier.name}>
                      {supplier.name}
                    </Select.Option>
                  ))}
                </Select>
              )}
              <Space>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => handleSaveEditName(record.id, record.type)}
                >
                  Сохранить
                </Button>
                <Button
                  size="small"
                  onClick={handleCancelEditName}
                >
                  Отмена
                </Button>
              </Space>
            </div>
          )
        }

        const isDeleted = deletedItems.has(record.id)

        return (
          <div
            style={{
              paddingLeft: record.level === 2 ? 20 : 0,
              fontWeight: record.type === 'work' ? 'bold' : 'normal',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: '1.2',
              position: 'relative',
              cursor: viewMode === 'edit' && !isNewMaterial && !isDeleted ? 'pointer' : 'default',
              opacity: isDeleted ? 0.5 : 1,
              textDecoration: isDeleted ? 'line-through' : 'none',
              backgroundColor: isDeleted ? '#ffebee' : 'transparent',
            }}
            onClick={() => {
              if (viewMode === 'edit' && !isNewMaterial && !isDeleted) {
                handleStartEditName(record.id, text)
              }
            }}
            title={
              isDeleted
                ? 'Элемент помечен для удаления'
                : (viewMode === 'edit' && !isNewMaterial ? 'Нажмите для редактирования' : undefined)
            }
          >
            {isModified && (
              <span
                style={{
                  position: 'absolute',
                  left: record.level === 2 ? 0 : -20,
                  top: 0,
                  color: '#ff4d4f',
                  fontWeight: 'bold',
                  fontSize: '16px',
                }}
                title="Строка была изменена или добавлена"
              >
                *
              </span>
            )}
            {text}
            {isDeleted && (
              <span
                style={{
                  marginLeft: 8,
                  color: '#f50',
                  fontSize: '12px',
                  fontWeight: 'bold',
                }}
              >
                🗑 К удалению
              </span>
            )}
            {viewMode === 'edit' && !isNewMaterial && !isDeleted && (
              <span
                style={{
                  marginLeft: 8,
                  color: '#999',
                  fontSize: '12px',
                }}
              >
                ✏️
              </span>
            )}
          </div>
        )
      },
    },
    {
      title: formatHeaderText('Ед Изм'),
      dataIndex: 'unit',
      key: 'unit',
      width: '6%',
      render: (text: string, record: VorItem | VorTableItem) => {
        const isNewMaterial = newMaterialRows.has(record.id)
        const isInlineEditing = inlineEditingMaterialId === record.id

        // Если это новый материал в режиме редактирования - показываем селект
        if (isNewMaterial && isInlineEditing && record.type === 'material') {
          return (
            <Select
              placeholder="Ед.изм."
              style={{ width: '100%' }}
              size="small"
              value={tempMaterialData[record.id]?.unit_id}
              onChange={(value) => {
                handleTempMaterialDataChange(record.id, 'unit_id', value)
              }}
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

        // В режиме редактирования показываем Select для всех строк (работ и материалов)
        if (viewMode === 'edit') {
          // Найти текущий unit_id из VorTableItem
          const currentUnitId = editableVorData.length > 0
            ? units.find(u => u.name === text)?.id
            : undefined

          return (
            <Select
              placeholder="Ед.изм."
              style={{ width: '100%' }}
              size="small"
              value={currentUnitId}
              onChange={(value) => {
                if (isEditingEnabled && editableVorData.length > 0) {
                  updateTableMaterialUnit(record.id, value, record.type)
                }
              }}
              showSearch
              allowClear
              filterOption={(input, option) => {
                const optionText = option?.children?.toString().toLowerCase() || ''
                return optionText.includes(input.toLowerCase())
              }}
            >
              {units.map(unit => (
                <Select.Option key={unit.id} value={unit.id}>
                  {unit.name}
                </Select.Option>
              ))}
            </Select>
          )
        }

        return text
      },
    },
    {
      title: formatHeaderText('Коэф-т'),
      dataIndex: 'coefficient',
      key: 'coefficient',
      width: '6%',
      render: (value: number | undefined, record: VorItem) => {
        // Показываем InputNumber только для строк работ
        if (record.type === 'work') {
          return (
            <InputNumber
              min={0.1}
              max={10}
              step={0.1}
              precision={1}
              value={value || coefficient}
              onChange={(newValue) => {
                if (isEditingEnabled && editableVorData.length > 0) {
                  updateTableItemCoefficient(record.id, newValue || 1)
                } else {
                  updateItemCoefficient(record.id, newValue || 1)
                }
              }}
              style={{ width: '100%' }}
              size="small"
              parser={parseNumberWithSeparators}
            />
          )
        }
        // Для строк материалов возвращаем пустое значение
        return null
      },
    },
    {
      title: formatHeaderText('Кол-во'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: '6%',
      render: (value: number, record: VorItem | VorTableItem) => {
        const isNewMaterial = newMaterialRows.has(record.id)
        const isInlineEditing = inlineEditingMaterialId === record.id

        // Если это новый материал в режиме редактирования - показываем специальный InputNumber
        if (isNewMaterial && isInlineEditing && record.type === 'material') {
          return (
            <InputNumber
              min={0}
              step={0.1}
              precision={3}
              value={tempMaterialData[record.id]?.quantity || 1}
              onChange={(newValue) => {
                handleTempMaterialDataChange(record.id, 'quantity', newValue || 1)
              }}
              style={{ width: '100%' }}
              size="small"
              placeholder="1"
              parser={parseNumberWithSeparators}
            />
          )
        }

        // В режиме редактирования показываем InputNumber для обычных элементов
        if (viewMode === 'edit') {
          return (
            <InputNumber
              min={0}
              step={0.1}
              precision={3}
              value={value}
              onChange={(newValue) => {
                if (isEditingEnabled && editableVorData.length > 0) {
                  updateTableItemQuantity(record.id, newValue || 0, record.type)
                } else {
                  updateItemQuantity(record.id, newValue || 0, record.type)
                }
              }}
              style={{ width: '100%' }}
              size="small"
              parser={parseNumberWithSeparators}
            />
          )
        }

        return value.toLocaleString('ru-RU')
      },
    },
    {
      title: formatHeaderText('Номенклатура цены за ед руб вкл НДС'),
      dataIndex: 'material_price',
      key: 'material_price',
      width: '11%',
      render: (value: number, record: VorItem | VorTableItem) => {
        // Для строк с работами из справочника Расценок не показываем ничего
        if (record.type === 'work') {
          return ''
        }

        const isNewMaterial = newMaterialRows.has(record.id)
        const isInlineEditing = inlineEditingMaterialId === record.id

        // Если это новый материал в режиме редактирования - показываем специальный InputNumber
        if (isNewMaterial && isInlineEditing && record.type === 'material') {
          return (
            <InputNumber
              min={0}
              step={1}
              precision={2}
              value={tempMaterialData[record.id]?.price || 0}
              onChange={(newValue) => {
                handleTempMaterialDataChange(record.id, 'price', newValue || 0)
              }}
              style={{ width: '100%' }}
              size="small"
              placeholder="0"
              parser={parseNumberWithSeparators}
            />
          )
        }

        // В режиме редактирования показываем InputNumber для обычных материалов
        if (viewMode === 'edit' && record.type === 'material') {
          return (
            <InputNumber
              min={0}
              step={1}
              precision={2}
              value={value || 0}
              onChange={(newValue) => {
                if (isEditingEnabled && editableVorData.length > 0) {
                  updateTableMaterialPrice(record.id, newValue || 0)
                } else {
                  updateMaterialPrice(record.id, newValue || 0)
                }
              }}
              style={{ width: '100%' }}
              size="small"
              parser={parseNumberWithSeparators}
            />
          )
        }

        return Math.round(value).toLocaleString('ru-RU')
      },
    },
    {
      title: formatHeaderText('Работа цены за ед руб вкл НДС'),
      dataIndex: 'work_price',
      key: 'work_price',
      width: '11%',
      render: (value: number, record: VorItem) => {
        // Для материалов не показываем ничего
        if (record.type === 'material') {
          return ''
        }

        // В режиме редактирования показываем InputNumber для работ
        if (viewMode === 'edit' && record.type === 'work') {
          return (
            <InputNumber
              min={0}
              step={1}
              precision={2}
              value={value || 0}
              onChange={(newValue) => {
                if (isEditingEnabled && editableVorData.length > 0) {
                  updateTableWorkPrice(record.id, newValue || 0)
                } else {
                  updateWorkPrice(record.id, newValue || 0)
                }
              }}
              style={{ width: '100%' }}
              size="small"
              parser={parseNumberWithSeparators}
            />
          )
        }

        return Math.round(value).toLocaleString('ru-RU')
      },
    },
    {
      title: formatHeaderText('Номенклатура Итого руб вкл НДС'),
      dataIndex: 'material_total',
      key: 'material_total',
      width: '11%',
      render: (value: number, record: VorItem | VorTableItem) => {
        // Для строк с работами из справочника Расценок не показываем ничего
        if (record.type === 'work') {
          return ''
        }
        return Math.round(value).toLocaleString('ru-RU')
      },
    },
    {
      title: formatHeaderText('Работа Итого руб вкл НДС'),
      dataIndex: 'work_total',
      key: 'work_total',
      width: '11%',
      render: (value: number, record: VorItem) => {
        // Для материалов не показываем ничего
        if (record.type === 'material') {
          return ''
        }
        return Math.round(value).toLocaleString('ru-RU')
      },
    },
    {
      title: formatHeaderText('Сумма Итого руб вкл НДС'),
      key: 'total_sum',
      width: '11%',
      render: (_, record: VorItem | VorTableItem) => {
        // Для строк с работами показываем значение из столбца "Работа Итого"
        if (record.type === 'work') {
          return <strong>{Math.round(record.work_total || 0).toLocaleString('ru-RU')}</strong>
        }
        // Для строк с материалами показываем значение из столбца "Номенклатура Итого"
        const materialTotal = 'material_total' in record ? record.material_total : (record as VorItem).nomenclature_total
        return <strong>{Math.round(materialTotal || 0).toLocaleString('ru-RU')}</strong>
      },
    },
  ]

  // Добавляем колонку действий для режима редактирования
  if (viewMode === 'edit' || viewMode === 'add') {
    columns.push({
      title: 'Действия',
      key: 'actions',
      width: '8%',
      fixed: 'right' as const,
      render: (_, record: VorItem) => {
        const isDeleted = deletedItems.has(record.id)

        // В режиме редактирования показываем кнопки удаления/восстановления
        if (viewMode === 'edit') {
          if (record.type === 'work') {
            return (
              <Space direction="vertical" size={4}>
                {!isDeleted && (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => handleAddMaterial(record.id, record.name)}
                    style={{ padding: 0, fontSize: '12px' }}
                  >
                    + Материал
                  </Button>
                )}
                {isDeleted ? (
                  <Button
                    type="link"
                    size="small"
                    onClick={() => {
                      setDeletedItems(prev => {
                        const newSet = new Set(prev)
                        newSet.delete(record.id)
                        // Также восстанавливаем материалы этой работы
                        const workMaterials = editableVorData.filter(item =>
                          item.type === 'material' && item.vor_work_id === record.id
                        )
                        workMaterials.forEach(material => newSet.delete(material.id))
                        return newSet
                      })
                      messageApi.success('Работа восстановлена')
                    }}
                    style={{ padding: 0, fontSize: '12px', color: '#52c41a' }}
                  >
                    ↺ Восстановить
                  </Button>
                ) : (
                  <Button
                    type="link"
                    size="small"
                    danger
                    onClick={() => handleDeleteWork(record.id)}
                    style={{ padding: 0, fontSize: '12px' }}
                  >
                    🗑 Удалить
                  </Button>
                )}
              </Space>
            )
          } else if (record.type === 'material') {
            return isDeleted ? (
              <Button
                type="link"
                size="small"
                onClick={() => {
                  setDeletedItems(prev => {
                    const newSet = new Set(prev)
                    newSet.delete(record.id)
                    return newSet
                  })
                  messageApi.success('Материал восстановлен')
                }}
                style={{ padding: 0, fontSize: '12px', color: '#52c41a' }}
              >
                ↺ Восстановить
              </Button>
            ) : (
              <Button
                type="link"
                size="small"
                danger
                onClick={() => handleDeleteMaterial(record.id)}
                style={{ padding: 0, fontSize: '12px' }}
              >
                🗑 Удалить
              </Button>
            )
          }
        } else {
          // В режиме просмотра показываем только добавление материала для работ
          if (record.type === 'work') {
            return (
              <Button
                type="link"
                size="small"
                onClick={() => handleAddMaterial(record.id, record.name)}
                style={{ padding: 0 }}
              >
                + Материал
              </Button>
            )
          }
        }
        return null
      },
    })
  }

  // Формирование заголовка с перечислением шифров проектов из комплектов
  const projectCodes =
    setsData && setsData.length > 0
      ? setsData
          .map((set) => {
            // Сначала пробуем получить из связанной документации комплекта
            if (set.documentations?.code) {
              return set.documentations.code
            }

            // Берем документации, привязанные к конкретному комплекту
            if (set.set_documentations && set.set_documentations.length > 0) {
              return set.set_documentations
                .map((doc) => {
                  // Формируем строку: "Шифр (Название)" если есть название
                  if (doc.code && doc.project_name) {
                    return `${doc.code} (${doc.project_name})`
                  }
                  return doc.code
                })
                .filter(Boolean)
                .join(', ')
            }

            // В крайнем случае используем название проекта
            return set.projects?.name || set.name || ''
          })
          .filter(Boolean)
          .join('; ')
      : ''

  // Формирование информации о комплекте для заголовка
  const setInfo = setsData && setsData.length > 0
    ? setsData.map((set) => {
        const setCode = set.code || set.set_number || set.name || `SET-${set.id.slice(0, 8)}`
        const setName = set.name || 'Название комплекта'
        const createdDate = set.created_at ? new Date(set.created_at).toLocaleDateString('ru-RU') : '30.09.2025'
        return `${setCode} ${setName} от ${createdDate}`
      }).join(', ')
    : 'Комплект не указан'

  if (!vorId) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Ошибка" description="Не указан ID ВОР" type="error" />
      </div>
    )
  }

  if (vorLoading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!vorData) {
    return (
      <div style={{ padding: 24 }}>
        <Alert message="Ошибка" description="ВОР не найден" type="error" />
      </div>
    )
  }

  return (
    <>
      {contextHolder}
      <div
        style={{
          height: 'calc(100vh - 96px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Заголовок */}
        <div
          style={{
            flexShrink: 0,
            padding: 24,
            paddingBottom: 16,
            borderBottom: '1px solid #f0f0f0',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 16,
            }}
          >
            <Button icon={<ArrowLeftOutlined />} onClick={handleGoBack} size="large">
              Назад
            </Button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {viewMode === 'view' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Text strong>Коэффициент:</Text>
                    <InputNumber
                      min={0.1}
                      max={10}
                      step={0.1}
                      precision={1}
                      value={averageCoefficient}
                      onChange={handleCoefficientChange}
                      style={{ width: 80 }}
                      title={`Средний коэффициент по всем работам: ${averageCoefficient}`}
                      parser={parseNumberWithSeparators}
                    />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      (средний по таблице)
                    </Text>
                  </div>
                  <Button icon={<EditOutlined />} onClick={handleEditMode} size="large">
                    Редактировать
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={handleExportToExcel} size="large">
                    Экспорт в Excel
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReloadFromChessboard} size="large">
                    Перезагрузить из комплекта
                  </Button>
                  <Button type="primary" onClick={handleGoToChessboard} size="large">
                    Комплект
                  </Button>
                </>
              )}

              {(viewMode === 'edit' || viewMode === 'add') && (
                <>
                  <Button icon={<PlusOutlined />} onClick={handleAddWork} size="large">
                    Добавить работу
                  </Button>
                  <Button icon={<SaveOutlined />} onClick={handleSave} size="large" type="primary">
                    Сохранить
                  </Button>
                  <Button icon={<CloseOutlined />} onClick={handleCancel} size="large">
                    Отмена
                  </Button>
                </>
              )}

              {viewMode === 'delete' && (
                <>
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={handleDeleteSelected}
                    size="large"
                    type="primary"
                    danger
                    disabled={selectedRowKeys.length === 0}
                  >
                    Удалить ({selectedRowKeys.length})
                  </Button>
                  <Button icon={<CloseOutlined />} onClick={handleCancel} size="large">
                    Отмена
                  </Button>
                </>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="small">
              {/* Основной заголовок с кнопкой в одной строке */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: `${8 * scale}px`,
                position: 'relative'
              }}>
                {/* Кнопка сворачивания/разворачивания */}
                <Button
                  type="text"
                  size="small"
                  icon={headerExpanded ? <MinusOutlined /> : <PlusOutlined />}
                  onClick={() => setHeaderExpanded(!headerExpanded)}
                  style={{
                    fontSize: `${16 * scale}px`,
                    width: `${32 * scale}px`,
                    height: `${32 * scale}px`,
                    border: '1px solid #d9d9d9',
                    borderRadius: `${6 * scale}px`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={headerExpanded ? 'Свернуть заголовок' : 'Развернуть заголовок'}
                />

                <Title level={3} style={{ margin: 0 }}>
                  ВЕДОМОСТЬ ОБЪЕМОВ РАБОТ по комплекту {setInfo}
                </Title>
              </div>

              {headerExpanded && (
                <>
                  <Text style={{ fontSize: 16 }}>
                    Выполнение комплекса строительно-монтажных работ по комплекту:{' '}
                    {projectCodes || 'не указано'}
                  </Text>

                  {/* Легенда цветовой индикации */}
                  <div
                    style={{
                      margin: '16px 0 0 0',
                      padding: '8px 16px',
                      backgroundColor: '#f8f9fa',
                      borderRadius: '6px',
                      fontSize: '12px',
                      display: 'inline-block',
                    }}
                  >
                    <Space size="large">
                      <Space>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#E6E6FA',
                            borderRadius: '3px',
                          }}
                        />
                        <Text style={{ fontSize: '12px' }}>Работы (из справочника расценок)</Text>
                      </Space>
                      <Space>
                        <div
                          style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#fff2f0',
                            borderLeft: '4px solid #ff4d4f',
                            borderRadius: '3px',
                          }}
                        />
                        <Text style={{ fontSize: '12px' }}>
                          Изменённые строки
                          <span style={{ color: '#ff4d4f', marginLeft: '4px' }}>*</span>
                        </Text>
                      </Space>
                    </Space>
                  </div>
                </>
              )}
            </Space>
          </div>
        </div>

        {/* Таблица */}
        <div
          style={{
            flex: 1,
            overflow: 'hidden',
            minHeight: 0,
            padding: '0 24px 16px 24px',
          }}
        >
          <div style={{ height: '100%' }}>
          <style>
            {`
              /* Стили для строк с работами из справочника Расценок */
              .vor-work-row > td {
                background-color: #f0edf2 !important;
              }
              .vor-work-row:hover > td {
                background-color: #e3dfe6 !important;
              }

              /* Стили для измененных строк - красная граница только в первом столбце */
              .vor-modified-row > td:first-child {
                border-left: 4px solid #ff4d4f !important;
              }

              /* Комбинированные стили для измененных строк работ - красная граница только в первом столбце */
              .vor-work-row.vor-modified-row > td:first-child {
                border-left: 4px solid #ff4d4f !important;
              }

              /* Заголовки таблицы */
              .ant-table-thead > tr > th {
                background-color: #c8c2cc !important;
              }

              /* Переопределяем встроенные hover стили Ant Design для предотвращения конфликтов */
              .ant-table-tbody > tr.vor-work-row:hover > td {
                background-color: #e3dfe6 !important;
              }
            `}
          </style>
          <Table
            columns={columns}
            dataSource={
              // Приоритет: 1) editableVorData (в режиме редактирования), 2) editableVorItems (данные из БД), 3) vorItemsData (локальные), 4) vorItems (из шахматки)
              isEditingEnabled && editableVorData.length > 0
                ? editableVorData
                : editableVorItems && editableVorItems.length > 0
                  ? editableVorItems
                  : vorItemsData.length > 0
                    ? vorItemsData
                    : vorItems
            }
            rowKey="id"
            pagination={false}
            scroll={{
              y: tableScrollHeight,
            }}
            sticky
            size="middle"
            bordered
            rowClassName={getRowClassName}
            rowSelection={viewMode === 'delete' ? {
              selectedRowKeys,
              onChange: setSelectedRowKeys,
              type: 'checkbox',
            } : undefined}
            summary={(data) => {
              // Суммируем номенклатуру только для материалов (не работ)
              const totalNomenclature = Math.round(
                data.reduce((sum, item) => {
                  if (item.type === 'work') return sum
                  const materialTotal = 'material_total' in item ? item.material_total : (item as VorItem).nomenclature_total
                  return sum + (materialTotal || 0)
                }, 0),
              )
              const totalWork = Math.round(data.reduce((sum, item) => sum + (item.work_total || 0), 0))
              // Для столбца "Сумма Итого" суммируем по новой логике:
              // - для работ берем значение из work_total
              // - для материалов берем значение из material_total
              const grandTotal = Math.round(
                data.reduce((sum, item) => {
                  if (item.type === 'work') {
                    return sum + (item.work_total || 0)
                  } else {
                    const materialTotal = 'material_total' in item ? item.material_total : (item as VorItem).nomenclature_total
                    return sum + (materialTotal || 0)
                  }
                }, 0),
              )

              // Индексы цифровых столбцов с учетом добавленного столбца "Рабочий набор":
              // 8 - Номенклатура Итого, 9 - Работа Итого, 10 - Сумма Итого
              // В режиме редактирования добавляется колонка "Действия" в конец (индекс 11)
              const summaryColSpan = 8

              return (
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={summaryColSpan}>
                    <Text strong>Итого:</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={8}>
                    <Text strong>{totalNomenclature.toLocaleString('ru-RU')}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={9}>
                    <Text strong>{totalWork.toLocaleString('ru-RU')}</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={10}>
                    <Text strong>{grandTotal.toLocaleString('ru-RU')}</Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )
            }}
          />
          </div>
        </div>
      </div>

      {/* Модальные окна */}
      {vorId && (
        <AddWorkModal
          visible={addWorkModalVisible}
          onCancel={() => setAddWorkModalVisible(false)}
          onSuccess={handleAddWorkSuccess}
          vorId={vorId}
          setFilters={setFilters}
        />
      )}

    </>
  )
}

export default VorView
