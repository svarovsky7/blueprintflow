import { supabase } from '@/lib/supabase'

export interface ChessboardType {
  id: string
  name: string
}

/**
 * Получить все типы для шахматки
 */
export async function getChessboardTypes(): Promise<ChessboardType[]> {
  const { data, error } = await supabase
    .from('chessboard_types')
    .select('id, name')
    .order('name')

  if (error) {
    console.error('Error fetching chessboard types:', error)
    throw error
  }

  return data || []
}

/**
 * Создать новый тип для шахматки
 */
export async function createChessboardType(name: string): Promise<ChessboardType> {
  const { data, error } = await supabase
    .from('chessboard_types')
    .insert([{ name }])
    .select()
    .single()

  if (error) {
    console.error('Error creating chessboard type:', error)
    throw error
  }

  return data
}

/**
 * Получить тип по имени (для проверки существования)
 */
export async function getChessboardTypeByName(name: string): Promise<ChessboardType | null> {
  const { data, error } = await supabase
    .from('chessboard_types')
    .select('id, name')
    .eq('name', name)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null
    }
    console.error('Error fetching chessboard type by name:', error)
    throw error
  }

  return data
}
