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
        work_name,
        base_rate,
        unit_id,
        units:unit_id(id, name)
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
        work_name,
        base_rate,
        unit_id,
        units:unit_id(id, name)
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
        work_name,
        base_rate,
        unit_id,
        units:unit_id(id, name)
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
      work_name,
      base_rate,
      unit_id,
      units:unit_id(name)
    `)
    .eq('active', true)
    .order('work_name', { ascending: true })

  if (error) {
    console.error('Ошибка загрузки расценок:', error)
    throw error
  }

  return (data || []).map(rate => ({
    id: rate.id,
    work_name: rate.work_name,
    base_rate: rate.base_rate,
    unit_id: rate.unit_id,
    unit_name: rate.units?.name || undefined
  }))
}