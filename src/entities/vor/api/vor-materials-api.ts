import { supabase } from '@/lib/supabase'
import type {
  VorMaterial,
  CreateVorMaterialDto,
  UpdateVorMaterialDto,
  VorMaterialsFilters,
  SupplierNameOption
} from '../model/types'

// Получение всех материалов для работы ВОР
export const getVorMaterials = async (filters: VorMaterialsFilters): Promise<VorMaterial[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  let query = supabase
    .from('vor_materials')
    .select(`
      *,
      units:unit_id(id, name)
    `)

  if (filters.vor_work_id) {
    query = query.eq('vor_work_id', filters.vor_work_id)
  }

  if (filters.vor_id) {
    // Для загрузки всех материалов ВОР через join с vor_works
    query = query
      .select(`
        *,
        units:unit_id(id, name),
        vor_works!inner(vor_id)
      `)
      .eq('vor_works.vor_id', filters.vor_id)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) {
    console.error('Ошибка загрузки материалов ВОР:', error)
    throw error
  }

  return data || []
}

// Создание нового материала
export const createVorMaterial = async (materialData: CreateVorMaterialDto): Promise<VorMaterial> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  // Если не указан sort_order, получаем максимальный + 1 для данной работы
  if (materialData.sort_order === undefined) {
    const { data: maxOrder } = await supabase
      .from('vor_materials')
      .select('sort_order')
      .eq('vor_work_id', materialData.vor_work_id)
      .order('sort_order', { ascending: false })
      .limit(1)
      .single()

    materialData.sort_order = (maxOrder?.sort_order || 0) + 1
  }

  const { data, error } = await supabase
    .from('vor_materials')
    .insert(materialData)
    .select(`
      *,
      units:unit_id(id, name)
    `)
    .single()

  if (error) {
    console.error('Ошибка создания материала ВОР:', error)
    throw error
  }

  return data
}

// Обновление материала
export const updateVorMaterial = async (id: string, materialData: UpdateVorMaterialDto): Promise<VorMaterial> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { data, error } = await supabase
    .from('vor_materials')
    .update(materialData)
    .eq('id', id)
    .select(`
      *,
      units:unit_id(id, name)
    `)
    .single()

  if (error) {
    console.error('Ошибка обновления материала ВОР:', error)
    throw error
  }

  return data
}

// Удаление материала
export const deleteVorMaterial = async (id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { error } = await supabase
    .from('vor_materials')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Ошибка удаления материала ВОР:', error)
    throw error
  }
}

// Массовое удаление материалов
export const deleteVorMaterials = async (ids: string[]): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { error } = await supabase
    .from('vor_materials')
    .delete()
    .in('id', ids)

  if (error) {
    console.error('Ошибка массового удаления материалов ВОР:', error)
    throw error
  }
}

// Удаление всех материалов для работы
export const deleteVorMaterialsByWorkId = async (vor_work_id: string): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const { error } = await supabase
    .from('vor_materials')
    .delete()
    .eq('vor_work_id', vor_work_id)

  if (error) {
    console.error('Ошибка удаления материалов работы ВОР:', error)
    throw error
  }
}

// Обновление порядка сортировки материалов
export const updateVorMaterialsOrder = async (updates: Array<{ id: string; sort_order: number }>): Promise<void> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  for (const update of updates) {
    const { error } = await supabase
      .from('vor_materials')
      .update({ sort_order: update.sort_order })
      .eq('id', update.id)

    if (error) {
      console.error('Ошибка обновления порядка материалов ВОР:', error)
      throw error
    }
  }
}

// Получение названий поставщиков/материалов для автокомплита
export const getSupplierNamesOptions = async (searchTerm?: string): Promise<SupplierNameOption[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  let query = supabase
    .from('supplier_names')
    .select('id, name')
    .order('name', { ascending: true })

  if (searchTerm) {
    query = query.ilike('name', `%${searchTerm}%`)
    // При поиске увеличиваем лимит для лучших результатов
    query = query.limit(1000)
  } else {
    // Без поиска показываем первые 200 записей для начальной загрузки
    query = query.limit(200)
  }

  const { data, error } = await query

  if (error) {
    console.error('Ошибка загрузки названий поставщиков:', error)
    throw error
  }

  return data || []
}