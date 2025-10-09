import { supabase } from '@/lib/supabase'
import type { Role } from '@/entities/roles'
import type { User } from '../model/types'

export interface UserRoleMapping {
  user_id: string
  role_id: string
  user?: User
  role?: Role
}

export async function assignRoleToUser(userId: string, roleId: string): Promise<void> {
  const { error } = await supabase.from('users_roles_mapping').insert([
    {
      user_id: userId,
      role_id: roleId,
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

export async function getRoleUsers(roleId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users_roles_mapping')
    .select('users(*)')
    .eq('role_id', roleId)

  if (error) throw error
  return (data || []).map((item) => (item as any).users).filter(Boolean)
}

export async function getAllUserRolesMappings(): Promise<UserRoleMapping[]> {
  console.log('🔍 getAllUserRolesMappings called') // LOG
  const { data, error } = await supabase
    .from('users_roles_mapping')
    .select(
      `
      user_id,
      role_id,
      roles(id, name, code, access_level)
    `
    )
    .order('user_id', { ascending: true })

  console.log('🔍 Raw data from DB:', data) // LOG
  console.log('🔍 Error:', error) // LOG

  if (error) throw error

  const result = (data || []).map((item: any) => ({
    user_id: item.user_id,
    role_id: item.role_id,
    role: item.roles,
  }))

  console.log('🔍 Mapped result:', result) // LOG
  return result
}
