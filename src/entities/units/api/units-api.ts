import { supabase } from '@/lib/supabase'
import type { Unit, UnitSynonym, UnitWithSynonyms, UnitFormData, UnitSynonymFormData } from '../model/types'

export const unitsApi = {
  async getAll(): Promise<Unit[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('units')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to get units:', error)
      throw error
    }

    return data as Unit[]
  },

  async getAllWithSynonyms(): Promise<UnitWithSynonyms[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('units')
      .select(`
        *,
        synonyms:unit_synonyms(*)
      `)
      .order('name', { ascending: true })

    if (error) {
      console.error('Failed to get units with synonyms:', error)
      throw error
    }

    return data as UnitWithSynonyms[]
  },

  async create(data: UnitFormData): Promise<Unit> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data: unit, error } = await supabase
      .from('units')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Failed to create unit:', error)
      throw error
    }

    return unit as Unit
  },

  async update(id: string, data: UnitFormData): Promise<Unit> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data: unit, error } = await supabase
      .from('units')
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update unit:', error)
      throw error
    }

    return unit as Unit
  },

  async delete(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete unit:', error)
      throw error
    }
  },

  // Методы для работы с синонимами
  async getSynonyms(unitId: string): Promise<UnitSynonym[]> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('unit_synonyms')
      .select('*')
      .eq('unit_id', unitId)
      .order('synonym', { ascending: true })

    if (error) {
      console.error('Failed to get unit synonyms:', error)
      throw error
    }

    return data as UnitSynonym[]
  },

  async addSynonym(data: UnitSynonymFormData): Promise<UnitSynonym> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data: synonym, error } = await supabase
      .from('unit_synonyms')
      .insert(data)
      .select()
      .single()

    if (error) {
      console.error('Failed to create unit synonym:', error)
      throw error
    }

    return synonym as UnitSynonym
  },

  async deleteSynonym(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { error } = await supabase
      .from('unit_synonyms')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete unit synonym:', error)
      throw error
    }
  },

  // Метод для поиска единицы по синониму (для импорта)
  async findUnitBySynonym(synonym: string): Promise<Unit | null> {
    if (!supabase) throw new Error('Supabase is not configured')

    // Сначала ищем точное совпадение по основному названию
    const { data: directMatch } = await supabase
      .from('units')
      .select('*')
      .ilike('name', synonym)
      .single()

    if (directMatch) {
      return directMatch as Unit
    }

    // Если не найдено, ищем по синонимам
    const { data, error } = await supabase
      .from('unit_synonyms')
      .select(`
        unit:units(*)
      `)
      .ilike('synonym', synonym)
      .single()

    if (error || !data) {
      return null
    }

    return data.unit as Unit
  },

  // Метод для получения всех синонимов (для импорта)
  async getAllSynonymsFlat(): Promise<Array<{ unitId: string; unitName: string; synonym: string }>> {
    if (!supabase) throw new Error('Supabase is not configured')

    const { data, error } = await supabase
      .from('unit_synonyms')
      .select(`
        unit_id,
        synonym,
        unit:units(name)
      `)

    if (error) {
      console.error('Failed to get all synonyms:', error)
      throw error
    }

    return data.map(item => ({
      unitId: item.unit_id,
      unitName: item.unit?.name || '',
      synonym: item.synonym
    }))
  }
}