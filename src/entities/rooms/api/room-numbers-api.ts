import { supabase } from '@/lib/supabase'

export interface RoomNumber {
  id: string
  project_id: string
  name: string
  created_at: string
  updated_at: string
}

export async function getRoomNumbersByProject(projectId: string): Promise<RoomNumber[]> {
  const { data, error } = await supabase
    .from('room_numbers')
    .select('*')
    .eq('project_id', projectId)
    .order('name')

  if (error) throw error
  return data || []
}

export async function createRoomNumber(projectId: string, name: string): Promise<RoomNumber> {
  const { data, error } = await supabase
    .from('room_numbers')
    .insert([{ project_id: projectId, name }])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function getRoomNumberByNameAndProject(
  projectId: string,
  name: string
): Promise<RoomNumber | null> {
  const { data, error } = await supabase
    .from('room_numbers')
    .select('*')
    .eq('project_id', projectId)
    .eq('name', name)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getOrCreateRoomNumber(
  projectId: string,
  name: string
): Promise<RoomNumber> {
  const existing = await getRoomNumberByNameAndProject(projectId, name)
  if (existing) return existing

  return await createRoomNumber(projectId, name)
}
