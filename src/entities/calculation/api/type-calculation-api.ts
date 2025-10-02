import { supabase } from '@/lib/supabase'
import type {
  TypeCalculationRow,
  CreateTypeCalculationRowDto,
  UpdateTypeCalculationRowDto,
} from '../model/types'

// ========== CRUD для строк расчета ==========

export async function getTypeCalculationRows(
  finishingPieId: string
): Promise<TypeCalculationRow[]> {
  const { data, error } = await supabase
    .from('type_calculation_mapping')
    .select(
      `
      *,
      blocks:block_id (name),
      location:location_id (name),
      type_rooms:room_type_id (name),
      finishing_pie_types:pie_type_id (name),
      surface_types:surface_type_id (name),
      type_calculation_floor_mapping (
        type_calculation_mapping_id,
        floor_number,
        quantitySpec,
        quantityRd
      )
    `
    )
    .eq('finishing_pie_id', finishingPieId)
    .order('id')

  if (error) throw error

  return (
    data?.map((row: any) => ({
      id: row.id,
      finishing_pie_id: row.finishing_pie_id,
      block_id: row.block_id,
      block_name: row.blocks?.name || null,
      location_id: row.location_id,
      location_name: row.location?.name || null,
      room_type_id: row.room_type_id,
      room_type_name: row.type_rooms?.name || null,
      pie_type_id: row.pie_type_id,
      pie_type_name: row.finishing_pie_types?.name || null,
      surface_type_id: row.surface_type_id,
      surface_type_name: row.surface_types?.name || null,
      floors: row.type_calculation_floor_mapping || [],
    })) || []
  )
}

export async function createTypeCalculationRow(
  dto: CreateTypeCalculationRowDto
): Promise<TypeCalculationRow> {
  const { data, error } = await supabase
    .from('type_calculation_mapping')
    .insert([dto])
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function updateTypeCalculationRow(
  id: string,
  dto: UpdateTypeCalculationRowDto
): Promise<TypeCalculationRow> {
  const { data, error } = await supabase
    .from('type_calculation_mapping')
    .update(dto)
    .eq('id', id)
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function deleteTypeCalculationRow(id: string): Promise<void> {
  const { error } = await supabase.from('type_calculation_mapping').delete().eq('id', id)

  if (error) throw error
}

// ========== CRUD для этажей ==========

export async function getTypeCalculationFloors(
  mappingId: string
): Promise<TypeCalculationFloor[]> {
  const { data, error } = await supabase
    .from('type_calculation_floor_mapping')
    .select('*')
    .eq('type_calculation_mapping_id', mappingId)
    .order('floor_number')

  if (error) throw error
  return data || []
}

export async function upsertTypeCalculationFloors(
  mappingId: string,
  floors: Array<{ floor_number: number; quantitySpec: number | null; quantityRd: number | null }>
): Promise<void> {
  // Сначала удаляем все существующие этажи для этой строки
  const { error: deleteError } = await supabase
    .from('type_calculation_floor_mapping')
    .delete()
    .eq('type_calculation_mapping_id', mappingId)

  if (deleteError) throw deleteError

  // Затем вставляем новые данные
  if (floors.length > 0) {
    const floorsToInsert = floors.map((floor) => ({
      type_calculation_mapping_id: mappingId,
      floor_number: floor.floor_number,
      quantitySpec: floor.quantitySpec,
      quantityRd: floor.quantityRd,
    }))

    const { error: insertError } = await supabase
      .from('type_calculation_floor_mapping')
      .insert(floorsToInsert)

    if (insertError) throw insertError
  }
}
