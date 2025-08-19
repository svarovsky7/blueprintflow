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