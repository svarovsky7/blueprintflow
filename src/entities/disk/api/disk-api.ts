import { supabase } from '@/lib/supabase'
import type { DiskSettings } from '../types'

export const diskApi = {
  async getSettings(): Promise<DiskSettings | null> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('disk_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Failed to fetch disk settings:', error)
      throw error
    }

    return data as DiskSettings | null
  },

  async upsertSettings(input: Partial<DiskSettings>): Promise<DiskSettings> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data: existing } = await supabase
      .from('disk_settings')
      .select('id')
      .single()

    const query = supabase.from('disk_settings')
    const { data, error } = existing
      ? await query.update(input).eq('id', existing.id).select().single()
      : await query.insert(input).select().single()

    if (error) {
      console.error('Failed to upsert disk settings:', error)
      throw error
    }

    return data as DiskSettings
  },

  async fillMappings(): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase.rpc('fill_storage_mappings')

    if (error) {
      console.error('Failed to fill storage mappings:', error)
      throw error
    }
  }
}
