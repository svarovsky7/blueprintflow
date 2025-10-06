// Типы для работы с ВОР (Ведомость объема работ)

export interface VorWork {
  id: string
  vor_id: string
  rate_id: string
  work_set_rate_id: string | null // Связь с рабочим набором
  quantity: number
  coefficient: number
  base_rate: number | null
  sort_order: number
  is_modified: boolean // Отслеживание изменений: false - совпадает с комплектом шахматки, true - изменена или новая
  created_at: string
  updated_at: string
  // Связанные данные через JOIN
  rates?: {
    id: string
    work_name_id: string
    base_rate: number
    unit_id: string | null
    units?: {
      id: string
      name: string
    }
    work_names?: {
      id: string
      name: string
    }
  }
  // Данные рабочего набора
  work_set_rate?: {
    id: string
    work_set: string
  }
}

export interface VorMaterial {
  id: string
  vor_work_id: string
  supplier_material_name: string
  unit_id: string | null
  quantity: number
  price: number
  sort_order: number
  is_modified: boolean // Отслеживание изменений: false - совпадает с комплектом шахматки, true - изменена или новая
  created_at: string
  updated_at: string
  // Связанные данные
  units?: {
    id: string
    name: string
  }
}

// DTO для создания работы
export interface CreateVorWorkDto {
  vor_id: string
  rate_id: string
  work_set_rate_id?: string // Связь с рабочим набором
  quantity?: number
  coefficient?: number
  base_rate?: number
  sort_order?: number
  is_modified?: boolean
}

// DTO для обновления работы
export interface UpdateVorWorkDto {
  work_set_rate_id?: string // Связь с рабочим набором
  quantity?: number
  coefficient?: number
  base_rate?: number
  sort_order?: number
  is_modified?: boolean
}

// DTO для создания материала
export interface CreateVorMaterialDto {
  vor_work_id: string
  supplier_material_name: string
  unit_id?: string
  quantity?: number
  price?: number
  sort_order?: number
  is_modified?: boolean
}

// DTO для обновления материала
export interface UpdateVorMaterialDto {
  supplier_material_name?: string
  unit_id?: string
  quantity?: number
  price?: number
  sort_order?: number
  is_modified?: boolean
}

// Комбинированный тип для отображения в таблице
export interface VorTableItem {
  id: string
  type: 'work' | 'material'
  name: string
  unit: string
  quantity: number
  is_modified?: boolean // Отслеживание изменений строк

  // Для работ
  coefficient?: number
  work_price?: number // Расчетное поле: base_rate * coefficient
  work_total?: number // Расчетное поле: work_price * quantity
  base_rate?: number
  rate_id?: string
  work_set_rate_id?: string // Связь с рабочим набором
  work_set_name?: string // Название рабочего набора для отображения

  // Для материалов
  material_price?: number
  material_total?: number // Расчетное поле: material_price * quantity
  vor_work_id?: string

  // Служебные поля
  level: number // 1 для работ, 2 для материалов
  sort_order: number
  parent_id?: string // Для группировки материалов под работами
}

// Данные из справочников для выбора
export interface RateOption {
  id: string
  work_name_id: string
  work_name: string // Название из work_names
  base_rate: number
  unit_id: string | null
  unit_name?: string
  work_set?: string | null
}

export interface SupplierNameOption {
  id: string
  name: string
}

export interface UnitOption {
  id: string
  name: string
}

// Фильтры и параметры запросов
export interface VorWorksFilters {
  vor_id: string
}

export interface VorMaterialsFilters {
  vor_work_id?: string
  vor_id?: string // Для загрузки всех материалов ВОР
}

// Типы для работы с ВОР в комплектах шахматки
export interface CreateVorFromChessboardSetDto {
  name: string
  project_id: string
  set_id: string
  rate_coefficient?: number
}

export interface ChessboardSetVor {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface ChessboardSetWithVors {
  id: string
  name: string
  set_number: string
  project_id: string
  // ... другие поля комплекта
  vors?: ChessboardSetVor[] // Связанные ВОРы
}