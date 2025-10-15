import { supabase } from '@/lib/supabase'
import type { WorkSet } from '../model/types'

// ============================================================================
// CRUD для справочника наборов работ (work_sets)
// ============================================================================

/**
 * Получить все наборы работ
 * @param activeOnly - если true, вернет только активные наборы
 */
export async function getAllWorkSets(activeOnly = false): Promise<WorkSet[]> {
  let query = supabase.from('work_sets').select('*').order('name', { ascending: true })

  if (activeOnly) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    console.error('Ошибка загрузки наборов работ:', error)
    throw error
  }

  return data || []
}

/**
 * Получить набор работ по ID
 */
export async function getWorkSetById(id: string): Promise<WorkSet | null> {
  const { data, error } = await supabase.from('work_sets').select('*').eq('id', id).maybeSingle()

  if (error) {
    console.error('Ошибка загрузки набора работ:', error)
    throw error
  }

  return data
}

/**
 * Получить набор работ по имени
 */
export async function getWorkSetByName(name: string): Promise<WorkSet | null> {
  const { data, error } = await supabase.from('work_sets').select('*').eq('name', name).maybeSingle()

  if (error) {
    console.error('Ошибка поиска набора работ по имени:', error)
    throw error
  }

  return data
}

/**
 * Создать новый набор работ
 */
export async function createWorkSet(name: string, active = true): Promise<WorkSet> {
  const { data, error } = await supabase
    .from('work_sets')
    .insert([{ name, active }])
    .select()
    .single()

  if (error) {
    console.error('Ошибка создания набора работ:', error)
    throw error
  }

  return data
}

/**
 * Обновить набор работ
 */
export async function updateWorkSet(
  id: string,
  updates: { name?: string; active?: boolean }
): Promise<WorkSet> {
  const { data, error } = await supabase
    .from('work_sets')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Ошибка обновления набора работ:', error)
    throw error
  }

  return data
}

/**
 * Удалить набор работ (CASCADE - удалит все связанные расценки)
 */
export async function deleteWorkSet(id: string): Promise<void> {
  const { error } = await supabase.from('work_sets').delete().eq('id', id)

  if (error) {
    console.error('Ошибка удаления набора работ:', error)
    throw error
  }
}

/**
 * Получить или создать набор работ по имени (для импорта из Excel)
 * Если набор с таким именем существует - вернет его
 * Если не существует - создаст новый
 */
export async function getOrCreateWorkSet(name: string): Promise<WorkSet> {
  const trimmedName = name.trim()

  if (!trimmedName) {
    throw new Error('Название набора работ не может быть пустым')
  }

  const existing = await getWorkSetByName(trimmedName)

  if (existing) {
    return existing
  }

  return createWorkSet(trimmedName)
}

/**
 * Массовое создание наборов работ (для импорта)
 * Возвращает Map: название набора → ID
 */
export async function bulkGetOrCreateWorkSets(names: string[]): Promise<Map<string, string>> {
  const uniqueNames = Array.from(new Set(names.map(n => n.trim()).filter(Boolean)))
  const result = new Map<string, string>()

  for (const name of uniqueNames) {
    try {
      const workSet = await getOrCreateWorkSet(name)
      result.set(name, workSet.id)
    } catch (error) {
      console.error(`Ошибка создания набора работ "${name}":`, error)
      throw error
    }
  }

  return result
}

/**
 * Деактивировать набор работ (мягкое удаление)
 */
export async function deactivateWorkSet(id: string): Promise<WorkSet> {
  return updateWorkSet(id, { active: false })
}

/**
 * Активировать набор работ
 */
export async function activateWorkSet(id: string): Promise<WorkSet> {
  return updateWorkSet(id, { active: true })
}
