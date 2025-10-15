import { supabase } from '@/lib/supabase'
import type { WorkSetRate, WorkSetRateWithRelations } from '../model/types'

// ============================================================================
// CRUD для расценок в наборах работ (work_set_rates)
// ============================================================================

/**
 * Получить все расценки с полными связями
 */
export async function getAllWorkSetRates(activeOnly = false): Promise<WorkSetRateWithRelations[]> {
  let query = supabase.from('work_set_rates').select(`
      *,
      work_set:work_set_id(id, name, active),
      work_name:work_name_id(id, name),
      unit:unit_id(id, name),
      work_set_rates_categories_mapping(
        detail_cost_category_id,
        cost_category_id,
        detail_cost_categories:detail_cost_category_id(id, name),
        cost_categories:cost_category_id(id, name, number)
      )
    `)

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Ошибка загрузки расценок:', error)
    throw error
  }

  // Обрабатываем данные: берем первую категорию из mapping для отображения в таблице
  const processedData = (data || []).map((rate) => {
    const mappings = (rate as unknown as { work_set_rates_categories_mapping?: Array<{
      detail_cost_category_id: number
      cost_category_id: number
      detail_cost_categories?: { id: number; name: string }
      cost_categories?: { id: number; name: string; number: number }
    }> }).work_set_rates_categories_mapping || []
    const firstMapping = mappings[0]

    return {
      ...rate,
      detail_cost_category: firstMapping?.detail_cost_categories,
      detail_cost_category_id: firstMapping?.detail_cost_category_id,
      cost_category: firstMapping?.cost_categories,
      cost_category_id: firstMapping?.cost_category_id,
    }
  })

  return processedData as WorkSetRateWithRelations[]
}

/**
 * Получить расценку по ID с полными связями
 */
export async function getWorkSetRateById(id: string): Promise<WorkSetRateWithRelations | null> {
  const { data, error } = await supabase
    .from('work_set_rates')
    .select(`
      *,
      work_set:work_set_id(id, name, active),
      work_name:work_name_id(id, name),
      unit:unit_id(id, name)
    `)
    .eq('id', id)
    .maybeSingle()

  if (error) {
    console.error('Ошибка загрузки расценки:', error)
    throw error
  }

  return data as WorkSetRateWithRelations | null
}

/**
 * Создать новую расценку
 */
export async function createWorkSetRate(data: {
  work_set_id: string
  work_name_id: string
  base_rate: number
  unit_id?: string | null
  active?: boolean
}): Promise<WorkSetRate> {
  const { data: result, error } = await supabase
    .from('work_set_rates')
    .insert([data])
    .select()
    .single()

  if (error) {
    console.error('Ошибка создания расценки:', error)
    throw error
  }

  return result
}

/**
 * Обновить расценку
 */
export async function updateWorkSetRate(
  id: string,
  updates: {
    work_set_id?: string
    work_name_id?: string
    base_rate?: number
    unit_id?: string | null
    active?: boolean
  }
): Promise<WorkSetRate> {
  const { data, error } = await supabase
    .from('work_set_rates')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Ошибка обновления расценки:', error)
    throw error
  }

  return data
}

/**
 * Удалить расценку
 */
export async function deleteWorkSetRate(id: string): Promise<void> {
  const { error } = await supabase.from('work_set_rates').delete().eq('id', id)

  if (error) {
    console.error('Ошибка удаления расценки:', error)
    throw error
  }
}

/**
 * Массовое создание расценок (для импорта из Excel)
 */
