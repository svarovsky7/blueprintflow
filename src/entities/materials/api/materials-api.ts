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
      .select('uuid, name')
      .eq('name', name)
      .maybeSingle()

    if (error) {
      console.error('Failed to fetch material:', error)
      throw error
    }

    if (data) return data as Material

    const { data: inserted, error: insertError } = await supabase
      .from('materials')
      .insert({ name })
      .select('uuid, name')
      .single()

    if (insertError) {
      console.error('Failed to insert material:', insertError)
      throw insertError
    }

    return inserted as Material
  },
}
