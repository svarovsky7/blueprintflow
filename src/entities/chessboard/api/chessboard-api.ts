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

    const { quantityPd: _quantityPd, quantitySpec: _quantitySpec, quantityRd: _quantityRd, ...rest } =
      row as Record<string, unknown>
    void _quantityPd
    void _quantitySpec
    void _quantityRd
    const { data, error } = await supabase.from('chessboard').insert(rest).select()
    
    if (error) {
      console.error('Failed to create chessboard row:', error)
      throw error
    }
    
    return data[0] as ChessboardRow
  },

  async update(id: string, updates: Partial<ChessboardRow>) {
    if (!supabase) throw new Error('Supabase is not configured')

    const { quantityPd: _quantityPd, quantitySpec: _quantitySpec, quantityRd: _quantityRd, ...rest } =
      updates as Record<string, unknown>
    void _quantityPd
    void _quantitySpec
    void _quantityRd
    const { data, error } = await supabase
      .from('chessboard')
      .update(rest)
      .eq('id', id)
      .select()
    
    if (error) {
      console.error('Failed to update chessboard row:', error)
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