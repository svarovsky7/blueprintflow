import { supabase } from '@/lib/supabase'
import type {
  VorWork,
  CreateVorWorkDto,
  UpdateVorWorkDto,
  VorWorksFilters,
  RateOption
} from '../model/types'

// Получение всех работ для ВОР
export const getVorWorks = async (filters: VorWorksFilters): Promise<VorWork[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('vor_works')
    .select(`
      *,
      rates:rate_id(
        id,
        work_name_id,
        base_rate,
        unit_id,
        units:unit_id(id, name),
        work_names:work_name_id(id, name)
      ),
      work_set_rate:work_set_rate_id(
        id,
        work_set
      )
    `)
    .eq('vor_id', filters.vor_id)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('Ошибка загрузки работ ВОР:', error)
    throw error
  }

  return data || []
}

// Создание новой работы
export const createVorWork = async (workData: CreateVorWorkDto): Promise<VorWork> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  // Если не указан sort_order, получаем максимальный + 1
  if (workData.sort_order === undefined) {
    const { data: maxOrder } = await supabase
      .from('vor_works')
      .select('sort_order')
      .eq('vor_id', workData.vor_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    workData.sort_order = (maxOrder?.sort_order || 0) + 1
  }

  const { data, error } = await supabase
    .from('vor_works')
    .insert(workData)
    .select(`
      *,
      rates:rate_id(
        id,
        work_name_id,
        base_rate,
        unit_id,
        units:unit_id(id, name),
        work_names:work_name_id(id, name)
      ),
      work_set_rate:work_set_rate_id(
        id,
        work_set
      )
    `)
    .single()

  if (error) {
    console.error('Ошибка создания работы ВОР:', error)
    throw error
  }

  return data
}

// Обновление работы
export const updateVorWork = async (id: string, workData: UpdateVorWorkDto): Promise<VorWork> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('vor_works')
    .update(workData)
    .eq('id', id)
    .select(`
      *,
      rates:rate_id(
        id,
        work_name_id,
        base_rate,
        unit_id,
        units:unit_id(id, name),
        work_names:work_name_id(id, name)
      ),
      work_set_rate:work_set_rate_id(
        id,
        work_set
      )
    `)
    .single()

  if (error) {
    console.error('Ошибка обновления работы ВОР:', error)
    throw error
  }

  return data
}

// Удаление работы
export const deleteVorWork = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { error } = await supabase
    .from('vor_works')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Ошибка удаления работы ВОР:', error)
    throw error
  }
}

// Массовое удаление работ
export const deleteVorWorks = async (ids: string[]): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { error } = await supabase
    .from('vor_works')
    .delete()
    .in('id', ids)

  if (error) {
    console.error('Ошибка массового удаления работ ВОР:', error)
    throw error
  }
}

// Обновление порядка сортировки работ
export const updateVorWorksOrder = async (updates: Array<{ id: string; sort_order: number }>): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  for (const update of updates) {
    const { error } = await supabase
      .from('vor_works')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)

    if (error) {
      console.error('Ошибка обновления порядка работ ВОР:', error)
      throw error
    }
  }
}

// Получение расценок для выбора
export const getRatesOptions = async (): Promise<RateOption[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('rates')
    .select(`
      id,
      work_name_id,
      base_rate,
      unit_id,
      work_set,
      units:unit_id(name),
      work_names:work_name_id(id, name)
    `)
    .eq('active', true)

  if (error) {
    console.error('Ошибка загрузки расценок:', error)
    throw error
  }

  return (data || [])
    .map((rate: any) => ({
      id: rate.id,
      work_name_id: rate.work_name_id,
      work_name: rate.work_names?.name || '',
      base_rate: rate.base_rate,
      unit_id: rate.unit_id,
      unit_name: rate.units?.name || undefined,
      work_set: rate.work_set,
    }))
    .sort((a, b) => a.work_name.localeCompare(b.work_name))
}

// Получение рабочих наборов для выбора
export const getWorkSetsOptions = async (): Promise<Array<{id: string, work_set: string}>> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('rates')
    .select('id, work_set')
    .eq('active', true)
    .not('work_set', 'is', null)
    .order('work_set', { ascending: true })

  if (error) {
    console.error('Ошибка загрузки рабочих наборов:', error)
    throw error
  }

  // Убираем дубликаты по work_set
  const uniqueWorkSets = new Map<string, {id: string, work_set: string}>()
  data?.forEach(rate => {
    if (rate.work_set && !uniqueWorkSets.has(rate.work_set)) {
      uniqueWorkSets.set(rate.work_set, {
        id: rate.id,
        work_set: rate.work_set
      })
    }
  })

  return Array.from(uniqueWorkSets.values())
}

// Получение рабочих наборов с учетом фильтров комплекта
export const getWorkSetsByFilters = async (costTypeIds?: number[], costCategoryIds?: number[]): Promise<Array<{id: string, work_set: string}>> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  let query = supabase
    .from('rates')
    .select(`
      id,
      work_set,
      rates_detail_cost_categories_mapping(
        detail_cost_category_id,
        detail_cost_categories:detail_cost_category_id(
          id,
          cost_category_id
        )
      )
    `)
    .eq('active', true)
    .not('work_set', 'is', null)

  const { data, error } = await query

  if (error) {
    console.error('Ошибка загрузки рабочих наборов с фильтрами:', error)
    throw error
  }

  if (!data || data.length === 0) {
    return []
  }

  // Фильтруем данные на клиенте в зависимости от переданных параметров
  let filteredRates = data

  if (costTypeIds && costTypeIds.length > 0) {
    // Приоритет 1: Фильтрация по видам затрат (detail_cost_categories)
    filteredRates = data.filter(rate => {
      const mappings = rate.rates_detail_cost_categories_mapping || []
      return mappings.some(mapping =>
        costTypeIds.includes(mapping.detail_cost_category_id)
      )
    })
  } else if (costCategoryIds && costCategoryIds.length > 0) {
    // Приоритет 2: Фильтрация по категориям затрат через detail_cost_categories
    filteredRates = data.filter(rate => {
      const mappings = rate.rates_detail_cost_categories_mapping || []
      return mappings.some(mapping => {
        const detailCategory = mapping.detail_cost_categories
        return detailCategory && costCategoryIds.includes(detailCategory.cost_category_id)
      })
    })
  }
  // Если нет фильтров - возвращаем все

  // Убираем дубликаты по work_set
  const uniqueWorkSets = new Map<string, {id: string, work_set: string}>()
  filteredRates.forEach(rate => {
    if (rate.work_set && !uniqueWorkSets.has(rate.work_set)) {
      uniqueWorkSets.set(rate.work_set, {
        id: rate.id,
        work_set: rate.work_set
      })
    }
  })

  return Array.from(uniqueWorkSets.values()).sort((a, b) => a.work_set.localeCompare(b.work_set))
}