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

export interface RateWithRelations extends Rate {
  work_name?: {
    id: string
    name: string
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

export interface RateExcelRow {
  'Категории затрат': string
  'Вид затрат': string
  'РАБОЧИЙ НАБОР': string
  'НАИМЕНОВАНИЕ РАБОТ': string
  'Ед.изм.': string
  'Расценка БАЗОВАЯ': number
}

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
