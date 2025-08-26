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
      .select(`
        *,
        unit:units(id, name),
        detail_mapping:rates_detail_cost_categories_mapping(
          detail_cost_category:detail_cost_categories(id, name, cost_category:cost_categories(id, name, number))
        )
      `)
      .order('created_at', { ascending: false })
    
    console.log('📊 SQL запрос выполнен', { data, error })
    
    if (error) {
      console.error('❌ Ошибка при получении rates:', error)
      throw error
    }
    
    const result = data.map(({ detail_mapping, ...rate }) => {
      const detailCategory = detail_mapping?.[0]?.detail_cost_category
      const costCategoryId = detailCategory?.cost_category?.id
      return {
        ...rate,
        detail_cost_category: detailCategory || null,
        detail_cost_category_id: detailCategory?.id,
        cost_category_ids: costCategoryId ? [costCategoryId] : [],
      }
    }) as RateWithRelations[]
    
    console.log('✅ Данные обработаны', { count: result.length, result })
    return result
  },

  async create(data: RateFormData): Promise<Rate> {
    if (!supabase) throw new Error('Supabase is not configured')
    
    const { detail_cost_category_id, ...rateData } = data

    // Создаем запись расценки
    const { data: rate, error: rateError } = await supabase
      .from('rates')
      .insert({ ...rateData })
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

    // Обновляем запись расценки
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
  }
}