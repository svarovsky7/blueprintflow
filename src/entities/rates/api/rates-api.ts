import { supabase } from '@/lib/supabase'
import type { Rate, RateWithRelations, RateFormData } from '../model/types'

export const ratesApi = {
  async getAll(): Promise<RateWithRelations[]> {
    console.log('🔍 ratesApi.getAll() - начало запроса')
    if (!supabase) {
      console.error('❌ Supabase не настроен')
      throw new Error('Supabase is not configured')
    }

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

    console.log('📊 SQL запрос выполнен', { data, error })

    if (error) {
      console.error('❌ Ошибка при получении rates:', error)
      throw error
    }

    const result = data.map(({ detail_mapping, ...rate }) => {
      const detailCategory = detail_mapping?.[0]?.detail_cost_category
      return {
        ...rate,
        detail_cost_category: detailCategory || null,
        detail_cost_category_id: detailCategory?.id,
      }
    }) as RateWithRelations[]

    console.log('✅ Данные обработаны', { count: result.length, result })
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

    console.log('🔍 getWorksByCategory called with:', { costTypeId, costCategoryId }) // LOG: отладочная информация

    // Запрос: получаем только активные расценки с их категориями затрат
    const { data, error } = await supabase.from('rates').select(`
        id,
        work_name,
        active,
        rates_detail_cost_categories_mapping(detail_cost_category_id)
      `)
      .eq('active', true) // Фильтруем только активные расценки

    console.log('📊 SQL результат:', { data, error }) // LOG: отладочная информация

    if (error) {
      console.error('Failed to get works by category:', error)
      throw error
    }

    if (!data || data.length === 0) {
      console.log('⚠️ Нет активных данных для costTypeId:', costTypeId) // LOG: отладочная информация
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

      console.log('🔍 Checking active rate:', { // LOG: отладочная информация фильтрации
        rateId: rate.id,
        workName: rate.work_name,
        active: rate.active,
        categoryIds,
        categoryIdsAsNumbers,
        targetCostTypeId: costTypeId,
        targetIdAsString,
        targetIdAsNumber,
        includesString: categoryIds.includes(targetIdAsString),
        includesNumber: categoryIdsAsNumbers.includes(targetIdAsNumber)
      })

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

    console.log('✅ Результат обработки активных расценок:', result) // LOG: отладочная информация
    return result
  },
}
