import { supabase } from '@/lib/supabase'
import type {
  WorkSetRate,
  WorkSetRateFormData,
} from '../model/types'
import {
  createWorkSetRate,
  updateWorkSetRate,
  deleteWorkSetRate,
  updateRateCategoryMappings,
} from './work-set-rates-api'
import { getOrCreateWorkSet } from './work-sets-api'

// ============================================================================
// HIGH-LEVEL API для работы с формами расценок
// (аналог старого ratesApi, но для новых таблиц work_set_rates)
// ============================================================================

/**
 * Хелпер для получения или создания work_name_id
 */
async function resolveWorkNameId(data: WorkSetRateFormData): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured')

  // Если передан work_name_id - используем его
  if (data.work_name_id) {
    return data.work_name_id
  }

  // Если передан work_name (строка) - ищем или создаём
  if (data.work_name) {
    const workNameTrimmed = data.work_name.trim()

    // Ищем существующее (maybeSingle возвращает null если не найдено, без ошибки)
    const { data: existing, error: searchError } = await supabase
      .from('work_names')
      .select('id')
      .eq('name', workNameTrimmed)
      .maybeSingle()

    if (searchError) {
      throw searchError
    }

    if (existing) {
      return existing.id
    }

    // Создаём новое
    const { data: created, error: createError } = await supabase
      .from('work_names')
      .insert({ name: workNameTrimmed })
      .select('id')
      .single()

    if (createError) throw createError
    if (!created) throw new Error('Failed to create work_name')

    return created.id
  }

  throw new Error('Either work_name_id or work_name must be provided')
}

/**
 * Хелпер для получения или создания work_set_id
 */
async function resolveWorkSetId(data: WorkSetRateFormData): Promise<string> {
  // Если передан work_set_id - используем его
  if (data.work_set_id) {
    return data.work_set_id
  }

  // Если передан work_set_name (строка) - получаем или создаём
  if (data.work_set_name) {
    const workSet = await getOrCreateWorkSet(data.work_set_name.trim())
    return workSet.id
  }

  throw new Error('Either work_set_id or work_set_name must be provided')
}

/**
 * Создать расценку из формы (с автоматическим созданием work_name и work_set)
 */
export async function createWorkSetRateFromForm(
  data: WorkSetRateFormData
): Promise<WorkSetRate> {
  // Резолвим work_name_id и work_set_id
  const workNameId = await resolveWorkNameId(data)
  const workSetId = await resolveWorkSetId(data)

  // Создаем расценку
  const rate = await createWorkSetRate({
    work_set_id: workSetId,
    work_name_id: workNameId,
    base_rate: data.base_rate,
    unit_id: data.unit_id || null,
    active: data.active !== undefined ? data.active : true,
  })

  // Создаем mapping с категориями затрат (если указаны)
  if (data.detail_cost_category_id && data.cost_category_id) {
    await updateRateCategoryMappings(rate.id, [
      {
        detailCostCategoryId: data.detail_cost_category_id,
        costCategoryId: data.cost_category_id,
      },
    ])
  }

  return rate
}

/**
 * Обновить расценку из формы (с автоматическим созданием work_name и work_set)
 */
export async function updateWorkSetRateFromForm(
  id: string,
  data: WorkSetRateFormData
): Promise<WorkSetRate> {
  // Резолвим work_name_id и work_set_id
  const workNameId = await resolveWorkNameId(data)
  const workSetId = await resolveWorkSetId(data)

  // Обновляем расценку
  const rate = await updateWorkSetRate(id, {
    work_set_id: workSetId,
    work_name_id: workNameId,
    base_rate: data.base_rate,
    unit_id: data.unit_id || null,
    active: data.active !== undefined ? data.active : true,
  })

  // Обновляем mapping с категориями затрат
  if (data.detail_cost_category_id && data.cost_category_id) {
    await updateRateCategoryMappings(rate.id, [
      {
        detailCostCategoryId: data.detail_cost_category_id,
        costCategoryId: data.cost_category_id,
      },
    ])
  } else {
    // Если категории не указаны - удаляем все mappings
    await updateRateCategoryMappings(rate.id, [])
  }

  return rate
}

/**
 * Массовое создание расценок из формы (для импорта Excel)
 */
