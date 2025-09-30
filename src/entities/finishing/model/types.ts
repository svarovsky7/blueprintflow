// Тип пирога отделки (заголовок документа)
export interface FinishingPieType {
  id: string
  project_id: string
  name: string
  created_at: string
  updated_at: string
}

// Строка табличной части типа пирога отделки
export interface FinishingPieRow {
  id: string
  pie_type_id: string
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

// DTO для создания типа пирога
export interface CreateFinishingPieTypeDto {
  project_id: string
  name: string
}

// DTO для обновления типа пирога
export interface UpdateFinishingPieTypeDto {
  name?: string
}

// DTO для создания строки табличной части
export interface CreateFinishingPieRowDto {
  pie_type_id: string
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