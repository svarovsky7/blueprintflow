// Документ типа пирога отделки (заголовок)
export interface FinishingPie {
  id: string
  project_id: string
  block_id: string | null
  name: string
  created_at: string
  updated_at: string
}

// Справочник типов пирогов отделки
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
  pie_type_id: string | null // FK на finishing_pie_types (тип строки)
  pie_type_name?: string // Название типа (для отображения)
  finishing_pie_id?: string // FK на finishing_pie (документ)
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
  finishing_pie_id: string // FK на документ
  pie_type_id: string | null // FK на тип
  material_id: string | null
  unit_id: string | null
  consumption: number | null
  rate_id: string | null
  rate_unit_id: string | null
}

// DTO для обновления строки табличной части
export interface UpdateFinishingPieRowDto {
  pie_type_id?: string | null
  material_id?: string | null
  unit_id?: string | null
  consumption?: number | null
  rate_id?: string | null
  rate_unit_id?: string | null
}