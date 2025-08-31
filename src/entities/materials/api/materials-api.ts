import { supabase } from '@/lib/supabase'
import type { Material } from '../model/types'

export const materialsApi = {
  async getAll(): Promise<Material[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase.from('materials').select('uuid, name').order('name')

    if (error) {
      console.error('Failed to fetch materials:', error)
      throw error
    }

    return (data ?? []) as Material[]
  },

  async ensure(name: string): Promise<Material> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('materials')
      .upsert({ name }, { onConflict: 'name' })
      .select('uuid, name')
      .single()

    if (error) {
      console.error('Failed to upsert material:', error)
      throw error
    }

    return data as Material

  },
}
