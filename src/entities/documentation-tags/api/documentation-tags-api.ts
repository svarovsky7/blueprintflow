import { supabase } from '@/lib/supabase'
import type {
  DocumentationTag,
  DocumentationTagCreateInput,
  DocumentationTagUpdateInput,
} from '../types'

export const documentationTagsApi = {
  async getAll() {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentation_tags')
      .select('*')
      .order('tag_number', { ascending: true })

    if (error) {
      console.error('Failed to fetch documentation tags:', error)
      throw error
    }

    return data as DocumentationTag[]
  },

  async getById(id: number) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentation_tags')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to fetch documentation tag:', error)
      throw error
    }

    return data as DocumentationTag
  },

  async create(input: DocumentationTagCreateInput) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentation_tags')
      .insert(input)
      .select()
      .single()

    if (error) {
      console.error('Failed to create documentation tag:', error)
      throw error
    }

    return data as DocumentationTag
  },

  async update(id: number, input: DocumentationTagUpdateInput) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { data, error } = await supabase
      .from('documentation_tags')
      .update(input)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update documentation tag:', error)
      throw error
    }

    return data as DocumentationTag
  },

  async delete(id: number) {
    if (!supabase) throw new Error('Supabase client not initialized')

    const { error } = await supabase
      .from('documentation_tags')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete documentation tag:', error)
      throw error
    }
  },
}