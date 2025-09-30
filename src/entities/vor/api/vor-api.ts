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
      name: work.rates?.work_name || '',
      unit: work.rates?.units?.name || '',
      quantity: work.quantity,
      coefficient: work.coefficient,
      work_price: workPrice,
      work_total: workTotal,
      base_rate: work.base_rate || 0,
      rate_id: work.rate_id,
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

// Создание ВОР на основе комплекта шахматки
export const createVorFromChessboardSet = async (dto: CreateVorFromChessboardSetDto): Promise<string> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  try {
    // 1. Создаем основную запись ВОР
    const { data: vorData, error: vorError } = await supabase
      .from('vor')
      .insert({
        name: dto.name,
        project_id: dto.project_id,
        rate_coefficient: dto.rate_coefficient || 1.0
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
        set_id: dto.set_id
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
const populateVorFromChessboardSet = async (vorId: string, setId: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  // 1. Получаем настройки комплекта
  const { data: setData, error: setError } = await supabase
    .from('chessboard_sets')
    .select(`
      id,
      project_id,
      documentation_id,
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
  const query = supabase
    .from('chessboard')
    .select(`
      id,
      material,
      unit_id,
      material_type,
      materials:material(name),
      units:unit_id(id, name),
      chessboard_rates_mapping(
        rate_id,
        rates:rate_id(
          id,
          work_name,
          base_rate,
          unit_id,
          units:unit_id(name)
        )
      ),
      chessboard_nomenclature_mapping(
        nomenclature_id,
        supplier_name,
        nomenclature:nomenclature_id(
          name,
          material_prices(price, purchase_date)
        )
      ),
      chessboard_floor_mapping("quantityRd"),
      chessboard_mapping(
        block_id,
        cost_category_id,
        cost_type_id,
        location_id
      )
    `)
    .eq('project_id', setData.project_id)

  // Применяем фильтры комплекта (упрощенная версия)
  // В реальной реализации здесь нужна более сложная логика фильтрации

  const { data: chessboardData, error: chessboardError } = await query

  if (chessboardError) {
    console.error('Ошибка загрузки данных шахматки:', chessboardError)
    throw chessboardError
  }

  if (!chessboardData || chessboardData.length === 0) {
    console.warn('Нет данных шахматки для комплекта')
    return
  }

  // 3. Группируем данные по работам (rates)
  // ВАЖНО: Количество для работы считается только по материалам типа "База"
  // с совпадающими единицами измерения с работой
  const worksMap = new Map<string, {
    rate: {
      id: string
      work_name: string
      base_rate: number
      unit_id: string
      units: { name: string }
    }
    materials: Array<{
      name: string
      quantity: number
      price: number
      unit_id: string | null
    }>
    totalQuantity: number
  }>()

  chessboardData.forEach((item: any) => {
    if (!item.chessboard_rates_mapping || item.chessboard_rates_mapping.length === 0) {
      return
    }

    const rateMapping = item.chessboard_rates_mapping[0]
    if (!rateMapping.rates) return

    const rateId = rateMapping.rate_id
    const rateUnitId = rateMapping.rates.unit_id

    // Учитываем количество только для материалов типа "База" с совпадающей ед.изм.
    let quantity = 0
    if (item.material_type === 'База' && item.unit_id === rateUnitId) {
      quantity = item.chessboard_floor_mapping?.reduce((sum: number, floor: any) =>
        sum + (floor.quantityRd || 0), 0) || 0
    }

    if (!worksMap.has(rateId)) {
      worksMap.set(rateId, {
        rate: rateMapping.rates,
        materials: [],
        totalQuantity: 0
      })
    }

    const workData = worksMap.get(rateId)!
    workData.totalQuantity += quantity

    // Добавляем все материалы независимо от типа и ед.изм. (для номенклатуры)
    if (item.chessboard_nomenclature_mapping) {
      item.chessboard_nomenclature_mapping.forEach((nomenclatureMapping: any) => {
        if (nomenclatureMapping.nomenclature) {
          // Получаем последнюю цену
          const prices = nomenclatureMapping.nomenclature.material_prices || []
          const latestPrice = prices.length > 0
            ? prices.sort((a: any, b: any) =>
                new Date(b.purchase_date).getTime() - new Date(a.purchase_date).getTime()
              )[0].price
            : 0

          // Используем общее количество материала для номенклатуры
          const materialQuantity = item.chessboard_floor_mapping?.reduce((sum: number, floor: any) =>
            sum + (floor.quantityRd || 0), 0) || 0

          workData.materials.push({
            name: nomenclatureMapping.nomenclature.name,
            quantity: materialQuantity,
            price: latestPrice,
            unit_id: item.unit_id
          })
        }
      })
    }
  })

  // 4. Создаем работы в ВОР
  let workSortOrder = 1
  for (const [rateId, workData] of worksMap) {
    // Создаем работу
    const { data: vorWork, error: workError } = await supabase
      .from('vor_works')
      .insert({
        vor_id: vorId,
        rate_id: rateId,
        quantity: workData.totalQuantity,
        coefficient: 1.0,
        base_rate: workData.rate.base_rate,
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
      const { error: materialError } = await supabase
        .from('vor_materials')
        .insert({
          vor_work_id: vorWork.id,
          supplier_material_name: material.name,
          unit_id: material.unit_id,
          quantity: material.quantity,
          price: material.price,
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