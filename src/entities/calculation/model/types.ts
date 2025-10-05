// ========================================
// Типы для модуля "Расчет по типам"
// ========================================

// Справочник типов поверхностей
export interface SurfaceType {
  id: string
  name: string
  created_at: string
  updated_at: string
}

// Строка расчета (табличная часть)
export interface TypeCalculationRow {
  id: string
  finishing_pie_id: string
  finishing_pie_name?: string
  block_id: string | null
  block_name?: string
  location_id: number | null
  location_name?: string
  room_type_id: number | null
  room_type_name?: string
  pie_type_id: string | null
  pie_type_name?: string
  surface_type_id: string | null
  surface_type_name?: string
  floors?: TypeCalculationFloor[]
  // Поля для работ (из type_calculation_work_mapping)
  detail_cost_category_id?: number | null
  detail_cost_category_name?: string
  work_set?: string // Получается из rates.work_set по rate_id
  rate_id?: string | null
  rate_name?: string // work_name из rates
}

// Привязка этажей к строке расчета
export interface TypeCalculationFloor {
  type_calculation_mapping_id: string
  floor_number: number
  quantitySpec: number | null
  quantityRd: number | null
}

// Маппинг работ для расчета по типам
export interface TypeCalculationWorkMapping {
  type_calculation_mapping_id: string
  detail_cost_category_id: number | null
  rate_id: string | null
}

// ========================================
// DTO для создания и обновления
// ========================================

export interface CreateSurfaceTypeDto {
  name: string
}

export interface UpdateSurfaceTypeDto {
  name?: string
}

export interface CreateTypeCalculationRowDto {
  finishing_pie_id: string
  block_id?: string | null
  location_id?: number | null
  room_type_id?: number | null
  pie_type_id?: string | null
  surface_type_id?: string | null
}

export interface UpdateTypeCalculationRowDto {
  block_id?: string | null
  location_id?: number | null
  room_type_id?: number | null
  pie_type_id?: string | null
  surface_type_id?: string | null
}

export interface CreateTypeCalculationFloorDto {
  type_calculation_mapping_id: string
  floor_number: number
  quantitySpec?: number | null
  quantityRd?: number | null
}

export interface UpdateTypeCalculationFloorDto {
  quantitySpec?: number | null
  quantityRd?: number | null
}
