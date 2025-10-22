import { supabase } from '@/lib/supabase'
import type { ChessboardRow } from '../model/types'

export const chessboardApi = {
  async getAll(projectId?: string) {
    if (!supabase) throw new Error('Supabase is not configured')

    let query = supabase.from('chessboard').select('*')

    if (projectId) {
      query = query.eq('project_id', projectId)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch chessboard data:', error)
      throw error
    }

    return data as ChessboardRow[]
  },

  async create(row: Partial<ChessboardRow>) {
    if (!supabase) throw new Error('Supabase is not configured')

    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id


    const {
      quantityPd: _quantityPd,
      quantitySpec: _quantitySpec,
      quantityRd: _quantityRd,
      ...rest
    } = row as Record<string, unknown>
    void _quantityPd
    void _quantitySpec
    void _quantityRd

    // Добавляем поля авторов в данные для вставки
    const dataToInsert = {
      ...rest,
      created_by: currentUserId,
      updated_by: currentUserId,
    }


    const { data, error } = await supabase.from('chessboard').insert(dataToInsert).select()

    if (error) {
      throw error
    }

    return data[0] as ChessboardRow
  },

  async update(id: string, updates: Partial<ChessboardRow>) {
    if (!supabase) throw new Error('Supabase is not configured')

    // Получаем текущего пользователя
    const { data: { user } } = await supabase.auth.getUser()
    const currentUserId = user?.id


    const {
      quantityPd: _quantityPd,
      quantitySpec: _quantitySpec,
      quantityRd: _quantityRd,
      workName: _workName,
      ...rest
    } = updates as Record<string, unknown>
    void _quantityPd
    void _quantitySpec
    void _quantityRd
    void _workName

    // Добавляем поле updated_by в данные для обновления
    const dataToUpdate = {
      ...rest,
      updated_by: currentUserId,
    }


    const { data, error } = await supabase.from('chessboard').update(dataToUpdate).eq('id', id).select()

    if (error) {
      throw error
    }

    return data[0] as ChessboardRow
  },

  async delete(id: string) {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase.from('chessboard').delete().eq('id', id)

    if (error) {
      console.error('Failed to delete chessboard row:', error)
      throw error
    }
  },
}
