export interface Role {
  id: string
  name: string
  code: string
  description?: string | null
  access_level: number
  color: string
  is_system: boolean
  created_at: string
  updated_at: string
}

export interface RoleWithPermissions extends Role {
  permissions_count?: number
}

export interface CreateRoleDto {
  name: string
  code: string
  description?: string
  access_level?: number
  color?: string
}

export interface UpdateRoleDto {
  name?: string
  code?: string
  description?: string
  access_level?: number
  color?: string
}

export interface UserRole {
  user_id: string
  role_id: string
  assigned_at: string
  assigned_by?: string | null
}
