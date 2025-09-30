import { supabase } from '@/lib/supabase'
import type {
  FinishingPieType,
  FinishingPieRow,
  CreateFinishingPieTypeDto,
  UpdateFinishingPieTypeDto,
  CreateFinishingPieRowDto,
  UpdateFinishingPieRowDto,
} from '../model/types'

// ========== CRUD для типов пирогов (заголовки документов) ==========

export async function getFinishingPieTypes(projectId: string): Promise<FinishingPieType[]> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .select('*')
    .eq('project_id', projectId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function getFinishingPieTypeById(id: string): Promise<FinishingPieType | null> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function createFinishingPieType(
  dto: CreateFinishingPieTypeDto
): Promise<FinishingPieType> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .insert([dto])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFinishingPieType(
  id: string,
  dto: UpdateFinishingPieTypeDto
): Promise<FinishingPieType> {
  const { data, error } = await supabase
    .from('finishing_pie_types')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFinishingPieType(id: string): Promise<void> {
  const { error } = await supabase.from('finishing_pie_types').delete().eq('id', id)

  if (error) throw error
}

// ========== CRUD для строк табличной части ==========

export async function getFinishingPieRows(pieTypeId: string): Promise<FinishingPieRow[]> {
  const { data, error } = await supabase
    .from('finishing_pie_mapping')
    .select(
      `
      *,
      materials:material_id (name),
      units:unit_id (name),
      rates:rate_id (work_name),
      rate_units:rate_unit_id (name)
    `
    )
    .eq('pie_type_id', pieTypeId)
    .order('created_at')

  if (error) throw error

  // Маппинг данных с join'ами
  return (
    data?.map((row: any) => ({
      id: row.id,
      pie_type_id: row.pie_type_id,
      material_id: row.material_id,
      material_name: row.materials?.name || null,
      unit_id: row.unit_id,
      unit_name: row.units?.name || null,
      consumption: row.consumption,
      rate_id: row.rate_id,
      rate_name: row.rates?.work_name || null,
      rate_unit_id: row.rate_unit_id,
      rate_unit_name: row.rate_units?.name || null,
      created_at: row.created_at,
      updated_at: row.updated_at,
    })) || []
  )
}

export async function createFinishingPieRow(
  dto: CreateFinishingPieRowDto
): Promise<FinishingPieRow> {
  const { data, error } = await supabase
    .from('finishing_pie_mapping')
    .insert([dto])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateFinishingPieRow(
  id: string,
  dto: UpdateFinishingPieRowDto
): Promise<FinishingPieRow> {
  const { data, error } = await supabase
    .from('finishing_pie_mapping')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteFinishingPieRow(id: string): Promise<void> {
  const { error } = await supabase.from('finishing_pie_mapping').delete().eq('id', id)

  if (error) throw error
}

// ========== Вспомогательные функции ==========

// Получить ед.изм. работы по ID расценки
export async function getRateUnitId(rateId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('rates')
    .select('unit_id')
    .eq('id', rateId)
    .single()

  if (error) throw error
  return data?.unit_id || null
}