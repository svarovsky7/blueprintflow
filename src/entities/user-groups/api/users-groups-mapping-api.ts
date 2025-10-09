import { supabase } from '@/lib/supabase'
import type { UserGroup } from '../model/types'
import type { User } from '@/entities/users'

export interface UserGroupMembership {
  user_id: string
  group_id: string
  user?: User
  group?: UserGroup
}

export async function addUserToGroup(userId: string, groupId: string): Promise<void> {
  const { error } = await supabase.from('users_groups_mapping').insert([
    {
      user_id: userId,
      group_id: groupId,
    },
  ])

  if (error) throw error
}

export async function removeUserFromGroup(userId: string, groupId: string): Promise<void> {
  const { error } = await supabase
    .from('users_groups_mapping')
    .delete()
    .eq('user_id', userId)
    .eq('group_id', groupId)

  if (error) throw error
}

export async function getUserGroups(userId: string): Promise<UserGroup[]> {
  const { data, error } = await supabase
    .from('users_groups_mapping')
    .select('user_groups(*)')
    .eq('user_id', userId)

  if (error) throw error
  return (data || []).map((item) => (item as any).user_groups).filter(Boolean)
}

export async function getGroupUsers(groupId: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('users_groups_mapping')
    .select('users(*)')
    .eq('group_id', groupId)

  if (error) throw error
  return (data || []).map((item) => (item as any).users).filter(Boolean)
}

export async function getAllUserGroupsMemberships(): Promise<UserGroupMembership[]> {
  const { data, error } = await supabase
    .from('users_groups_mapping')
    .select(
      `
      user_id,
      group_id,
      users(id, first_name, last_name, middle_name, position, is_active),
      user_groups(id, name, code, color)
    `
    )
    .order('group_id', { ascending: true })

  if (error) throw error

  return (data || []).map((item: any) => ({
    user_id: item.user_id,
    group_id: item.group_id,
    user: item.users,
    group: item.user_groups,
  }))
}
