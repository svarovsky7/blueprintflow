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
      ),
      type_calculation_work_mapping (
        detail_cost_category_id,
        rate_id,
        detail_cost_categories (name),
        rates (work_name, work_set)
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
      // Поля работ из маппинга
      detail_cost_category_id: row.type_calculation_work_mapping?.detail_cost_category_id || null,
      detail_cost_category_name:
        row.type_calculation_work_mapping?.detail_cost_categories?.name || null,
      work_set: row.type_calculation_work_mapping?.rates?.work_set || null,
      rate_id: row.type_calculation_work_mapping?.rate_id || null,
      rate_name: row.type_calculation_work_mapping?.rates?.work_name || null,
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

// ========== Каскадные данные для работ ==========

// Получить виды затрат по категории затрат и локализации
export async function getDetailCostCategories(
  costCategoryId: number,
  locationId: number | null
): Promise<Array<{ id: number; name: string }>> {
  let query = supabase
    .from('detail_cost_categories')
    .select('id, name')
    .eq('cost_category_id', costCategoryId)

  if (locationId) {
    query = query.eq('location_id', locationId)
  }

  const { data, error } = await query.order('name')

  if (error) throw error
  return data || []
}

// Получить уникальные рабочие наборы по виду затрат
export async function getWorkSets(
  detailCostCategoryId: number
): Promise<Array<{ value: string; label: string }>> {
  // Используем подход из rates-api: получаем все rates с маппингом и фильтруем на клиенте
  const { data, error } = await supabase
    .from('rates')
    .select(
      `
      id,
      work_set,
      active,
      rates_detail_cost_categories_mapping(detail_cost_category_id)
    `
    )
    .eq('active', true) // Только активные расценки
    .not('work_set', 'is', null) // Только записи с заполненным work_set

  if (error) throw error

  if (!data || data.length === 0) {
    return []
  }

  // Фильтруем расценки по виду затрат
  const filteredRates = data.filter((rate) => {
    const categoryIds =
      rate.rates_detail_cost_categories_mapping?.map((m) => m.detail_cost_category_id) ?? []
    return categoryIds.includes(detailCostCategoryId)
  })

  // Получаем уникальные work_set
  const uniqueWorkSets = [...new Set(filteredRates.map((r) => r.work_set).filter(Boolean))]

  return uniqueWorkSets.sort().map((ws) => ({ value: ws, label: ws }))
}

// Получить работы по виду затрат и рабочему набору
export async function getRatesByWorkSet(
  detailCostCategoryId: number,
  workSet: string
): Promise<Array<{ id: string; work_name: string }>> {
  const { data: mappingData, error: mappingError } = await supabase
    .from('rates_detail_cost_categories_mapping')
    .select('rate_id')
    .eq('detail_cost_category_id', detailCostCategoryId)

  if (mappingError) throw mappingError

  const rateIds = mappingData?.map((m) => m.rate_id) || []

  if (rateIds.length === 0) return []

  const { data, error } = await supabase
    .from('rates')
    .select('id, work_name')
    .in('id', rateIds)
    .eq('work_set', workSet)
    .order('work_name')

  if (error) throw error
  return data || []
}

// ========== CRUD для маппинга работ ==========

export async function upsertTypeCalculationWorkMapping(
  mappingId: string,
  dto: { detail_cost_category_id: number | null; rate_id: string | null }
): Promise<void> {
  const { error } = await supabase
    .from('type_calculation_work_mapping')
    .upsert(
      {
        type_calculation_mapping_id: mappingId,
        detail_cost_category_id: dto.detail_cost_category_id,
        rate_id: dto.rate_id,
      },
      { onConflict: 'type_calculation_mapping_id' }
    )

  if (error) throw error
}
