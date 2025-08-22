export interface Rate {
  id: string
  work_name: string // НАИМЕНОВАНИЕ РАБОТ (ключевое поле)
  work_set?: string // РАБОЧИЙ НАБОР
  base_rate: number // Расценка БАЗОВАЯ
  unit_id?: string // Ед.изм.
  detail_cost_category_id?: number // Вид затрат
  created_at: string
  updated_at: string
}

export interface RateWithRelations extends Rate {
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
  cost_categories?: Array<{
    id: number
    name: string
    number: number
  }>
}

export interface RateExcelRow {
  'Категории затрат': string
  'Вид затрат': string
  'РАБОЧИЙ НАБОР': string
  'НАИМЕНОВАНИЕ РАБОТ': string
  'Ед.изм.': string
  'Расценка БАЗОВАЯ': number
}

export interface RateFormData {
  work_name: string
  work_set?: string
  base_rate: number
  unit_id?: string
  detail_cost_category_id?: number
  cost_category_ids: number[]
}