export async function bulkCreateWorkSetRates(
  rates: Array<{
    work_set_id: string
    work_name_id: string
    base_rate: number
    unit_id?: string | null
    active?: boolean
  }>
): Promise<WorkSetRate[]> {
  if (rates.length === 0) {
    return []
  }

  const BATCH_SIZE = 100
  const results: WorkSetRate[] = []

  for (let i = 0; i < rates.length; i += BATCH_SIZE) {
    const batch = rates.slice(i, i + BATCH_SIZE)

    const { data, error } = await supabase.from('work_set_rates').insert(batch).select()

    if (error) {
      console.error(`Ошибка массового создания расценок (батч ${i / BATCH_SIZE + 1}):`, error)
      throw error
    }

    if (data) {
      results.push(...data)
    }
  }

  return results
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ДЛЯ КАСКАДНЫХ DROPDOWN
// ============================================================================

/**
 * Получить наборы работ по категориям затрат (для каскадных dropdown)
 */
export async function getWorkSetsByCategory(
  costCategoryIds?: number[],
  costTypeIds?: number[]
): Promise<Array<{ id: string; name: string }>> {
  // НОВЫЙ ПОДХОД: Запрашиваем mappings с фильтрами, затем получаем work_sets
  // Это обходит лимит 1000 для work_set_rates

  let mappingsQuery = supabase
    .from('work_set_rates_categories_mapping')
    .select(`
      work_set_rate_id,
      detail_cost_category_id,
      cost_category_id,
      work_set_rates!inner(
        id,
        work_set_id,
        active,
        work_sets!inner(id, name, active)
      )
    `)

  // Фильтруем mappings по категориям
  if (costTypeIds && costTypeIds.length > 0) {
    const numericCostTypeIds = costTypeIds.map(id =>
      typeof id === 'string' ? parseInt(id, 10) : id
    )
    mappingsQuery = mappingsQuery.in('detail_cost_category_id', numericCostTypeIds)
  } else if (costCategoryIds && costCategoryIds.length > 0) {
    const numericCostCategoryIds = costCategoryIds.map(id =>
      typeof id === 'string' ? parseInt(id, 10) : id
    )
    mappingsQuery = mappingsQuery.in('cost_category_id', numericCostCategoryIds)
  }

  // Фильтруем по активным
  mappingsQuery = mappingsQuery
    .eq('work_set_rates.active', true)
    .eq('work_set_rates.work_sets.active', true)

  const { data: mappings, error } = await mappingsQuery

  if (error) {
    console.error('Ошибка загрузки наборов работ с фильтрами:', error)
    throw error
  }

  if (!mappings || mappings.length === 0) {
    return []
  }

  // Извлекаем уникальные work_sets из результата
  const uniqueWorkSets = new Map<string, { id: string; name: string }>()

  mappings.forEach((mapping: any) => {
    const rate = mapping.work_set_rates
    if (rate && rate.work_sets) {
      const workSet = rate.work_sets
      if (!uniqueWorkSets.has(workSet.id)) {
        uniqueWorkSets.set(workSet.id, {
          id: workSet.id,
          name: workSet.name,
        })
      }
    }
  })

  return Array.from(uniqueWorkSets.values()).sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Получить наименования работ по набору работ (для каскадных dropdown)
 */
export async function getWorkNamesByWorkSet(
  workSetId: string
): Promise<Array<{ id: string; work_name_id: string; name: string; base_rate: number; unit_id?: string; unit_name?: string }>> {
  const { data, error } = await supabase
    .from('work_set_rates')
    .select(`
      id,
      work_name_id,
      base_rate,
      unit_id,
      work_names:work_name_id(id, name),
      units:unit_id(id, name)
    `)
    .eq('work_set_id', workSetId)
    .eq('active', true)

  if (error) {
    console.error('Ошибка загрузки работ набора:', error)
    throw error
  }

  // Преобразуем и сортируем данные на клиенте
  const result = (data || [])
    .map((item: any) => ({
      id: item.id, // work_set_rate.id для сохранения в chessboard_rates_mapping
      work_name_id: item.work_name_id, // work_name.id для дополнительной информации
      name: item.work_names?.name || '',
      base_rate: item.base_rate,
      unit_id: item.unit_id || item.units?.id,
      unit_name: item.units?.name,
    }))
    .sort((a, b) => a.name.localeCompare(b.name)) // Сортируем на клиенте

  return result
}

/**
 * Получить расценки с фильтрами
 */
export async function getWorkSetRatesByFilters(filters: {
  workSetId?: string
  workNameId?: string
  costCategoryId?: number
  costTypeId?: number
  activeOnly?: boolean
}): Promise<WorkSetRateWithRelations[]> {
  let query = supabase.from('work_set_rates').select(`
      *,
      work_set:work_set_id(id, name, active),
      work_name:work_name_id(id, name),
      unit:unit_id(id, name),
      work_set_rates_categories_mapping(
        detail_cost_category_id,
        cost_category_id
      )
    `)

  if (filters.workSetId) {
    query = query.eq('work_set_id', filters.workSetId)
  }

  if (filters.workNameId) {
    query = query.eq('work_name_id', filters.workNameId)
  }

  if (filters.activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    console.error('Ошибка загрузки расценок с фильтрами:', error)
    throw error
  }

  let results = data || []

  if (filters.costTypeId) {
    results = results.filter((rate: any) => {
      const mappings = rate.work_set_rates_categories_mapping || []
      return mappings.some(
        (mapping: any) => mapping.detail_cost_category_id === filters.costTypeId
      )
    })
  } else if (filters.costCategoryId) {
    results = results.filter((rate: any) => {
      const mappings = rate.work_set_rates_categories_mapping || []
      return mappings.some((mapping: any) => mapping.cost_category_id === filters.costCategoryId)
    })
  }

  return results as WorkSetRateWithRelations[]
}

// ============================================================================
// РАБОТА С КАТЕГОРИЯМИ ЗАТРАТ (mapping)
// ============================================================================

/**
 * Добавить связь расценки с категорией затрат
 */
export async function addRateCategoryMapping(
  workSetRateId: string,
  detailCostCategoryId: number,
  costCategoryId: number
): Promise<void> {
  const { error } = await supabase.from('work_set_rates_categories_mapping').insert([
    {
      work_set_rate_id: workSetRateId,
      detail_cost_category_id: detailCostCategoryId,
      cost_category_id: costCategoryId,
    },
  ])

  if (error) {
    console.error('Ошибка добавления связи расценки с категорией:', error)
    throw error
  }
}

/**
 * Удалить все связи расценки с категориями
 */
export async function removeRateCategoryMappings(workSetRateId: string): Promise<void> {
  const { error } = await supabase
    .from('work_set_rates_categories_mapping')
    .delete()
    .eq('work_set_rate_id', workSetRateId)

  if (error) {
    console.error('Ошибка удаления связей расценки с категориями:', error)
    throw error
  }
}

/**
 * Обновить связи расценки с категориями (удалить старые + добавить новые)
 */
export async function updateRateCategoryMappings(
  workSetRateId: string,
  mappings: Array<{ detailCostCategoryId: number; costCategoryId: number }>
): Promise<void> {
  await removeRateCategoryMappings(workSetRateId)

  if (mappings.length === 0) {
    return
  }

  const { error } = await supabase.from('work_set_rates_categories_mapping').insert(
    mappings.map(m => ({
      work_set_rate_id: workSetRateId,
      detail_cost_category_id: m.detailCostCategoryId,
      cost_category_id: m.costCategoryId,
    }))
  )

  if (error) {
    console.error('Ошибка обновления связей расценки с категориями:', error)
    throw error
  }
}

// ============================================================================
// ДЕАКТИВАЦИЯ (мягкое удаление)
// ============================================================================

/**
 * Деактивировать расценку (мягкое удаление)
 */
export async function deactivateWorkSetRate(id: string): Promise<WorkSetRate> {
  return updateWorkSetRate(id, { active: false })
}

/**
 * Активировать расценку
 */
export async function activateWorkSetRate(id: string): Promise<WorkSetRate> {
  return updateWorkSetRate(id, { active: true })
}
