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
        cost_categories:rates_cost_categories_mapping(
          cost_category:cost_categories(id, name, number)
        )
      `)
      .order('created_at', { ascending: false })
    
    console.log('📊 SQL запрос выполнен', { data, error })
    
    if (error) {
      console.error('❌ Ошибка при получении rates:', error)
      throw error
    }
    
    const result = data.map(rate => ({
      ...rate,
      cost_categories: rate.cost_categories?.map((mapping: any) => mapping.cost_category).filter(Boolean) || [],
      detail_cost_category: null
    })) as RateWithRelations[]
    
    console.log('✅ Данные обработаны', { count: result.length, result })
    return result
  },

  async create(data: RateFormData): Promise<Rate> {
    if (!supabase) throw new Error('Supabase is not configured')
    
    const { cost_category_ids, detail_cost_category_id, ...rateData } = data
    
    // Создаем запись расценки
    const { data: rate, error: rateError } = await supabase
      .from('rates')
      .insert(rateData)
      .select()
      .single()
    
    if (rateError) {
      console.error('Failed to create rate:', rateError)
      throw rateError
    }
    
    // Создаем связи с категориями затрат
    if (cost_category_ids.length > 0) {
      const mappings = cost_category_ids.map(cost_category_id => ({
        rate_id: rate.id,
        cost_category_id
      }))
      
      const { error: mappingError } = await supabase
        .from('rates_cost_categories_mapping')
        .insert(mappings)
      
      if (mappingError) {
        console.error('Failed to create rate-cost category mappings:', mappingError)
        throw mappingError
      }
    }
    
    return rate as Rate
  },

  async update(id: string, data: RateFormData): Promise<Rate> {
    if (!supabase) throw new Error('Supabase is not configured')
    
    const { cost_category_ids, detail_cost_category_id, ...rateData } = data
    
    // Обновляем запись расценки
    const { data: rate, error: rateError } = await supabase
      .from('rates')
      .update(rateData)
      .eq('id', id)
      .select()
      .single()
    
    if (rateError) {
      console.error('Failed to update rate:', rateError)
      throw rateError
    }
    
    // Обновляем связи с категориями затрат
    // Удаляем старые связи
    const { error: deleteError } = await supabase
      .from('rates_cost_categories_mapping')
      .delete()
      .eq('rate_id', id)
    
    if (deleteError) {
      console.error('Failed to delete old rate-cost category mappings:', deleteError)
      throw deleteError
    }
    
    // Создаем новые связи
    if (cost_category_ids.length > 0) {
      const mappings = cost_category_ids.map(cost_category_id => ({
        rate_id: id,
        cost_category_id
      }))
      
      const { error: mappingError } = await supabase
        .from('rates_cost_categories_mapping')
        .insert(mappings)
      
      if (mappingError) {
        console.error('Failed to create new rate-cost category mappings:', mappingError)
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