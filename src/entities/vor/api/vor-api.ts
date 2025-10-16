import { supabase } from '@/lib/supabase'
import type {
  VorTableItem,
  UnitOption,
  CreateVorFromChessboardSetDto,
  ChessboardSetVor
} from '../model/types'
import { getVorWorks } from './vor-works-api'
import { getVorMaterials } from './vor-materials-api'

// Получение полных данных ВОР для отображения в таблице
export const getVorTableData = async (vor_id: string): Promise<VorTableItem[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  // Загружаем работы и материалы параллельно
  const [works, materials] = await Promise.all([
    getVorWorks({ vor_id }),
    getVorMaterials({ vor_id })
  ])

  const result: VorTableItem[] = []

  // Преобразуем работы в элементы таблицы
  works.forEach((work) => {
    const workPrice = (work.base_rate || 0) * work.coefficient
    const workTotal = workPrice * work.quantity

    const workItem: VorTableItem = {
      id: work.id,
      type: 'work',
      name: work.work_set_rate?.work_names?.name || '',
      unit: work.work_set_rate?.units?.name || '',
      quantity: work.quantity,
      coefficient: work.coefficient,
      work_price: workPrice,
      work_total: workTotal,
      base_rate: work.base_rate || 0,
      rate_id: work.rate_id,
      work_set_rate_id: work.work_set_rate_id,
      work_set_name: work.work_set_rate?.work_sets?.name,
      level: 1,
      sort_order: work.sort_order,
      is_modified: work.is_modified
    }

    result.push(workItem)

    // Добавляем материалы для этой работы
    const workMaterials = materials.filter(m => m.vor_work_id === work.id)
    workMaterials.forEach((material) => {
      const materialTotal = material.price * material.quantity

      const materialItem: VorTableItem = {
        id: material.id,
        type: 'material',
        name: material.supplier_material_name,
        unit: material.units?.name || '',
        quantity: material.quantity,
        material_price: material.price,
        material_total: materialTotal,
        vor_work_id: material.vor_work_id,
        level: 2,
        sort_order: material.sort_order,
        parent_id: work.id,
        is_modified: material.is_modified
      }

      result.push(materialItem)
    })
  })

  return result
}

// Получение единиц измерения для селектов
export const getUnitsOptions = async (): Promise<UnitOption[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('units')
    .select('id, name')
    .order('name', { ascending: true })

  if (error) {
    console.error('Ошибка загрузки единиц измерения:', error)
    throw error
  }

  return data || []
}

// Вспомогательная функция для расчета итогов ВОР
export const calculateVorTotals = (items: VorTableItem[]) => {
  return items.reduce(
    (totals, item) => {
      if (item.type === 'work') {
        totals.workTotal += item.work_total || 0
      } else {
        totals.materialTotal += item.material_total || 0
      }
      totals.grandTotal += (item.work_total || 0) + (item.material_total || 0)
      return totals
    },
    { workTotal: 0, materialTotal: 0, grandTotal: 0 }
  )
}

// Вспомогательная функция для разбиения массива на батчи
const batchArray = <T>(array: T[], batchSize: number): T[][] => {
  const batches: T[][] = []
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize))
  }
  return batches
}

// Вспомогательная функция для выполнения запросов батчами
const fetchInBatches = async <T>(
  tableName: string,
  selectQuery: string,
  ids: string[],
  idColumnName: string,
  batchSize = 100
): Promise<T[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const batches = batchArray(ids, batchSize)
  const results: T[] = []

  for (const batch of batches) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .in(idColumnName, batch)

    if (error) throw error
    if (data) results.push(...data)
  }

  return results
}

