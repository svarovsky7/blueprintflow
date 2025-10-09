import { supabase } from '@/lib/supabase'
import type { Role } from '../model/types'
import type { UserGroup } from '@/entities/user-groups'

export interface GroupRoleMapping {
  group_id: string
  role_id: string
  group?: UserGroup
  role?: Role
}

export async function assignRoleToGroup(groupId: string, roleId: string): Promise<void> {
  const { error } = await supabase.from('groups_roles_mapping').insert([
    {
      group_id: groupId,
      role_id: roleId,
    },
  ])

  if (error) throw error
}

export async function removeRoleFromGroup(groupId: string, roleId: string): Promise<void> {
  const { error } = await supabase
    .from('groups_roles_mapping')
    .delete()
    .eq('group_id', groupId)
    .eq('role_id', roleId)

  if (error) throw error
}

export async function getGroupRoles(groupId: string): Promise<Role[]> {
  const { data, error } = await supabase
    .from('groups_roles_mapping')
    .select('roles(*)')
    .eq('group_id', groupId)

  if (error) throw error
  return (data || []).map((item) => (item as any).roles).filter(Boolean)
}

export async function getRoleGroups(roleId: string): Promise<UserGroup[]> {
  const { data, error } = await supabase
    .from('groups_roles_mapping')
    .select('user_groups(*)')
    .eq('role_id', roleId)

  if (error) throw error
  return (data || []).map((item) => (item as any).user_groups).filter(Boolean)
}

export async function getAllGroupRolesMappings(): Promise<GroupRoleMapping[]> {
  const { data, error } = await supabase
    .from('groups_roles_mapping')
    .select(
      `
      group_id,
      role_id,
      user_groups(id, name, code, color),
      roles(id, name, code, access_level)
    `
    )
    .order('group_id', { ascending: true })

  if (error) throw error

  return (data || []).map((item: any) => ({
    group_id: item.group_id,
    role_id: item.role_id,
    group: item.user_groups,
    role: item.roles,
  }))
}
