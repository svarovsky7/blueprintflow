// Типы для комплектов шахматок

export interface ChessboardSetStatus {
  id: string // UUID из таблицы statuses
  name: string
  color?: string // hex цвет для индикатора
  is_active: boolean
  applicable_pages: string[] // массив страниц, где применяется статус
  created_at: string
  updated_at: string
}

// Документ в комплекте
export interface ChessboardSetDocument {
  documentation_id: string
  version_id: string
  order_index?: number
  // Дополнительные поля для отображения
  code?: string
  project_name?: string
  version_number?: number
  issue_date?: string
}

export interface ChessboardSetFilters {
  // Обязательные фильтры
  project_id: string
  
  // Новый формат - массив документов
  documents?: ChessboardSetDocument[] // Массив документов с версиями (неограниченное количество)
  
  // Старый формат для обратной совместимости (deprecated)
  documentation_id?: string
  version_id?: string

  // Опциональные фильтры
  tag_id?: number | null
  block_ids?: string[] | null
  cost_category_ids?: number[] | null
  cost_type_ids?: number[] | null
}

// Старый интерфейс для обратной совместимости (deprecated)
export interface ChessboardSetFiltersLegacy {
  project_id: string
  documentation_id: string
  version_id: string
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
  documents?: ChessboardSetDocument[] // Массив документов с версиями (новая структура)
  
  // Старые поля для обратной совместимости (deprecated)
  documentation_id?: string
  version_id?: string
  
  tag_id?: number | null
  block_ids?: string[] | null
  cost_category_ids?: number[] | null
  cost_type_ids?: number[] | null

  // Статус
  status_id?: string // UUID из таблицы statuses (может быть не назначен)
  status?: { // упрощенное представление статуса для отображения
    id: string
    name: string
    color?: string
  }

  // Метаданные
  created_by?: string | null
  created_at: string
  updated_at: string

  // Связанные данные (для отображения)
  project?: {
    id: string
    name: string
  }
  // Старые поля для обратной совместимости (deprecated)
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
  status_id?: string // UUID из таблицы statuses (опционально)
}

// Для обратной совместимости
export interface CreateChessboardSetRequestLegacy {
  name?: string
  filters: ChessboardSetFiltersLegacy
  status_id?: string
}

// Тип для обновления комплекта
export interface UpdateChessboardSetRequest {
  name?: string
  status_id?: string // UUID из таблицы statuses
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
  status_id?: string // UUID из таблицы statuses
  tag_id?: number
  search?: string // поиск по номеру или названию комплекта
}

// Типы для таблицы маппинга статусов
export interface ChessboardSetStatusMapping {
  chessboard_set_id: string
  status_id: string
  assigned_at: string
  assigned_by?: string | null
  comment?: string | null
  is_current: boolean
}

// Тип для истории статусов
export interface ChessboardSetStatusHistory {
  status_id: string
  status_name: string
  status_color?: string
  assigned_at: string
  assigned_by?: string | null
  comment?: string | null
  is_current: boolean
}

// Тип для добавления нового статуса
export interface AddChessboardSetStatusRequest {
  chessboard_set_id: string
  status_id: string
  comment?: string
  assigned_by?: string
}

// Расширенный тип комплекта с текущим статусом из маппинга
export interface ChessboardSetWithCurrentStatus extends Omit<ChessboardSet, 'status_id'> {
  documents?: ChessboardSetDocument[] // Убедимся, что есть поле documents
  current_status?: {
    status_id: string
    status_name: string
    status_color?: string
    assigned_at: string
    assigned_by?: string
    comment?: string
  }
  status_history?: ChessboardSetStatusHistory[]
}