// Расчёт суммы ВОР на основе комплектов шахматки (как в VorView)
export const calculateVorTotalFromChessboard = async (vorId: string): Promise<number> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  try {
    // 1. Получаем ВОР с коэффициентом
    const { data: vorData, error: vorError } = await supabase
      .from('vor')
      .select('id, rate_coefficient, vor_chessboard_sets_mapping(set_id)')
      .eq('id', vorId)
      .single()

    if (vorError || !vorData) return 0

    const coefficient = vorData.rate_coefficient || 1
    const setIds = vorData.vor_chessboard_sets_mapping?.map((m: any) => m.set_id) || []

    if (setIds.length === 0) return 0

    // 2. Загружаем информацию о комплектах
    const { data: setsData, error: setsError } = await supabase
      .from('chessboard_sets')
      .select('*')
      .in('id', setIds)

    if (setsError || !setsData || setsData.length === 0) return 0

    // 3. Собираем все уникальные projectIds
    const allProjectIds = [...new Set(setsData.map((s: any) => s.project_id).filter(Boolean))]
    if (allProjectIds.length === 0) return 0

    // 4. Загружаем базовые данные шахматки
    const { data: chessboardData, error: chessboardError } = await supabase
      .from('chessboard')
      .select('id, project_id, material, unit_id')
      .in('project_id', allProjectIds)

    if (chessboardError || !chessboardData || chessboardData.length === 0) return 0

    const chessboardIds = chessboardData.map((item: any) => item.id)
    const unitIds = chessboardData.map((item: any) => item.unit_id).filter(Boolean)

    // 5. Загружаем связанные данные параллельно с батчингом для больших массивов
    const [unitsData, ratesData, mappingData, floorMappingData, nomenclatureMappingData] = await Promise.all([
      fetchInBatches('units', 'id, name', unitIds, 'id', 100),
      fetchInBatches('chessboard_rates_mapping', 'chessboard_id, work_set_rate_id, work_set_rate:work_set_rate_id(work_name_id, base_rate, unit_id, units:unit_id(id, name), work_names:work_name_id(id, name, unit_id))', chessboardIds, 'chessboard_id', 100),
      fetchInBatches('chessboard_mapping', 'chessboard_id, block_id, cost_category_id, cost_type_id, location_id', chessboardIds, 'chessboard_id', 100),
      fetchInBatches('chessboard_floor_mapping', 'chessboard_id, "quantityRd"', chessboardIds, 'chessboard_id', 100),
      fetchInBatches('chessboard_nomenclature_mapping', 'chessboard_id, supplier_names_id, conversion_coefficient, supplier_names:supplier_names_id(id, name, unit_id, material_prices(price, purchase_date))', chessboardIds, 'chessboard_id', 100),
    ])

    // 6. Создаем индексы для быстрого поиска
    const unitsMap = new Map(unitsData?.map((u: any) => [u.id, u]) || [])
    const ratesMap = new Map<string, any[]>()
    ratesData?.forEach((r: any) => {
      if (!ratesMap.has(r.chessboard_id)) {
        ratesMap.set(r.chessboard_id, [])
      }
      ratesMap.get(r.chessboard_id)?.push(r)
    })
    const mappingMap = new Map(mappingData?.map((m: any) => [m.chessboard_id, m]) || [])
    const floorQuantitiesMap = new Map<string, number>()
    floorMappingData?.forEach((f: any) => {
      const currentSum = floorQuantitiesMap.get(f.chessboard_id) || 0
      floorQuantitiesMap.set(f.chessboard_id, currentSum + (f.quantityRd || 0))
    })
    const nomenclatureMap = new Map<string, any[]>()
    nomenclatureMappingData?.forEach((n: any) => {
      if (!nomenclatureMap.has(n.chessboard_id)) {
        nomenclatureMap.set(n.chessboard_id, [])
      }
      nomenclatureMap.get(n.chessboard_id)?.push(n)
    })

    // 7. Обогащаем и фильтруем данные шахматки по настройкам комплектов
    const filteredChessboardData = chessboardData.filter((item: any) => {
      return setsData.some((set: any) => {
        if (set.project_id !== item.project_id) return false

        const mapping = mappingMap.get(item.id)

        if (set.block_ids && set.block_ids.length > 0) {
          if (!mapping?.block_id || !set.block_ids.includes(mapping.block_id)) return false
        }

        if (set.cost_category_ids && set.cost_category_ids.length > 0) {
          if (!mapping?.cost_category_id || !set.cost_category_ids.includes(mapping.cost_category_id)) return false
        }

        if (set.cost_type_ids && set.cost_type_ids.length > 0) {
          if (!mapping?.cost_type_id || !set.cost_type_ids.includes(mapping.cost_type_id)) return false
        }

        return true
      })
    })

    // 8. Группируем по работам
    const workGroups = new Map<string, any[]>()
    filteredChessboardData.forEach((item: any) => {
      const rates = ratesMap.get(item.id) || []
      const workName = rates[0]?.work_set_rate?.work_names?.name || 'Работа не указана'
      if (!workGroups.has(workName)) {
        workGroups.set(workName, [])
      }
      workGroups.get(workName)?.push({
        ...item,
        units: unitsMap.get(item.unit_id),
        work_set_rate: rates[0]?.work_set_rate,
        quantityRd: floorQuantitiesMap.get(item.id) || 0,
        nomenclatureItems: nomenclatureMap.get(item.id) || [],
      })
    })

    // 9. Вычисляем итоговую сумму
    let totalSum = 0

    workGroups.forEach((materials: any[]) => {
      const firstMaterial = materials[0]
      const rateInfo = firstMaterial?.work_set_rate
      const baseRate = rateInfo?.base_rate || 0
      const rateUnitName = rateInfo?.units?.name || ''

      // Рассчитываем количество для работы
      let workQuantity = 0
      if (rateUnitName) {
        workQuantity = materials
          .filter((material: any) => material.units?.name === rateUnitName)
          .reduce((sum: number, material: any) => sum + (material.quantityRd || 0), 0)
      }
      if (workQuantity === 0) {
        workQuantity = materials.reduce((sum: number, material: any) => sum + (material.quantityRd || 0), 0)
      }

      // Сумма работы
      const workTotal = baseRate * workQuantity * coefficient
      totalSum += workTotal

      // Сумма материалов
      // TODO: Реализовать получение цен через supplier_names.material_prices
      // Пока пропускаем расчёт суммы материалов
      materials.forEach((material: any) => {
        const nomenclatureItems = material.nomenclatureItems || []
        nomenclatureItems.forEach((nomenclatureItem: any) => {
          // Цены будут получены через supplier_names в будущем
          const latestPrice = 0
          const quantity = material.quantityRd || 0
          totalSum += latestPrice * quantity
        })
      })
    })

    return totalSum
  } catch (error) {
    console.error('Ошибка расчёта суммы ВОР из комплектов:', error)
    return 0
  }
}