export async function bulkCreateWorkSetRatesFromForm(
  dataArray: WorkSetRateFormData[]
): Promise<WorkSetRate[]> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (dataArray.length === 0) return []

  const results: WorkSetRate[] = []
  const BATCH_SIZE = 50

  for (let i = 0; i < dataArray.length; i += BATCH_SIZE) {
    const batch = dataArray.slice(i, i + BATCH_SIZE)

    // Группировка по (work_set_name, work_name, base_rate) с агрегацией категорий
    const groupMap = new Map<
      string,
      {
        data: WorkSetRateFormData
        categories: Array<{ detail_cost_category_id: number; cost_category_id: number }>
      }
    >()

    batch.forEach((item) => {
      const workSetKey = item.work_set_name
        ? item.work_set_name.toLowerCase().trim()
        : `id_${item.work_set_id}`
      const workNameKey = item.work_name
        ? item.work_name.toLowerCase().trim()
        : `id_${item.work_name_id}`
      const priceKey = item.base_rate.toString()

      const key = `${workSetKey}:${workNameKey}:${priceKey}`

      if (!groupMap.has(key)) {
        groupMap.set(key, { data: item, categories: [] })
      }

      if (item.detail_cost_category_id && item.cost_category_id) {
        groupMap.get(key)!.categories.push({
          detail_cost_category_id: item.detail_cost_category_id,
          cost_category_id: item.cost_category_id,
        })
      }
    })

    const groupedBatch = Array.from(groupMap.values())
    const originalCount = batch.length
    const groupedCount = groupedBatch.length

    if (groupedCount < originalCount) {
      console.log(
        `📊 Батч ${Math.floor(i / BATCH_SIZE) + 1}: сгруппировано ${originalCount} строк → ${groupedCount} уникальных расценок (${originalCount - groupedCount} строк имеют одинаковую цену)`
      )
    }

    // ПРЕДВАРИТЕЛЬНО собираем все уникальные work_set_name и work_name
    const uniqueWorkSetNames = new Set<string>()
    const uniqueWorkNames = new Set<string>()

    groupedBatch.forEach(({ data }) => {
      if (data.work_set_name) {
        uniqueWorkSetNames.add(data.work_set_name.trim())
      }
      if (data.work_name) {
        uniqueWorkNames.add(data.work_name.trim())
      }
    })

    console.log(`📦 Батч ${Math.floor(i / BATCH_SIZE) + 1}: найдено ${uniqueWorkSetNames.size} уникальных work_sets, ${uniqueWorkNames.size} уникальных work_names`)

    // Создаём/получаем все work_sets ПОСЛЕДОВАТЕЛЬНО (чтобы избежать race condition)
    const workSetCache = new Map<string, string>()
    for (const workSetName of Array.from(uniqueWorkSetNames)) {
      try {
        const workSet = await getOrCreateWorkSet(workSetName)
        workSetCache.set(workSetName, workSet.id)
      } catch (error) {
        console.error(`Ошибка создания work_set "${workSetName}":`, error)
        throw error
      }
    }

    // Создаём/получаем все work_names ПОСЛЕДОВАТЕЛЬНО
    const workNameCache = new Map<string, string>()
    for (const workName of Array.from(uniqueWorkNames)) {
      try {
        const { data: existing, error: searchError } = await supabase
          .from('work_names')
          .select('id')
          .eq('name', workName)
          .maybeSingle()

        if (searchError) throw searchError

        if (existing) {
          workNameCache.set(workName, existing.id)
        } else {
          const { data: created, error: createError } = await supabase
            .from('work_names')
            .insert({ name: workName })
            .select('id')
            .single()

          if (createError) throw createError
          if (!created) throw new Error(`Failed to create work_name "${workName}"`)
          workNameCache.set(workName, created.id)
        }
      } catch (error) {
        console.error(`Ошибка создания work_name "${workName}":`, error)
        throw error
      }
    }

    // Резолвим work_name_id и work_set_id для каждой записи из кеша
    const resolvedBatch = groupedBatch.map(({ data, categories }) => {
      // Резолвим work_name_id
      let workNameId: string
      if (data.work_name_id) {
        workNameId = data.work_name_id
      } else if (data.work_name) {
        const cached = workNameCache.get(data.work_name.trim())
        if (!cached) throw new Error(`work_name "${data.work_name}" not found in cache`)
        workNameId = cached
      } else {
        throw new Error('Either work_name_id or work_name must be provided')
      }

      // Резолвим work_set_id (опционально)
      let workSetId: string | null = null
      if (data.work_set_id) {
        workSetId = data.work_set_id
      } else if (data.work_set_name) {
        const cached = workSetCache.get(data.work_set_name.trim())
        if (!cached) throw new Error(`work_set "${data.work_set_name}" not found in cache`)
        workSetId = cached
      }

      return { data, workNameId, workSetId, categories }
    })

    // Подготавливаем данные для вставки
    const ratesToInsert = resolvedBatch.map(({ workNameId, workSetId, data }) => ({
      work_set_id: workSetId,
      work_name_id: workNameId,
      base_rate: data.base_rate,
      unit_id: data.unit_id || null,
      active: data.active !== undefined ? data.active : true,
    }))

    // Проверяем, какие комбинации (work_set_id, work_name_id, base_rate) уже существуют
    const existingCombos = new Set<string>()

    // Группируем по work_set_id для эффективного запроса
    const workSetIds = Array.from(new Set(ratesToInsert.map(r => r.work_set_id).filter(Boolean)))

    if (workSetIds.length > 0) {
      const { data: existingRates, error: checkError } = await supabase
        .from('work_set_rates')
        .select('work_set_id, work_name_id, base_rate')
        .in('work_set_id', workSetIds)

      if (checkError) {
        console.error('Ошибка проверки существующих расценок:', checkError)
      } else if (existingRates) {
        existingRates.forEach(rate => {
          existingCombos.add(`${rate.work_set_id}:${rate.work_name_id}:${rate.base_rate}`)
        })
      }
    }

    // Фильтруем - оставляем только новые комбинации
    const newRatesToInsert = ratesToInsert.filter(rate => {
      const key = `${rate.work_set_id}:${rate.work_name_id}:${rate.base_rate}`
      return !existingCombos.has(key)
    })

    const skippedDuplicates = ratesToInsert.length - newRatesToInsert.length

    if (skippedDuplicates > 0) {
      console.log(`⏭️ Батч ${Math.floor(i / BATCH_SIZE) + 1}: пропущено ${skippedDuplicates} дубликатов (уже существуют в БД)`)
    }

    // Вставляем только новые расценки
    let rates: WorkSetRate[] = []

    if (newRatesToInsert.length > 0) {
      const { data: insertedRates, error: rateError } = await supabase
        .from('work_set_rates')
        .insert(newRatesToInsert)
        .select()

      if (rateError) {
        console.error('Failed to bulk create work set rates:', rateError)
        throw rateError
      }

      if (insertedRates) {
        rates = insertedRates as WorkSetRate[]
      }
    }

    // Создаем mappings для категорий затрат (только для вставленных записей)
    if (rates.length > 0) {
      // Создаём Map для сопоставления вставленных расценок с categories
      const rateToCategoriesMap = new Map<
        string,
        Array<{ detail_cost_category_id: number; cost_category_id: number }>
      >()

      resolvedBatch.forEach(({ data, workNameId, workSetId, categories }) => {
        const key = `${workSetId}:${workNameId}:${data.base_rate}`
        if (categories.length > 0) {
          rateToCategoriesMap.set(key, categories)
        }
      })

      // Собираем все mappings для всех расценок
      const allMappings: Array<{
        work_set_rate_id: string
        detail_cost_category_id: number
        cost_category_id: number
      }> = []

      rates.forEach((rate) => {
        const key = `${rate.work_set_id}:${rate.work_name_id}:${rate.base_rate}`
        const categories = rateToCategoriesMap.get(key)

        if (categories && categories.length > 0) {
          // Создаем mapping для каждой категории
          categories.forEach((category) => {
            allMappings.push({
              work_set_rate_id: rate.id,
              detail_cost_category_id: category.detail_cost_category_id,
              cost_category_id: category.cost_category_id,
            })
          })
        }
      })

      if (allMappings.length > 0) {
        const { error: mappingError } = await supabase
          .from('work_set_rates_categories_mapping')
          .insert(allMappings)

        if (mappingError) {
          console.error('Failed to create rate category mappings:', mappingError)
        } else {
          console.log(
            `✅ Создано ${allMappings.length} связей категорий для ${rates.length} расценок`
          )
        }
      }

      results.push(...rates)
    }

    console.log(
      `✅ Обработан батч ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(dataArray.length / BATCH_SIZE)}: создано ${rates.length}, пропущено ${skippedDuplicates}, всего обработано ${groupedBatch.length}`
    )
  }

  return results
}

