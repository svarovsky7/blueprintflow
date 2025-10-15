// Тип цвета строки для визуальной маркировки
export type RowColor = '' | 'green' | 'yellow' | 'blue' | 'red'

// Документ типа пирога отделки (заголовок)
export interface FinishingPie {
  id: string
  project_id: string
  block_id: string | null
  name: string
  status_finishing_pie: string | null
  status_type_calculation: string | null
  cost_category_id: number | null // integer FK на cost_categories
  documentation_tag_id: number | null // integer FK на documentation_tags
  version_id: string | null // uuid FK на documentation_versions
  created_at: string
  updated_at: string
  // Дополнительные поля для отображения (загружаются через join)
  cost_category_name?: string
  documentation_code?: string
  documentation_name?: string
  version_number?: string
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
  nomenclature_id: string | null // FK на nomenclature (внутренняя номенклатура)
  nomenclature_name?: string // Название номенклатуры (для отображения)
  supplier_name_id: string | null // FK на supplier_names (номенклатура поставщика)
  supplier_name?: string // Наименование номенклатуры поставщика (для отображения)
  detail_cost_category_id: number | null // FK на detail_cost_categories (вид затрат)
  detail_cost_category_name?: string // Название вида затрат (для отображения)
  work_set_rate_id: string | null // FK на work_set_rates (расценка в наборе)
  work_name_id?: string // ID наименования работы (для отображения, из work_set_rates)
  work_name?: string // Название работы (для отображения, из work_set_rates)
  work_set?: string // Рабочий набор (для отображения, из work_sets)
  rate_unit_id: string | null // FK на units (единица измерения работы)
  rate_unit_name?: string // Название единицы измерения
  color?: RowColor // Цвет строки для визуальной маркировки
  created_at: string
  updated_at: string
}

// DTO для создания документа типа пирога
export interface CreateFinishingPieDto {
  project_id: string
  name: string
  cost_category_id: number
  documentation_tag_id: number
  version_id: string
}

// DTO для обновления документа типа пирога
export interface UpdateFinishingPieDto {
  name?: string
  block_id?: string | null
  status_finishing_pie?: string | null
  status_type_calculation?: string | null
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
  nomenclature_id: string | null // FK на nomenclature
  supplier_name_id: string | null // FK на supplier_names
  detail_cost_category_id: number | null // FK на вид затрат
  work_set_rate_id: string | null // FK на work_set_rates (расценка в наборе)
  rate_unit_id: string | null // FK на units
  color?: RowColor // Цвет строки для визуальной маркировки
}

// DTO для обновления строки табличной части
export interface UpdateFinishingPieRowDto {
  pie_type_id?: string | null
  material_id?: string | null
  unit_id?: string | null
  consumption?: number | null
  nomenclature_id?: string | null // FK на nomenclature
  supplier_name_id?: string | null // FK на supplier_names
  detail_cost_category_id?: number | null // FK на вид затрат
  work_set_rate_id?: string | null // FK на work_set_rates (расценка в наборе)
  rate_unit_id?: string | null // FK на units
  color?: RowColor // Цвет строки для визуальной маркировки
}

// Типы для импорта в Шахматку

// Ошибка валидации строки типа пирога
export interface ValidationError {
  rowNumber: number
  pieTypeName: string
  materialName: string
  unitName: string
  detailCostCategoryName: string
  missingFields: string[]
}

// Результат импорта в Шахматку
export interface ImportToChessboardResult {
  success: boolean
  validationError?: boolean
  set_id?: string | null
  set_number?: string | null
  set_name?: string | null
  created_rows?: number
  created_floor_mappings?: number
  excluded_rows?: number
  invalidRows?: ValidationError[]
  errors: string[]
  warnings: string[]
  message?: string
}