// Создание ВОР на основе комплекта шахматки
export const createVorFromChessboardSet = async (dto: CreateVorFromChessboardSetDto): Promise<string> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  try {
    // Получить текущего пользователя
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const currentUserId = user?.id || null

    // Получить текущую версию комплекта
    const { data: setData, error: setVersionError } = await supabase
      .from('chessboard_sets')
      .select('version')
      .eq('id', dto.set_id)
      .single()

    if (setVersionError) {
      console.error('Ошибка получения версии комплекта:', setVersionError)
      throw setVersionError
    }

    const currentSetVersion = setData?.version || 1

    // 1. Создаем основную запись ВОР
    const { data: vorData, error: vorError } = await supabase
      .from('vor')
      .insert({
        name: dto.name,
        project_id: dto.project_id,
        rate_coefficient: dto.rate_coefficient || 1.0,
        vor_type: dto.vor_type // Тип ВОР: brigade или contractor
      })
      .select('*')
      .single()

    if (vorError) {
      console.error('Ошибка создания ВОР:', vorError)
      throw vorError
    }

    const vorId = vorData.id

    // 2. Создаем связь ВОР с комплектом
    const { error: mappingError } = await supabase
      .from('vor_chessboard_sets_mapping')
      .insert({
        vor_id: vorId,
        set_id: dto.set_id,
        source_set_version: currentSetVersion,
        created_at: new Date().toISOString(),
        created_by: currentUserId,
      })

    if (mappingError) {
      console.error('Ошибка создания связи ВОР с комплектом:', mappingError)
      throw mappingError
    }

    // 3. Загружаем данные комплекта для создания работ и материалов
    await populateVorFromChessboardSet(vorId, dto.set_id)

    return vorId
  } catch (error) {
    console.error('Ошибка создания ВОР из комплекта шахматки:', error)
    throw error
  }
}

