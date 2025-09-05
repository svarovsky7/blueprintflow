// Типы для комплектов шахматок

export interface ChessboardSetStatus {
  id: number
  name: string
  color: string // hex цвет для индикатора
  description?: string
  created_at: string
  updated_at: string
}

export interface ChessboardSetFilters {
  // Обязательные фильтры
  project_id: string
  documentation_id: string
  version_id: string
  
  // Опциональные фильтры
  tag_id?: number | null
  block_ids?: string[] | null
  cost_category_ids?: number[] | null
  cost_type_ids?: number[] | null
}

export interface ChessboardSet {
  id: string
  set_number: string // уникальный номер комплекта
  name?: string // название комплекта (опционально)
  
  // Фильтры (развернутые)
  project_id: string
  documentation_id: string
  version_id: string
  tag_id?: number | null
  block_ids?: string[] | null
  cost_category_ids?: number[] | null
  cost_type_ids?: number[] | null
  
  // Статус
  status_id: number
  
  // Метаданные
  created_by?: string | null
  created_at: string
  updated_at: string
  
  // Связанные данные (для отображения)
  project?: {
    id: string
    name: string
  }
  documentation?: {
    id: string
    code: string
    project_name?: string
  }
  version?: {
    id: string
    version_number: number
    issue_date?: string
  }
  tag?: {
    id: number
    name: string
    tag_number: number
  }
  status?: ChessboardSetStatus
  blocks?: Array<{
    id: string
    name: string
  }>
  cost_categories?: Array<{
    id: number
    name: string
    number?: number
  }>
  cost_types?: Array<{
    id: number
    name: string
  }>
}

// Тип для создания нового комплекта
export interface CreateChessboardSetRequest {
  name?: string
  filters: ChessboardSetFilters
  status_id: number
}

// Тип для обновления комплекта
export interface UpdateChessboardSetRequest {
  name?: string
  status_id?: number
}

// Тип для отображения в таблице
export interface ChessboardSetTableRow {
  id: string
  set_number: string
  name?: string
  project_name: string
  documentation_code: string
  version_number: number
  tag_name?: string
  block_names?: string
  cost_category_names?: string
  cost_type_names?: string
  status_name: string
  status_color: string
  created_at: string
  updated_at: string
}

// Фильтры для поиска комплектов
export interface ChessboardSetSearchFilters {
  project_id?: string
  documentation_id?: string
  status_id?: number
  tag_id?: number
  search?: string // поиск по номеру или названию комплекта
}