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
  { key: 'documents/chessboard', label: 'Шахматка' },
  { key: 'documents/vor', label: 'ВОР' },
  { key: 'documents/documentation', label: 'Документация' },
  { key: 'documents/finishing', label: 'Отделка' },
  { key: 'reports/project-analysis', label: 'Анализ доков' },
] as const

export type PortalPageKey = (typeof PORTAL_PAGES)[number]['key']
