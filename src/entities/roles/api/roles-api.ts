import { supabase } from '@/lib/supabase'
import type { Role, CreateRoleDto, UpdateRoleDto, UserRole } from '../model/types'

export async function getRoles(): Promise<Role[]> {
  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('access_level', { ascending: false })
    .order('name')

  if (error) throw error
  return data || []
}

export async function getRoleById(roleId: string): Promise<Role | null> {
  const { data, error } = await supabase.from('roles').select('*').eq('id', roleId).maybeSingle()

  if (error) throw error
  return data
}

export async function createRole(dto: CreateRoleDto): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .insert([
      {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        access_level: dto.access_level || 0,
        color: dto.color || '#1890ff',
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateRole(roleId: string, dto: UpdateRoleDto): Promise<Role> {
  const { data, error } = await supabase
    .from('roles')
    .update(dto)
    .eq('id', roleId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteRole(roleId: string): Promise<void> {
  const { error } = await supabase.from('roles').delete().eq('id', roleId)

  if (error) throw error
}

export async function assignRoleToUser(
  userId: string,
  roleId: string,
  assignedBy?: string
): Promise<void> {
  const { error } = await supabase.from('users_roles_mapping').insert([
    {
      user_id: userId,
      role_id: roleId,
      assigned_by: assignedBy,
    },
  ])

  if (error) throw error
}

export async function removeRoleFromUser(userId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('users_roles_mapping')
    .delete()
    .eq('user_id', userId)
    .eq('role_id', roleId)

  if (error) throw error
}

export async function getUserRoles(userId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from('users_roles_mapping')
    .select('roles(*)')
    .eq('user_id', userId)

  if (error) throw error
  return (data || []).map((item) => (item as any).roles).filter(Boolean)
}

export async function getUsersWithRole(roleId: string): Promise<UserRole[]> {
  const { data, error } = await supabase
    .from('users_roles_mapping')
    .select('*')
    .eq('role_id', roleId)

  if (error) throw error
  return data || []
}
