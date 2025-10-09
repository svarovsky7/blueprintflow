import { supabase } from '@/lib/supabase'
import type {
  UserGroup,
  CreateUserGroupDto,
  UpdateUserGroupDto,
  UserGroupMember,
} from '../model/types'

export async function getUserGroups(): Promise<UserGroup[]> {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function getUserGroupById(groupId: string): Promise<UserGroup | null> {
  const { data, error } = await supabase
    .from('user_groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createUserGroup(dto: CreateUserGroupDto): Promise<UserGroup> {
  const { data, error } = await supabase
    .from('user_groups')
    .insert([
      {
        name: dto.name,
        code: dto.code,
        description: dto.description,
        color: dto.color || '#1890ff',
        parent_group_id: dto.parent_group_id,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateUserGroup(
  groupId: string,
  dto: UpdateUserGroupDto
): Promise<UserGroup> {
  const { data, error } = await supabase
    .from('user_groups')
    .update(dto)
    .eq('id', groupId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteUserGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('user_groups').delete().eq('id', groupId)

  if (error) throw error
}

export async function getUserGroupMembers(groupId: string): Promise<UserGroupMember[]> {
  const { data, error } = await supabase
    .from('users_groups_mapping')
    .select('*')
    .eq('group_id', groupId)

  if (error) throw error
  return data || []
}

export async function addUserToGroup(
  userId: string,
  groupId: string,
  assignedBy?: string
): Promise<void> {
  const insertData: any = {
    user_id: userId,
    group_id: groupId,
  }

  if (assignedBy) {
    insertData.assigned_by = assignedBy
  }

  const { error } = await supabase.from('users_groups_mapping').insert([insertData])

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

export async function getUserGroupsByUserId(userId: string): Promise<UserGroup[]> {
  const { data, error } = await supabase
    .from('users_groups_mapping')
    .select('user_groups(*)')
    .eq('user_id', userId)

  if (error) throw error
  return (data || []).map((item) => (item as any).user_groups).filter(Boolean)
}

export async function getAllUserGroupsMappings(): Promise<
  Array<{ user_id: string; group_id: string; group: UserGroup }>
> {
  const { data, error } = await supabase
    .from('users_groups_mapping')
    .select(
      `
      user_id,
      group_id,
      user_groups(id, name, code, description, color)
    `
    )
    .order('user_id', { ascending: true })

  if (error) throw error

  return (data || []).map((item: any) => ({
    user_id: item.user_id,
    group_id: item.group_id,
    group: item.user_groups,
  }))
}
