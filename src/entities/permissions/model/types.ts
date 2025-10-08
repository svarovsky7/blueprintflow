export interface Permission {
  id: string
  role_id: string
  portal_object_id: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  conditions?: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface PermissionWithDetails extends Permission {
  role_name?: string
  object_name?: string
  object_code?: string
}

export interface CreatePermissionDto {
  role_id: string
  portal_object_id: string
  can_view?: boolean
  can_create?: boolean
  can_edit?: boolean
  can_delete?: boolean
  conditions?: Record<string, any>
}

export interface UpdatePermissionDto {
  can_view?: boolean
  can_create?: boolean
  can_edit?: boolean
  can_delete?: boolean
  conditions?: Record<string, any>
}

export interface UserPermissionCache {
  user_id: string
  code: string
  route_path?: string | null
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
}

export interface UserPermissions {
  [objectCode: string]: {
    view: boolean
    create: boolean
    edit: boolean
    delete: boolean
  }
}
