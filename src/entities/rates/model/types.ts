// ============================================================================
// НОВЫЕ ТИПЫ (после рефакторинга rates → work_sets + work_set_rates)
// ============================================================================

export interface WorkSet {
  id: string
  name: string
  active: boolean
  created_at: string
  updated_at: string
}

export interface WorkSetRate {
  id: string
  work_set_id: string // FK на work_sets (UUID)
  work_name_id: string // FK на work_names (UUID)
  base_rate: number // Расценка БАЗОВАЯ
  unit_id: string | null // FK на units (UUID)
  active: boolean // Флаг активности расценки
  created_at: string
  updated_at: string
}

export interface WorkSetRateWithRelations extends WorkSetRate {
  work_set?: {
    id: string
    name: string
    active: boolean
  }
  work_name?: {
    id: string
    name: string
    unit_id: string | null
  }
  unit?: {
    id: string
    name: string
  }
  // Связанные категории затрат
  detail_cost_category?: {
    id: number
    name: string
    cost_category: {
      id: number
      name: string
      number: number
    }
  }
  detail_cost_category_id?: number
  cost_category?: {
    id: number
    name: string
    number: number
  }
  cost_category_id?: number
  // Дополнительные связи из work_set_rates_categories_mapping
  work_set_rates_categories_mapping?: Array<{
    detail_cost_category_id: number
    cost_category_id: number
  }>
}

export interface WorkSetRateExcelRow {
  'Категория затрат': string
  'Вид затрат': string
  'РАБОЧИЙ НАБОР': string
  'НАИМЕНОВАНИЕ РАБОТ УПРОЩЕННОЕ': string
  'Единица': string
  'Расценка БАЗОВАЯ': number
}

export interface WorkSetRateFormData {
  work_set_id?: string // Существующий набор работ (UUID)
  work_set_name?: string // Новый набор работ (создастся в work_sets)
  work_name_id?: string // Существующее наименование работы (UUID)
  work_name?: string // Новое наименование работы (создастся в work_names)
  base_rate: number
  unit_id?: string | null
  detail_cost_category_id?: number
  cost_category_id?: number
  active?: boolean
}

// ============================================================================
// СТАРЫЕ ТИПЫ (deprecated, для обратной совместимости)
// ============================================================================

/**
 * @deprecated Используйте WorkSetRate вместо Rate
 * Старая структура таблицы rates (до рефакторинга)
 */
export interface Rate {
  id: string
  work_name_id: string // FK на work_names (UUID)
  work_set?: string // РАБОЧИЙ НАБОР
  base_rate: number // Расценка БАЗОВАЯ
  unit_id?: string // Ед.изм.
  active: boolean // Флаг активности расценки
  created_at: string
  updated_at: string
}

/**
 * @deprecated Используйте WorkSetRateWithRelations вместо RateWithRelations
 */
export interface RateWithRelations extends Rate {
  work_name?: {
    id: string
    name: string
    unit_id: string | null
  }
  unit?: {
    id: string
    name: string
  }
  detail_cost_category?: {
    id: number
    name: string
    cost_category: {
      id: number
      name: string
      number: number
    }
  }
  detail_cost_category_id?: number
  cost_category?: {
    id: number
    name: string
    number: number
  }
  cost_category_id?: number
}

/**
 * @deprecated Используйте WorkSetRateExcelRow вместо RateExcelRow
 */
export interface RateExcelRow {
  'Категории затрат': string
  'Вид затрат': string
  'РАБОЧИЙ НАБОР': string
  'НАИМЕНОВАНИЕ РАБОТ': string
  'Ед.изм.': string
  'Расценка БАЗОВАЯ': number
}

/**
 * @deprecated Используйте WorkSetRateFormData вместо RateFormData
 */
export interface RateFormData {
  work_name_id?: string // Существующее наименование работы (UUID)
  work_name?: string // Новое наименование работы (создастся в work_names)
  work_set?: string
  base_rate: number
  unit_id?: string
  detail_cost_category_id?: number
  cost_category_id?: number
  active?: boolean
}
