export interface UserGroup {
  id: string
  name: string
  code: string
  description?: string | null
  color: string
  parent_group_id?: string | null
  is_active: boolean
  is_system: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
  updated_by?: string | null
}

export interface UserGroupWithMembers extends UserGroup {
  member_count?: number
}

export interface CreateUserGroupDto {
  name: string
  code: string
  description?: string
  color?: string
  parent_group_id?: string
}

export interface UpdateUserGroupDto {
  name?: string
  code?: string
  description?: string
  color?: string
  parent_group_id?: string
}

export interface UserGroupMember {
  user_id: string
  group_id: string
  assigned_at: string
  assigned_by?: string | null
}