/**
 * Массовое обновление расценок из формы
 */
export async function bulkUpdateWorkSetRatesFromForm(
  updates: Array<{ id: string; data: WorkSetRateFormData }>
): Promise<void> {
  if (updates.length === 0) return

  const BATCH_SIZE = 50

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)

    // Обновляем последовательно в рамках батча
    await Promise.all(
      batch.map(async ({ id, data }) => {
        await updateWorkSetRateFromForm(id, data)
      })
    )

    console.log(
      `✅ Обновлен батч ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(updates.length / BATCH_SIZE)} (${batch.length} записей)`
    )
  }
}

/**
 * Массовое удаление расценок
 */
export async function bulkDeleteWorkSetRates(ids: string[]): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured')
  if (ids.length === 0) return

  const BATCH_SIZE = 100
  const batches = []

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE))
  }

  console.log(`🗑️ Удаление ${ids.length} записей батчами по ${BATCH_SIZE}`)

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]

    // Сначала удаляем mappings (CASCADE должен это сделать автоматически, но для надежности)
    const { error: mappingError } = await supabase
      .from('work_set_rates_categories_mapping')
      .delete()
      .in('work_set_rate_id', batch)

    if (mappingError) {
      console.error(
        `Failed to delete mappings for batch ${i + 1}/${batches.length}:`,
        mappingError
      )
      // Продолжаем даже если mapping не удалились (CASCADE должен справиться)
    }

    // Удаляем расценки
    const { error } = await supabase.from('work_set_rates').delete().in('id', batch)

    if (error) {
      console.error(`Failed to delete batch ${i + 1}/${batches.length}:`, error)
      throw error
    }

    console.log(`✅ Удален батч ${i + 1}/${batches.length} (${batch.length} записей)`)
  }

  console.log(`✅ Все ${ids.length} записей успешно удалены`)
}

/**
 * Удалить одну расценку
 */
export async function deleteWorkSetRateById(id: string): Promise<void> {
  await deleteWorkSetRate(id)
}
