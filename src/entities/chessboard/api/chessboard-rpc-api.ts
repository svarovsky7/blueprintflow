import { supabase } from '@/lib/supabase'
import type { ChessboardRow } from '../model/types'

/**
 * API обертки над RPC функциями для Chessboard
 * Все операции защищены проверкой прав на уровне БД
 */

export interface ChessboardCreateParams {
  material: string
  quantity: number
  unit_id?: string | null
  project_id?: string | null
  block_id?: string | null
  cost_category_id?: string | null
  detail_cost_category_id?: string | null
  location_id?: string | null
  documentation_id?: string | null
  floor_id?: string | null
  room_id?: string | null
  rate_id?: string | null
  notes?: string | null
  color?: string | null
}

export interface ChessboardUpdateParams {
  id: string
  material?: string | null
  quantity?: number | null
  unit_id?: string | null
  project_id?: string | null
  block_id?: string | null
  cost_category_id?: string | null
  detail_cost_category_id?: string | null
  location_id?: string | null
  documentation_id?: string | null
  floor_id?: string | null
  room_id?: string | null
  rate_id?: string | null
  notes?: string | null
  color?: string | null
}

export interface BatchInsertResult {
  inserted_count: number
  failed_count: number
  errors: Array<{
    row: Record<string, unknown>
    error: string
  }>
}

/**
 * Создание записи в Chessboard через RPC
 * Проверяет права can_create на chessboard_page
 */
export async function createChessboardRowRPC(params: ChessboardCreateParams): Promise<ChessboardRow> {
  const { data, error } = await supabase.rpc('chessboard_create', {
    p_material: params.material,
    p_quantity: params.quantity,
    p_unit_id: params.unit_id || null,
    p_project_id: params.project_id || null,
    p_block_id: params.block_id || null,
    p_cost_category_id: params.cost_category_id || null,
    p_detail_cost_category_id: params.detail_cost_category_id || null,
    p_location_id: params.location_id || null,
    p_documentation_id: params.documentation_id || null,
    p_floor_id: params.floor_id || null,
    p_room_id: params.room_id || null,
    p_rate_id: params.rate_id || null,
    p_notes: params.notes || null,
    p_color: params.color || null,
  })

  if (error) {
    console.error('Ошибка создания записи Chessboard (RPC):', error)
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('RPC функция не вернула данные')
  }

  return data as ChessboardRow
}

/**
 * Обновление записи в Chessboard через RPC
 * Проверяет права can_edit на chessboard_page
 */
export async function updateChessboardRowRPC(params: ChessboardUpdateParams): Promise<ChessboardRow> {
  const { data, error } = await supabase.rpc('chessboard_update', {
    p_id: params.id,
    p_material: params.material !== undefined ? params.material : null,
    p_quantity: params.quantity !== undefined ? params.quantity : null,
    p_unit_id: params.unit_id !== undefined ? params.unit_id : null,
    p_project_id: params.project_id !== undefined ? params.project_id : null,
    p_block_id: params.block_id !== undefined ? params.block_id : null,
    p_cost_category_id: params.cost_category_id !== undefined ? params.cost_category_id : null,
    p_detail_cost_category_id: params.detail_cost_category_id !== undefined ? params.detail_cost_category_id : null,
    p_location_id: params.location_id !== undefined ? params.location_id : null,
    p_documentation_id: params.documentation_id !== undefined ? params.documentation_id : null,
    p_floor_id: params.floor_id !== undefined ? params.floor_id : null,
    p_room_id: params.room_id !== undefined ? params.room_id : null,
    p_rate_id: params.rate_id !== undefined ? params.rate_id : null,
    p_notes: params.notes !== undefined ? params.notes : null,
    p_color: params.color !== undefined ? params.color : null,
  })

  if (error) {
    console.error('Ошибка обновления записи Chessboard (RPC):', error)
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('RPC функция не вернула данные')
  }

  return data as ChessboardRow
}

/**
 * Удаление записи из Chessboard через RPC
 * Проверяет права can_delete на chessboard_page
 */
export async function deleteChessboardRowRPC(id: string): Promise<void> {
  const { data, error } = await supabase.rpc('chessboard_delete', {
    p_id: id,
  })

  if (error) {
    console.error('Ошибка удаления записи Chessboard (RPC):', error)
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Не удалось удалить запись')
  }
}

/**
 * Массовое создание записей (batch import)
 * Используется для импорта из Excel
 * Проверяет права can_create на chessboard_page
 */
export async function batchInsertChessboardRPC(
  rows: ChessboardCreateParams[]
): Promise<BatchInsertResult> {
  const { data, error } = await supabase.rpc('chessboard_batch_insert', {
    p_rows: rows,
  })

  if (error) {
    console.error('Ошибка массового создания записей Chessboard (RPC):', error)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    throw new Error('RPC функция не вернула результат')
  }

  const result = data[0]

  return {
    inserted_count: result.inserted_count,
    failed_count: result.failed_count,
    errors: result.errors || [],
  }
}
