export interface Documentation {
  id: string // UUID
  code: string
  stage?: 'П' | 'Р' | null   // Стадия проектирования
  tag_id: number | null
  color?: string | null      // Цвет строки
  created_at: string
  updated_at: string
  // Relations
  tag?: DocumentationTag
  versions?: DocumentationVersion[]
  comments?: Comment[]
  // Данные из таблицы маппинга
  project_mappings?: Array<{
    project?: Project
    block?: Block
  }>
}

export interface DocumentationVersion {
  id: string // UUID
  documentation_id: string // UUID
  version_number: number
  issue_date: string | null
  file_url: string | null
  status: 'filled_recalc' | 'filled_spec' | 'not_filled' | 'vor_created'
  created_at: string
  updated_at: string
  // Relations
  documentation?: Documentation
  comments?: Comment[]
}

export interface Comment {
  id: string // UUID
  comment_text: string
  author_id: number | null
  created_at: string
  updated_at: string
}

export interface DocumentationTag {
  id: number
  tag_number: number
  name: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string  // UUID
  name: string
  code?: string
  address?: string
}

export interface Block {
  id: string  // UUID
  name: string
  bottom_underground_floor?: number
  top_ground_floor?: number
}

// Import types
export interface DocumentationImportRow {
  tag: string // Раздел
  code: string // Шифр проекта  
  version_number: number // Номер версии
  issue_date?: string // Дата выдачи версии
  file_url?: string // Ссылка на документ
  project_id?: string // ID проекта
  block_id?: string // ID корпуса
  stage?: 'П' | 'Р' // Стадия документа
}

// Display types
export interface DocumentationTableRow {
  id: string // Уникальный ключ для React
  documentation_id: string // UUID
  stage?: 'П' | 'Р' | null   // Стадия проектирования
  tag_name: string
  tag_number: number
  project_code: string
  version_count: number
  versions: DocumentationVersion[]
  selected_version?: number // Выбранная версия для отображения
  selected_version_id?: string // ID выбранной версии (для случаев когда все версии имеют одинаковый номер)
  comments: string
  project_id: string | null  // UUID
  block_id: string | null    // UUID
  color?: string // Цвет строки
  isNew?: boolean // Признак новой записи
  // Поля для новых версий
  new_version_number?: number
  new_issue_date?: string
  new_file_url?: string
  new_status?: DocumentationVersion['status']
}

// Filter types
export interface DocumentationFilters {
  project_id?: string  // UUID
  tag_id?: number
  block_id?: string     // UUID
  stage?: 'П' | 'Р'     // Стадия документа
  status?: string
  show_latest_only?: boolean
}

// Column settings
export interface DocumentationColumnSettings {
  visible: {
    tag: boolean
    code: boolean
    version_count: boolean // Теперь это столбец "Версия"
    comments: boolean
  }
  order: string[]
}

export const STATUS_COLORS = {
  filled_recalc: '#52c41a', // green
  filled_spec: '#faad14', // yellow
  not_filled: '#ff4d4f', // red
  vor_created: '#1890ff', // blue
} as const

export const STATUS_LABELS = {
  filled_recalc: 'Данные заполнены по пересчету РД',
  filled_spec: 'Данные заполнены по спеке РД',
  not_filled: 'Данные не заполнены',
  vor_created: 'Созданы ВОР',
} as const

// Import conflict types
export interface ImportConflict {
  row: DocumentationImportRow
  existingData: Documentation & {
    tag?: DocumentationTag
    versions?: DocumentationVersion[]
  }
  index: number
}

export type ConflictResolution = 'accept' | 'skip'

export interface ConflictResolutionState {
  acceptAll: boolean
  skipAll: boolean
  resolutions: Map<number, ConflictResolution>
}