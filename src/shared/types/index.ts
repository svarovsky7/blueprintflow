// Common types used across the application
export interface BaseEntity {
  id: string
  created_at: string
  updated_at: string
}

export interface PaginationParams {
  page: number
  limit: number
  total?: number
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

// Document stages enum
export const DOCUMENT_STAGES = {
  P: 'П', // Проект
  R: 'Р', // Рабочий
} as const

export type DocumentStage = (typeof DOCUMENT_STAGES)[keyof typeof DOCUMENT_STAGES]

// Portal pages for status configuration
export const PORTAL_PAGES = [
  { key: 'documents/chessboard', label: 'Документы → Шахматка' },
  { key: 'documents/vor', label: 'Документы → ВОР' },
  { key: 'references/documentation', label: 'Справочники → Документация' },
  { key: 'references/units', label: 'Справочники → Единицы измерения' },
  { key: 'references/cost-categories', label: 'Справочники → Категории затрат' },
  { key: 'references/projects', label: 'Справочники → Проекты' },
  { key: 'references/locations', label: 'Справочники → Локализации' },
  { key: 'admin/documentation-tags', label: 'Администрирование → Тэги документации' },
  { key: 'admin/statuses', label: 'Администрирование → Статусы' },
] as const

export type PortalPageKey = (typeof PORTAL_PAGES)[number]['key']
