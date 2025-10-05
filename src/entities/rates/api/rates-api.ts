import { supabase } from '@/lib/supabase'
import type { Rate, RateWithRelations, RateFormData } from '../model/types'

export const ratesApi = {
  async getAll(): Promise<RateWithRelations[]> {
    console.log('🔍 ratesApi.getAll() - начало запроса')
    if (!supabase) {
      console.error('❌ Supabase не настроен')
      throw new Error('Supabase is not configured')
    }

    const BATCH_SIZE = 1000
    let allData: any[] = []
    let from = 0
    let hasMore = true

    while (hasMore) {
      const to = from + BATCH_SIZE - 1
      const { data, error } = await supabase
        .from('rates')
        .select(
          `
          *,
          unit:units(id, name),
          detail_mapping:rates_detail_cost_categories_mapping(
            detail_cost_category:detail_cost_categories(id, name, cost_category:cost_categories(id, name, number))
          )
        `,
        )
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) {
        console.error('❌ Ошибка при получении rates:', error)
        throw error
      }

      if (!data || data.length === 0) {
        hasMore = false
      } else {
        allData = [...allData, ...data]
        console.log(`📊 Загружен батч ${from}-${to}, всего записей: ${allData.length}`)

        if (data.length < BATCH_SIZE) {
          hasMore = false
        } else {
          from += BATCH_SIZE
        }
      }
    }

    const result = allData.map(({ detail_mapping, ...rate }) => {
      const detailCategory = detail_mapping?.[0]?.detail_cost_category
      return {
        ...rate,
        detail_cost_category: detailCategory || null,
        detail_cost_category_id: detailCategory?.id,
      }
    }) as RateWithRelations[]

    console.log('✅ Все данные загружены', { count: result.length })
    return result
  },

  async create(data: RateFormData): Promise<Rate> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { detail_cost_category_id, ...rateData } = data

    // Устанавливаем значение по умолчанию для active, если не указано
    const rateDataWithDefaults = {
      ...rateData,
      active: rateData.active !== undefined ? rateData.active : true
    }

    // Создаем запись расценки
    const { data: rate, error: rateError } = await supabase
      .from('rates')
      .insert({ ...rateDataWithDefaults })
      .select()
      .single()

    if (rateError) {
      console.error('Failed to create rate:', rateError)
      throw rateError
    }

    // Создаем связь с видом затрат
    if (detail_cost_category_id) {
      const { error: mappingError } = await supabase
        .from('rates_detail_cost_categories_mapping')
        .insert({ rate_id: rate.id, detail_cost_category_id })

      if (mappingError) {
        console.error('Failed to create rate-detail cost category mapping:', mappingError)
        throw mappingError
      }
    }

    return rate as Rate
  },

  async update(id: string, data: RateFormData): Promise<Rate> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { detail_cost_category_id, ...rateData } = data

    // Обновляем запись расценки (включая поле active)
    const { data: rate, error: rateError } = await supabase
      .from('rates')
      .update({ ...rateData })
      .eq('id', id)
      .select()
      .single()

    if (rateError) {
      console.error('Failed to update rate:', rateError)
      throw rateError
    }

    // Обновляем связь с видом затрат
    // Удаляем старые связи
    const { error: deleteError } = await supabase
      .from('rates_detail_cost_categories_mapping')
      .delete()
      .eq('rate_id', id)

    if (deleteError) {
      console.error('Failed to delete old rate-detail cost category mapping:', deleteError)
      throw deleteError
    }

    // Создаем новую связь
    if (detail_cost_category_id) {
      const { error: mappingError } = await supabase
        .from('rates_detail_cost_categories_mapping')
        .insert({ rate_id: id, detail_cost_category_id })

      if (mappingError) {
        console.error('Failed to create new rate-detail cost category mapping:', mappingError)
        throw mappingError
      }
    }

    return rate as Rate
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase.from('rates').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete rate:', error)
      throw error
    }
  },

  async bulkDelete(ids: string[]): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase.from('rates').delete().in('id', ids)

    if (error) {
      console.error('Failed to bulk delete rates:', error)
      throw error
    }
  },

  // Получение единицы измерения по ID расценки
  async getUnitByRateId(rateId: string): Promise<string | null> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('rates')
      .select('unit:units(name)')
      .eq('id', rateId)
      .single()

    if (error) {
      console.error('Failed to get unit by rate id:', error)
      return null
    }

    return data?.unit?.name || null
  },

  // Получение работ по виду затрат через rates_detail_cost_categories_mapping
  async getWorksByCategory(
    costTypeId?: string,
    costCategoryId?: string,
  ): Promise<{ value: string; label: string }[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    // Если не указан ни вид затрат, ни категория затрат - возвращаем пустой список
    if (!costTypeId && !costCategoryId) {
      return []
    }


    // Запрос: получаем только активные расценки с их категориями затрат
    const { data, error } = await supabase.from('rates').select(`
        id,
        work_name,
        active,
        rates_detail_cost_categories_mapping(detail_cost_category_id)
      `)
      .eq('active', true) // Фильтруем только активные расценки


    if (error) {
      console.error('Failed to get works by category:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Фильтруем расценки по виду затрат (как в backup файле)
    const filteredRates = data.filter((rate) => {
      const categoryIds =
        rate.rates_detail_cost_categories_mapping?.map((m) =>
          m.detail_cost_category_id.toString(),
        ) ?? []

      // Сравниваем и как строку, и как число для надежности
      const targetIdAsString = costTypeId?.toString() || ''
      const targetIdAsNumber = parseInt(costTypeId || '0')
      const categoryIdsAsNumbers = rate.rates_detail_cost_categories_mapping?.map((m) => m.detail_cost_category_id) ?? []


      // Проверяем оба варианта: строка и число
      return categoryIds.includes(targetIdAsString) || categoryIdsAsNumbers.includes(targetIdAsNumber)
    })

    // Преобразуем результат в нужный формат и сортируем по названию работы
    const result = filteredRates
      .filter((rate) => rate.work_name) // Только записи с валидными работами
      .map((rate) => ({
        value: rate.id.toString(), // ID расценки для сохранения в chessboard_rates_mapping
        label: rate.work_name, // Название работы для отображения
      }))
      .sort((a, b) => a.label.localeCompare(b.label)) // Сортировка по названию работы

    return result
  },

  // Получение рабочих наборов по виду затрат для столбца "Рабочий набор" в шахматке
  async getWorkSetsByCategory(costTypeId?: string, costCategoryId?: string): Promise<{ value: string; label: string }[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    // Если не указан вид затрат - возвращаем пустой список
    if (!costTypeId) {
      console.log('❌ getWorkSetsByCategory: costTypeId не указан') // LOG
      return []
    }

    console.log('🔍 getWorkSetsByCategory вызван с:', { costTypeId, costCategoryId }) // LOG

    // ШАГ 1: Проверяем существование связки (категория + вид затрат) через detail_cost_categories_mapping
    if (costCategoryId) {
      const categoryIdInt = parseInt(costCategoryId)
      const costTypeIdInt = parseInt(costTypeId)

      console.log('🔍 Параметры запроса к detail_cost_categories_mapping:', { // LOG
        categoryId: costCategoryId,
        categoryIdInt,
        costTypeId,
        costTypeIdInt
      })

      const { data: mappingExists, error: mappingError } = await supabase
        .from('detail_cost_categories_mapping')
        .select('*')
        .eq('cost_category_id', categoryIdInt)
        .eq('detail_cost_category_id', costTypeIdInt)
        .limit(1)

      console.log('🔍 Результат запроса к detail_cost_categories_mapping:', mappingExists) // LOG
      console.log('🔍 Проверка связки (categoryId + costTypeId):', { // LOG
        categoryId: costCategoryId,
        costTypeId,
        exists: mappingExists && mappingExists.length > 0
      })

      if (mappingError) {
        console.error('❌ Ошибка при проверке связки:', mappingError) // LOG
        throw mappingError
      }

      // Если связки нет в detail_cost_categories_mapping - возвращаем пустой массив
      if (!mappingExists || mappingExists.length === 0) {
        console.log('⚠️ Нет связки (categoryId + costTypeId) в detail_cost_categories_mapping - возвращаем []') // LOG
        return []
      }
    }

    // ШАГ 2: Получаем активные расценки с рабочими наборами, связанные с видом затрат
    const { data, error } = await supabase.from('rates').select(`
        id,
        work_set,
        active,
        rates_detail_cost_categories_mapping(detail_cost_category_id)
      `)
      .eq('active', true) // Только активные расценки
      .not('work_set', 'is', null) // Только записи с заполненным work_set

    console.log('📊 Получено расценок из БД:', data?.length || 0) // LOG

    if (error) {
      console.error('❌ Failed to get work sets by category:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Нет данных из БД') // LOG
      return []
    }

    // ШАГ 3: Фильтруем расценки по виду затрат
    const targetIdAsString = costTypeId.toString()
    const targetIdAsNumber = parseInt(costTypeId)

    console.log('🔍 Ищем расценки с detail_cost_category_id:', { targetIdAsString, targetIdAsNumber }) // LOG

    // Проверим первые 3 записи для отладки
    console.log('🔍 Первые 3 расценки из БД:', data.slice(0, 3).map(r => ({ // LOG
      id: r.id,
      work_set: r.work_set,
      mapping: r.rates_detail_cost_categories_mapping,
      mappingDetailIds: r.rates_detail_cost_categories_mapping?.map(m => m.detail_cost_category_id) || []
    })))

    // Проверим, есть ли хоть одна расценка с нужным detail_cost_category_id
    const sampleMatchingRate = data.find(r =>
      r.rates_detail_cost_categories_mapping?.some(m =>
        m.detail_cost_category_id === targetIdAsNumber ||
        m.detail_cost_category_id.toString() === targetIdAsString
      )
    )
    console.log('🔍 Найдена ли хоть одна расценка с costTypeId=' + targetIdAsString + '?', !!sampleMatchingRate) // LOG
    if (sampleMatchingRate) {
      console.log('🔍 Пример расценки с нужным costTypeId:', { // LOG
        id: sampleMatchingRate.id,
        work_set: sampleMatchingRate.work_set,
        mappingDetailIds: sampleMatchingRate.rates_detail_cost_categories_mapping?.map(m => m.detail_cost_category_id)
      })
    }

    const filteredRates = data.filter((rate) => {
      const categoryIds = rate.rates_detail_cost_categories_mapping?.map((m) => m.detail_cost_category_id.toString()) ?? []
      const categoryIdsAsNumbers = rate.rates_detail_cost_categories_mapping?.map((m) => m.detail_cost_category_id) ?? []

      const matches = categoryIds.includes(targetIdAsString) || categoryIdsAsNumbers.includes(targetIdAsNumber)
      return matches
    })

    console.log('🔍 Отфильтровано расценок:', filteredRates.length, 'из', data.length) // LOG
    if (filteredRates.length > 0) {
      console.log('🔍 Первая отфильтрованная расценка:', { // LOG
        id: filteredRates[0].id,
        work_set: filteredRates[0].work_set,
        mapping: filteredRates[0].rates_detail_cost_categories_mapping
      })
    }

    // ШАГ 4: Убираем дубликаты рабочих наборов и преобразуем в нужный формат
    const uniqueWorkSets = new Map<string, string>()
    filteredRates.forEach((rate) => {
      if (rate.work_set && !uniqueWorkSets.has(rate.id)) {
        uniqueWorkSets.set(rate.id, rate.work_set)
      }
    })

    // Преобразуем в нужный формат и сортируем
    const result = Array.from(uniqueWorkSets.entries())
      .map(([rateId, workSetName]) => ({
        value: rateId, // ID записи rates для сохранения в chessboard_rates_mapping.work_set
        label: workSetName, // Название рабочего набора для отображения
      }))
      .sort((a, b) => a.label.localeCompare(b.label))

    console.log('✅ Результат getWorkSetsByCategory:', result.length, 'уникальных рабочих наборов') // LOG

    return result
  },

  // Получение работ по конкретному рабочему набору (по rate_id)
  async getWorksByWorkSet(workSetRateId?: string): Promise<{ value: string; label: string }[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    // Если не указан ID рабочего набора - возвращаем пустой список
    if (!workSetRateId) {
      return []
    }


    // Получаем конкретную расценку по ID рабочего набора
    const { data, error } = await supabase
      .from('rates')
      .select('id, work_name, work_set, active')
      .eq('id', workSetRateId)
      .eq('active', true) // Только активные расценки
      .single()


    if (error) {
      console.error('Failed to get works by work set:', error)
      throw error
    }

    if (!data) {
      return []
    }

    // Возвращаем единственную работу из выбранного рабочего набора
    const result = [{
      value: data.id.toString(), // ID расценки для сохранения в chessboard_rates_mapping
      label: data.work_name, // Название работы для отображения
    }]

    return result
  },
}
