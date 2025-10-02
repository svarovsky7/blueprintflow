import { supabase } from '@/lib/supabase'
import type {
  SurfaceType,
  CreateSurfaceTypeDto,
  UpdateSurfaceTypeDto,
} from '../model/types'

// ========== CRUD для справочника типов поверхностей ==========

export async function getSurfaceTypes(): Promise<SurfaceType[]> {
  const { data, error } = await supabase
    .from('surface_types')
    .select('*')
    .order('name')

  if (error) throw error
  return data || []
}

export async function getSurfaceTypeById(id: string): Promise<SurfaceType | null> {
  const { data, error } = await supabase
    .from('surface_types')
    .select('*')
    .eq('id', id)
    .limit(1)

  if (error) throw error
  return data && data.length > 0 ? data[0] : null
}

export async function createSurfaceType(dto: CreateSurfaceTypeDto): Promise<SurfaceType> {
  const { data, error } = await supabase
    .from('surface_types')
    .insert([dto])
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function updateSurfaceType(
  id: string,
  dto: UpdateSurfaceTypeDto
): Promise<SurfaceType> {
  const { data, error } = await supabase
    .from('surface_types')
    .update({ ...dto, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .limit(1)

  if (error) throw error
  return data[0]
}

export async function deleteSurfaceType(id: string): Promise<void> {
  const { error } = await supabase.from('surface_types').delete().eq('id', id)

  if (error) throw error
}
