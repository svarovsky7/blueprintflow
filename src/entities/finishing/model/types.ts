// Документ типа пирога отделки (заголовок)
export interface FinishingPie {
  id: string
  project_id: string
  block_id: string | null
  name: string
  created_at: string
  updated_at: string
}

// Старый интерфейс (для обратной совместимости)
export interface FinishingPieType extends FinishingPie {}

// Строка табличной части типа пирога отделки
export interface FinishingPieRow {
  id: string
  finishing_pie_id: string
  material_id: string | null
  material_name?: string
  unit_id: string | null
  unit_name?: string
  consumption: number | null
  rate_id: string | null
  rate_name?: string
  rate_unit_id: string | null
  rate_unit_name?: string
  created_at: string
  updated_at: string
}

// DTO для создания документа типа пирога
export interface CreateFinishingPieDto {
  project_id: string
  block_id?: string | null
  name: string
}

// DTO для обновления документа типа пирога
export interface UpdateFinishingPieDto {
  name?: string
  block_id?: string | null
}

// Старые интерфейсы (для обратной совместимости)
export interface CreateFinishingPieTypeDto extends CreateFinishingPieDto {}
export interface UpdateFinishingPieTypeDto extends UpdateFinishingPieDto {}

// DTO для создания строки табличной части
export interface CreateFinishingPieRowDto {
  finishing_pie_id: string
  material_id: string | null
  unit_id: string | null
  consumption: number | null
  rate_id: string | null
  rate_unit_id: string | null
}

// DTO для обновления строки табличной части
export interface UpdateFinishingPieRowDto {
  material_id?: string | null
  unit_id?: string | null
  consumption?: number | null
  rate_id?: string | null
  rate_unit_id?: string | null
}