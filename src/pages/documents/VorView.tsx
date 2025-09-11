{/* VorView component */}
import React, { useState, useEffect } from 'react'
import { Table, Typography, Space, Spin, Alert, Button, InputNumber } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

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
    rate_id: string | null
    rates?: { work_name: string | null } | null
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
    nomenclature_id: string | null
    supplier_name: string | null
    nomenclature?: {
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
}

interface ProjectDocument {
  code: string
  project_name: string
}

// Функция для создания компактных заголовков с максимум 3 строками
const formatHeaderText = (text: string): JSX.Element => {
  // Предопределенные сокращенные варианты заголовков
  const compactHeaders: { [key: string]: string } = {
    'Наименование': 'Наименование',
    'Ед Изм': 'Ед.\nИзм.',
    'Кол-во': 'Кол-во',
    'Номенклатура цены за ед руб вкл НДС': 'Номенклатура\nцена за ед.\nруб с НДС',
    'Работа цены за ед руб вкл НДС': 'Работа\nцена за ед.\nруб с НДС',
    'Номенклатура Итого руб вкл НДС': 'Номенклатура\nИтого\nруб с НДС',
    'Работа Итого руб вкл НДС': 'Работа\nИтого\nруб с НДС',
    'Сумма Итого руб вкл НДС': 'Сумма\nИтого\nруб с НДС'
  }
  
  const headerText = compactHeaders[text] || text
  
  return (
    <div style={{ 
      whiteSpace: 'pre-line',
      textAlign: 'center',
      lineHeight: '1.2',
      fontSize: '12px',
      minHeight: '45px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {headerText}
    </div>
  )
}

const VorView = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const vorId = searchParams.get('vor_id')
  const [coefficient, setCoefficient] = useState<number>(1)
  const queryClient = useQueryClient()

  // Загружаем данные ВОР и связанной информации
  const { data: vorData, isLoading: vorLoading } = useQuery({
    queryKey: ['vor-data', vorId],
    queryFn: async () => {
      if (!supabase || !vorId) return null
      
      // Загружаем ВОР с связанными комплектами
      const { data: vor, error: vorError } = await supabase
        .from('vor')
        .select(`
          id,
          name,
          project_id,
          rate_coefficient,
          created_at,
          updated_at,
          vor_chessboard_sets_mapping (
            set_id
          )
        `)
        .eq('id', vorId)
        .single()

      if (vorError) throw vorError

      return {
        vor
      }
    },
    enabled: !!vorId
  })

  // Загружаем данные комплектов для кнопки "Назад" и фильтрации
  const { data: setsData } = useQuery({
    queryKey: ['vor-sets', vorId],
    queryFn: async () => {
      if (!supabase || !vorData?.vor) return []

      // Получаем ID комплектов, связанных с ВОР
      const setIds = vorData.vor.vor_chessboard_sets_mapping?.map(m => m.set_id) || []
      if (setIds.length === 0) return []

      // Загружаем информацию о комплектах с проектами
      const { data: setsData, error } = await supabase
        .from('chessboard_sets')
        .select(`
          *,
          documentations:documentation_id(code, project_name),
          projects:project_id(id, name)
        `)
        .in('id', setIds)

      if (error) throw error
      if (!setsData || setsData.length === 0) return []

      // Загружаем документации, связанные с конкретными комплектами через маппинг
      const { data: docsData, error: docsError } = await supabase
        .from('chessboard_sets_documents_mapping')
        .select(`
          set_id,
          documentations:documentation_id(id, code, project_name)
        `)
        .in('set_id', setIds)
      
      if (docsError) {
        console.warn('Ошибка загрузки документаций:', docsError)
      }

      // Добавляем информацию о документациях к каждому комплекту
      const result = setsData.map(set => ({
        ...set,
        set_documentations: docsData
          ?.filter(mapping => mapping.set_id === set.id)
          ?.map(mapping => mapping.documentations)
          ?.filter(Boolean) || []
      }))

      return result
    },
    enabled: !!vorData?.vor
  })

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
    }
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
      
      if (firstSet.documentation_id) {
        searchParams.set('documentation_id', firstSet.documentation_id)
      }
      
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
      const setIds = vorData.vor.vor_chessboard_sets_mapping?.map(m => m.set_id) || []
      if (setIds.length === 0) return []

      // 2. Загружаем информацию о комплектах и их фильтрах
      const { data: setsData, error: setsError } = await supabase
        .from('chessboard_sets')
        .select('*')
        .in('id', setIds)

      if (setsError) throw setsError
      if (!setsData || setsData.length === 0) return []

      // 3. Собираем все уникальные значения фильтров для загрузки всех нужных данных
      const allProjectIds = [...new Set(setsData.map(s => s.project_id).filter(Boolean))]
      const allDocumentationIds = [...new Set(setsData.map(s => s.documentation_id).filter(Boolean))]
      
      if (allProjectIds.length === 0) return []

      // 4. Загружаем базовые данные шахматки для этих проектов
      const { data: chessboardData, error: chessboardError } = await supabase
        .from('chessboard')
        .select('id, project_id, material, unit_id')
        .in('project_id', allProjectIds)

      if (chessboardError) throw chessboardError

      if (!chessboardData || chessboardData.length === 0) return []

      // 5. Получаем ID всех записей для дополнительных запросов
      const chessboardIds = chessboardData.map(item => item.id)

      // 6. Загружаем связанные данные отдельными запросами
      const [materialsData, unitsData, ratesData, mappingData, floorMappingData, nomenclatureMappingData] = await Promise.all([
        // Материалы
        supabase
          .from('materials')
          .select('uuid, name')
          .in('uuid', chessboardData.map(item => item.material).filter(Boolean)),
        
        // Единицы измерения
        supabase
          .from('units')
          .select('id, name')
          .in('id', chessboardData.map(item => item.unit_id).filter(Boolean)),
        
        // Расценки через mapping с единицами измерения
        supabase
          .from('chessboard_rates_mapping')
          .select(`
            chessboard_id,
            rate_id,
            rates:rate_id(work_name, base_rate, unit_id, units:unit_id(id, name))
          `)
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
          .select(`
            chessboard_id,
            nomenclature_id,
            supplier_name,
            nomenclature:nomenclature_id(id, name, material_prices(price, purchase_date))
          `)
          .in('chessboard_id', chessboardIds)
      ])

      // Создаем индексы для быстрого поиска
      const materialsMap = new Map(materialsData.data?.map(m => [m.uuid, m]) || [])
      const unitsMap = new Map(unitsData.data?.map(u => [u.id, u]) || [])
      const ratesMap = new Map<string, any[]>()
      ratesData.data?.forEach(r => {
        if (!ratesMap.has(r.chessboard_id)) {
          ratesMap.set(r.chessboard_id, [])
        }
        ratesMap.get(r.chessboard_id)?.push(r)
      })
      const mappingMap = new Map(mappingData.data?.map(m => [m.chessboard_id, m]) || [])
      
      // Создаем индекс для объемов - суммируем quantityRd по chessboard_id
      const floorQuantitiesMap = new Map<string, number>()
      floorMappingData.data?.forEach(f => {
        const currentSum = floorQuantitiesMap.get(f.chessboard_id) || 0
        const quantityRd = f.quantityRd || 0
        floorQuantitiesMap.set(f.chessboard_id, currentSum + quantityRd)
      })

      // Создаем индекс для номенклатуры с ценами
      const nomenclatureMap = new Map<string, any[]>()
      nomenclatureMappingData.data?.forEach(n => {
        if (!nomenclatureMap.has(n.chessboard_id)) {
          nomenclatureMap.set(n.chessboard_id, [])
        }
        nomenclatureMap.get(n.chessboard_id)?.push(n)
      })

      // 7. Обогащаем данные шахматки связанными данными
      const enrichedChessboardData = chessboardData.map(item => ({
        ...item,
        materials: item.material ? materialsMap.get(item.material) : null,
        units: item.unit_id ? unitsMap.get(item.unit_id) : null,
        chessboard_rates_mapping: ratesMap.get(item.id) || [],
        chessboard_mapping: mappingMap.get(item.id) || null,
        chessboard_documentation_mapping: [], // Пока не используется в фильтрации
        chessboard_nomenclature_mapping: nomenclatureMap.get(item.id) || [], // Номенклатура с ценами
        quantityRd: floorQuantitiesMap.get(item.id) || 0 // Объем по пересчету РД
      }))

      // 8. Фильтруем данные шахматки в соответствии с настройками каждого комплекта
      const filteredChessboardData = enrichedChessboardData?.filter(item => {
        return setsData.some(set => {
          // Проверяем соответствие всем фильтрам комплекта
          if (set.project_id !== item.project_id) return false
          
          // Фильтр по документации (если указан)
          if (set.documentation_id) {
            const hasMatchingDoc = item.chessboard_documentation_mapping?.some(mapping => 
              mapping.documentation_versions?.documentation_id === set.documentation_id
            )
            if (!hasMatchingDoc) return false
          }
          
          // Фильтр по блоку (если указан)
          if (set.block_ids && set.block_ids.length > 0) {
            const hasMatchingBlock = item.chessboard_mapping?.block_id && 
              set.block_ids.includes(item.chessboard_mapping.block_id)
            if (!hasMatchingBlock) return false
          }
          
          // Фильтр по категории затрат (если указан)
          if (set.cost_category_ids && set.cost_category_ids.length > 0) {
            const hasMatchingCategory = item.chessboard_mapping?.cost_category_id && 
              set.cost_category_ids.includes(item.chessboard_mapping.cost_category_id)
            if (!hasMatchingCategory) return false
          }
          
          // Фильтр по типу затрат (если указан)
          if (set.cost_type_ids && set.cost_type_ids.length > 0) {
            const hasMatchingType = item.chessboard_mapping?.cost_type_id && 
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
      filteredChessboardData.forEach(item => {
        // Получаем наименование работы из связанных расценок
        const workName = item.chessboard_rates_mapping?.[0]?.rates?.work_name || 'Работа не указана'
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
        const rateInfo = firstMaterial?.chessboard_rates_mapping?.[0]?.rates
        const baseRate = rateInfo?.base_rate || 0
        const rateUnitName = rateInfo?.units?.name || ''
        
        // Рассчитываем количество для работы: суммируем количества материалов с той же единицей измерения, что у расценки
        let workQuantity = 0
        if (rateUnitName) {
          workQuantity = materials
            .filter(material => material.units?.name === rateUnitName)
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
          work_total: (baseRate * workQuantity) * coefficient,
          type: 'work',
          level: 1
        }
        result.push(workItem)

        // Добавляем материалы из номенклатуры (пункты 1.1, 1.2, ...)
        let materialIndex = 1
        materials.forEach(material => {
          // Обрабатываем все позиции номенклатуры для этого material
          const nomenclatureItems = material.chessboard_nomenclature_mapping || []
          
          if (nomenclatureItems.length > 0) {
            // Если есть номенклатура, используем её
            nomenclatureItems.forEach(nomenclatureItem => {
              const nomenclatureName = nomenclatureItem.nomenclature?.name || 'Номенклатура не указана'
              
              // Получаем последнюю цену из справочника
              const prices = nomenclatureItem.nomenclature?.material_prices || []
              const latestPrice = prices.length > 0 
                ? prices.sort((a, b) => new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime())[0].price
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
                level: 2
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
              level: 2
            }
            result.push(materialItem)
            materialIndex++
          }
        })

        workIndex++
      })

      return result
    },
    enabled: !!vorData?.vor
  })

  const columns = [
    {
      title: '№',
      key: 'index',
      width: 40,
      render: (_: unknown, record: VorItem) => {
        if (record.type === 'work') {
          // Находим номер работы среди всех работ
          const workItems = (vorItems || []).filter(item => item.type === 'work')
          const workIndex = workItems.findIndex(item => item.id === record.id) + 1
          return `${workIndex}.`
        } else {
          // Для материалов находим номер работы и номер материала внутри работы
          const workItems = (vorItems || []).filter(item => item.type === 'work')
          const parentWork = workItems.find(item => item.id === record.parent_id)
          if (parentWork) {
            const workIndex = workItems.findIndex(item => item.id === parentWork.id) + 1
            const materialsInWork = (vorItems || []).filter(item => 
              item.type === 'material' && item.parent_id === parentWork.id
            )
            const materialIndex = materialsInWork.findIndex(item => item.id === record.id) + 1
            return `${workIndex}.${materialIndex}`
          }
        }
        return ''
      },
    },
    {
      title: formatHeaderText('Наименование'),
      dataIndex: 'name',
      key: 'name',
      // Динамическая ширина - не указываем width
      render: (text: string, record: VorItem) => (
        <div style={{ 
          paddingLeft: record.level === 2 ? 20 : 0,
          fontWeight: record.type === 'work' ? 'bold' : 'normal',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          lineHeight: '1.2'
        }}>
          {text}
        </div>
      ),
    },
    {
      title: formatHeaderText('Ед Изм'),
      dataIndex: 'unit',
      key: 'unit',
      width: 60,
    },
    {
      title: formatHeaderText('Кол-во'),
      dataIndex: 'quantity',
      key: 'quantity',
      width: 80,
      render: (value: number) => value.toLocaleString('ru-RU'),
    },
    {
      title: formatHeaderText('Номенклатура цены за ед руб вкл НДС'),
      dataIndex: 'nomenclature_price',
      key: 'nomenclature_price',
      width: 120,
      render: (value: number, record: VorItem) => {
        // Для строк с работами из справочника Расценок всегда показываем 0
        if (record.type === 'work') {
          return '0'
        }
        return Math.round(value).toLocaleString('ru-RU')
      },
    },
    {
      title: formatHeaderText('Работа цены за ед руб вкл НДС'),
      dataIndex: 'work_price',
      key: 'work_price',
      width: 120,
      render: (value: number) => Math.round(value).toLocaleString('ru-RU'),
    },
    {
      title: formatHeaderText('Номенклатура Итого руб вкл НДС'),
      dataIndex: 'nomenclature_total',
      key: 'nomenclature_total',
      width: 120,
      render: (value: number, record: VorItem) => {
        // Для строк с работами из справочника Расценок всегда показываем 0
        if (record.type === 'work') {
          return '0'
        }
        return Math.round(value).toLocaleString('ru-RU')
      },
    },
    {
      title: formatHeaderText('Работа Итого руб вкл НДС'),
      dataIndex: 'work_total',
      key: 'work_total',
      width: 120,
      render: (value: number) => Math.round(value).toLocaleString('ru-RU'),
    },
    {
      title: formatHeaderText('Сумма Итого руб вкл НДС'),
      key: 'total_sum',
      width: 120,
      render: (_, record: VorItem) => {
        // Для строк с работами показываем значение из столбца "Работа Итого"
        if (record.type === 'work') {
          return Math.round(record.work_total).toLocaleString('ru-RU')
        }
        // Для строк с материалами показываем значение из столбца "Номенклатура Итого"
        return Math.round(record.nomenclature_total).toLocaleString('ru-RU')
      },
    },
  ]

  // Формирование заголовка с перечислением шифров проектов из комплектов
  const projectCodes = setsData && setsData.length > 0 
    ? setsData.map(set => {
        
        // Сначала пробуем получить из связанной документации комплекта
        if (set.documentations?.code) {
          return set.documentations.code
        }
        
        // Берем документации, привязанные к конкретному комплекту
        if (set.set_documentations && set.set_documentations.length > 0) {
          return set.set_documentations
            .map(doc => {
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
      }).filter(Boolean).join('; ')
    : ''

  if (!vorId) {
    return (
      <div style={{ padding: 24 }}>
        <Alert 
          message="Ошибка" 
          description="Не указан ID ВОР" 
          type="error" 
        />
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
        <Alert 
          message="Ошибка" 
          description="ВОР не найден" 
          type="error" 
        />
      </div>
    )
  }

  return (
    <div style={{ 
      height: 'calc(100vh - 96px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* Заголовок */}
      <div style={{ 
        flexShrink: 0, 
        padding: 24, 
        paddingBottom: 16,
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <Button 
            icon={<ArrowLeftOutlined />}
            onClick={handleGoBack}
            size="large"
          >
            Назад
          </Button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text strong>Коэффициент:</Text>
              <InputNumber
                min={0.1}
                max={10}
                step={0.1}
                precision={1}
                value={coefficient}
                onChange={handleCoefficientChange}
                style={{ width: 80 }}
              />
            </div>
            <Button 
              type="primary"
              onClick={handleGoToChessboard}
              size="large"
            >
              Комплект
            </Button>
          </div>
        </div>
        
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size="small">
            <Title level={3} style={{ margin: 0 }}>
              ВЕДОМОСТЬ ОБЪЕМОВ РАБОТ
            </Title>
          <Text style={{ fontSize: 16 }}>
            Выполнение комплекса строительно-монтажных работ по комплекту: {projectCodes || 'не указано'} {/* Debug: projectCodes = '{projectCodes}' */}
          </Text>
          <Title level={4} style={{ margin: '8px 0 0 0' }}>
            {vorData.vor.name}
          </Title>
          </Space>
        </div>
      </div>

      {/* Таблица */}
      <div style={{ 
        flex: 1, 
        overflow: 'hidden',
        minHeight: 0,
        padding: '0 24px 24px 24px'
      }}>
        <Table
          columns={columns}
          dataSource={vorItems}
          rowKey="id"
          pagination={false}
          scroll={{ 
            x: 'max-content',
            y: 'calc(100vh - 300px)'
          }}
          sticky
          size="middle"
          bordered
          summary={(data) => {
            // Суммируем номенклатуру только для материалов (не работ)
            const totalNomenclature = Math.round(data.reduce((sum, item) => {
              return item.type === 'work' ? sum : sum + item.nomenclature_total
            }, 0))
            const totalWork = Math.round(data.reduce((sum, item) => sum + item.work_total, 0))
            // Для столбца "Сумма Итого" суммируем по новой логике:
            // - для работ берем значение из work_total
            // - для материалов берем значение из nomenclature_total
            const grandTotal = Math.round(data.reduce((sum, item) => {
              if (item.type === 'work') {
                return sum + item.work_total
              } else {
                return sum + item.nomenclature_total
              }
            }, 0))
            
            return (
              <Table.Summary.Row>
                <Table.Summary.Cell index={0} colSpan={6}>
                  <Text strong>Итого:</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}>
                  <Text strong>{totalNomenclature.toLocaleString('ru-RU')}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={7}>
                  <Text strong>{totalWork.toLocaleString('ru-RU')}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={8}>
                  <Text strong>{grandTotal.toLocaleString('ru-RU')}</Text>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            )
          }}
        />
      </div>
    </div>
  )
}

export default VorView