// Заполнение ВОР данными из комплекта шахматки
export const populateVorFromChessboardSet = async (vorId: string, setId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  // 0. Получаем тип ВОР для определения логики копирования цен
  const { data: vorTypeData, error: vorTypeError } = await supabase
    .from('vor')
    .select('vor_type')
    .eq('id', vorId)
    .single()

  if (vorTypeError) {
    console.error('Ошибка загрузки типа ВОР:', vorTypeError)
    throw vorTypeError
  }

  const vorType = vorTypeData?.vor_type || 'brigade'

  // 1. Получаем настройки комплекта
  const { data: setData, error: setError } = await supabase
    .from('chessboard_sets')
    .select(`
      id,
      project_id,
      version_id,
      tag_id,
      block_ids,
      cost_category_ids,
      cost_type_ids
    `)
    .eq('id', setId)
    .single()

  if (setError || !setData) {
    console.error('Ошибка загрузки комплекта:', setError)
    throw setError || new Error('Комплект не найден')
  }

  // 2. Загружаем данные шахматки согласно фильтрам комплекта
  // Определяем нужен ли INNER JOIN для фильтрации
  const needsMapping = !!(
    setData.block_ids?.length ||
    setData.cost_category_ids?.length ||
    setData.cost_type_ids?.length
  )
  const joinType = needsMapping ? 'inner' : 'left'


  let query = supabase
    .from('chessboard')
    .select(`
      id,
      material,
      unit_id,
      material_type,
      materials:material(name),
      units:unit_id(id, name),
      chessboard_rates_mapping(
        work_set_rate_id,
        work_set_rate:work_set_rate_id(
          id,
          work_name_id,
          work_set_id,
          base_rate,
          unit_id,
          units:unit_id(name),
          work_names:work_name_id(id, name),
          work_sets:work_set_id(id, name)
        )
      ),
      chessboard_nomenclature_mapping(
        supplier_names_id,
        conversion_coefficient,
        supplier_names:supplier_names_id(
          id,
          name,
          unit_id,
          material_prices(price, purchase_date),
          nomenclature_supplier_mapping(
            nomenclature_id,
            nomenclature:nomenclature_id(name)
          )
        )
      ),
      chessboard_floor_mapping("quantityRd"),
      chessboard_mapping!${joinType}(
        block_id,
        cost_category_id,
        cost_type_id,
        location_id
      )
    `)
    .eq('project_id', setData.project_id)

  // Применяем фильтры комплекта по блокам
  if (setData.block_ids?.length) {
    query = query.in('chessboard_mapping.block_id', setData.block_ids)
  }

  // Применяем фильтры комплекта по категориям затрат
  if (setData.cost_category_ids?.length) {
    query = query.in('chessboard_mapping.cost_category_id', setData.cost_category_ids)
  }

  // Применяем фильтры комплекта по видам затрат
  if (setData.cost_type_ids?.length) {
    query = query.in('chessboard_mapping.cost_type_id', setData.cost_type_ids)
  }

  // Применяем фильтр по версии документации если указан
  if (setData.version_id) {

    // Получаем ID записей шахматки, связанных с версией документа
    const { data: docMappingData, error: docMappingError } = await supabase
      .from('chessboard_documentation_mapping')
      .select('chessboard_id')
      .eq('version_id', setData.version_id)

    if (docMappingError) {
      throw docMappingError
    }

    const chessboardIds = (docMappingData || []).map(item => item.chessboard_id)
    if (chessboardIds.length > 0) {
      query = query.in('id', chessboardIds)
    } else {
      // Если нет связанных записей, возвращаем пустой результат
      return
    }
  }

  const { data: chessboardData, error: chessboardError } = await query

  if (chessboardError) {
    console.error('Ошибка загрузки данных шахматки:', chessboardError)
    throw chessboardError
  }

  if (!chessboardData || chessboardData.length === 0) {
    return
  }


  // 3. Группируем данные по работам (rates)
  // ВАЖНО: Количество для работы считается только по материалам типа "База"
  // с совпадающими единицами измерения с работой
  const worksMap = new Map<string, {
    rate: {
      id: string
      work_name_id: string
      base_rate: number
      unit_id: string
      units: { name: string }
      work_names: { id: string; name: string }
      work_sets: { id: string; name: string }
    } | null
    materials: Array<{
      name: string
      quantity: number
      price: number
      unit_id: string | null
    }>
    totalQuantity: number
  }>()

  chessboardData.forEach((item: any) => {
    // Проверяем наличие работы (расценки)
    const hasRateMapping =
      item.chessboard_rates_mapping?.length > 0 &&
      item.chessboard_rates_mapping[0].work_set_rate_id &&
      item.chessboard_rates_mapping[0].work_set_rate

    // Определяем ключ группировки:
    // - Если есть работа → используем work_set_rate_id
    // - Если НЕТ работы → используем специальный ключ 'NO_WORK'
    const rateId = hasRateMapping
      ? item.chessboard_rates_mapping[0].work_set_rate_id
      : 'NO_WORK'

    // Получаем данные работы (если есть)
    const rateMapping = hasRateMapping ? item.chessboard_rates_mapping[0] : null
    const rateUnitId = rateMapping?.work_set_rate?.unit_id || null

    // Учитываем количество только для материалов типа "База" с совпадающей ед.изм.
    let quantity = 0
    if (hasRateMapping && item.material_type === 'База' && item.unit_id === rateUnitId) {
      quantity = item.chessboard_floor_mapping?.reduce((sum: number, floor: any) =>
        sum + (floor.quantityRd || 0), 0) || 0
    }

    // Создаём группу работы, если её ещё нет
    if (!worksMap.has(rateId)) {
      worksMap.set(rateId, {
        rate: hasRateMapping ? rateMapping.work_set_rate : null,
        materials: [],
        totalQuantity: 0
      })
    }

    const workData = worksMap.get(rateId)!
    workData.totalQuantity += quantity

    // Добавляем все материалы независимо от типа и ед.изм. (для номенклатуры)
    if (item.chessboard_nomenclature_mapping) {
      item.chessboard_nomenclature_mapping.forEach((nomenclatureMapping: any) => {
        // Получаем название материала через supplier_names
        const supplierNames = nomenclatureMapping.supplier_names
        const nomenclatureName = supplierNames?.nomenclature_supplier_mapping?.[0]?.nomenclature?.name
        const materialName = nomenclatureName || supplierNames?.name || 'Материал не указан'

        // Используем общее количество материала для номенклатуры
        const materialQuantity = item.chessboard_floor_mapping?.reduce((sum: number, floor: any) =>
          sum + (floor.quantityRd || 0), 0) || 0

        // Получаем цену из material_prices (последняя по дате закупки)
        const materialPrices = supplierNames?.material_prices || []
        const latestPrice = materialPrices.length > 0
          ? materialPrices.sort((a: any, b: any) =>
              new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
            )[0].price
          : 0

        workData.materials.push({
          name: materialName,
          quantity: materialQuantity,
          price: latestPrice,
          unit_id: item.unit_id
        })
      })
    }
  })

  // 4. Создаем работы в ВОР
  // ВАЖНО: Сначала создаём работы с расценками, затем пустую работу (если есть)
  const filledWorks = Array.from(worksMap.entries()).filter(([rateId]) => rateId !== 'NO_WORK')
  const emptyWork = worksMap.get('NO_WORK')

  let workSortOrder = 1

  // 4.1. Создаём заполненные работы (с расценками)
  for (const [rateId, workData] of filledWorks) {
    // Для contractor устанавливаем base_rate = 0, для brigade - реальную цену
    const baseRate = vorType === 'brigade' ? workData.rate!.base_rate : 0

    const { data: vorWork, error: workError } = await supabase
      .from('vor_works')
      .insert({
        vor_id: vorId,
        work_set_rate_id: rateId,
        quantity: workData.totalQuantity,
        coefficient: 1.0,
        base_rate: baseRate,
        sort_order: workSortOrder,
        is_modified: false // Начальные данные не модифицированы
      })
      .select('id')
      .single()

    if (workError) {
      console.error('Ошибка создания работы ВОР:', workError)
      continue
    }

    // 5. Создаем материалы для работы
    let materialSortOrder = 1
    for (const material of workData.materials) {
      // Для contractor устанавливаем price = 0, для brigade - реальную цену
      const materialPrice = vorType === 'brigade' ? material.price : 0

      const { error: materialError } = await supabase
        .from('vor_materials')
        .insert({
          vor_work_id: vorWork.id,
          supplier_material_name: material.name,
          unit_id: material.unit_id,
          quantity: material.quantity,
          price: materialPrice,
          sort_order: materialSortOrder,
          is_modified: false // Начальные данные не модифицированы
        })

      if (materialError) {
        console.error('Ошибка создания материала ВОР:', materialError)
      }

      materialSortOrder++
    }

    workSortOrder++
  }

  // 4.2. Создаём пустую работу (если есть материалы без расценки)
  if (emptyWork) {
    const { data: vorWork, error: workError } = await supabase
      .from('vor_works')
      .insert({
        vor_id: vorId,
        work_set_rate_id: null,
        quantity: 0,
        coefficient: 1.0,
        base_rate: null,
        sort_order: workSortOrder,
        is_modified: false
      })
      .select('id')
      .single()

    if (workError) {
      console.error('Ошибка создания пустой работы ВОР:', workError)
    } else {
      // Создаём материалы для пустой работы
      let materialSortOrder = 1
      for (const material of emptyWork.materials) {
        // Для contractor устанавливаем price = 0, для brigade - реальную цену
        const materialPrice = vorType === 'brigade' ? material.price : 0

        const { error: materialError } = await supabase
          .from('vor_materials')
          .insert({
            vor_work_id: vorWork.id,
            supplier_material_name: material.name,
            unit_id: material.unit_id,
            quantity: material.quantity,
            price: materialPrice,
            sort_order: materialSortOrder,
            is_modified: false
          })

        if (materialError) {
          console.error('Ошибка создания материала для пустой работы:', materialError)
        }

        materialSortOrder++
      }
    }
  }
}

// Получение ВОР, связанных с комплектом шахматки
export const getVorsByChessboardSet = async (setId: string): Promise<ChessboardSetVor[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('vor_chessboard_sets_mapping')
    .select(`
      vor:vor_id(
        id,
        name,
        created_at,
        updated_at
      )
    `)
    .eq('set_id', setId)

  if (error) {
    console.error('Ошибка загрузки ВОР для комплекта:', error)
    throw error
  }

  return data?.map((item: any) => item.vor).filter(Boolean) || []
}