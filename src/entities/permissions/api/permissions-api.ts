import { supabase } from '@/lib/supabase'
import type {
  Permission,
  CreatePermissionDto,
  UpdatePermissionDto,
  UserPermissionCache,
  UserPermissions,
} from '../model/types'

export async function getPermissions(): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPermissionsByRole(roleId: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('role_id', roleId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPermissionsByObject(objectId: string): Promise<Permission[]> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('portal_object_id', objectId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function getPermissionById(permissionId: string): Promise<Permission | null> {
  const { data, error } = await supabase
    .from('permissions')
    .select('*')
    .eq('id', permissionId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function createPermission(dto: CreatePermissionDto): Promise<Permission> {
  const { data, error } = await supabase
    .from('permissions')
    .insert([
      {
        role_id: dto.role_id,
        portal_object_id: dto.portal_object_id,
        can_view: dto.can_view || false,
        can_create: dto.can_create || false,
        can_edit: dto.can_edit || false,
        can_delete: dto.can_delete || false,
        conditions: dto.conditions,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updatePermission(
  permissionId: string,
  dto: UpdatePermissionDto
): Promise<Permission> {
  const { data, error } = await supabase
    .from('permissions')
    .update(dto)
    .eq('id', permissionId)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deletePermission(permissionId: string): Promise<void> {
  const { error } = await supabase.from('permissions').delete().eq('id', permissionId)

  if (error) throw error
}

export async function getUserPermissionsCache(userId: string): Promise<UserPermissionCache[]> {
  const { data, error } = await supabase
    .from('user_permissions_cache')
    .select('*')
    .eq('user_id', userId)

  if (error) throw error
  return data || []
}

export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  const cache = await getUserPermissionsCache(userId)

  const permissions: UserPermissions = {}
  cache.forEach((item) => {
    permissions[item.code] = {
      view: item.can_view,
      create: item.can_create,
      edit: item.can_edit,
      delete: item.can_delete,
    }
  })

  return permissions
}

export async function refreshPermissionsCache(): Promise<void> {
  const { error } = await supabase.rpc('refresh_user_permissions_cache')

  if (error) throw error
}

export async function checkPermission(
  userId: string,
  objectCode: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<boolean> {
  const { data, error } = await supabase
    .from('user_permissions_cache')
    .select(`can_${action}`)
    .eq('user_id', userId)
    .eq('code', objectCode)
    .maybeSingle()

  if (error) throw error
  if (!data) return false

  return data[`can_${action}`] || false
}

export async function createPermissionsForAllObjects(roleId: string): Promise<void> {
  const { data: objects, error: objectsError } = await supabase
    .from('portal_objects')
    .select('id')

  if (objectsError) throw objectsError

  if (!objects || objects.length === 0) return

  const permissions = objects.map((obj) => ({
    role_id: roleId,
    portal_object_id: obj.id,
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  }))

  const { error } = await supabase.from('permissions').insert(permissions)

  if (error) throw error
}

export async function updatePermissionByRoleAndObject(
  roleId: string,
  objectId: string,
  dto: UpdatePermissionDto
): Promise<Permission> {
  const { data, error } = await supabase
    .from('permissions')
    .update(dto)
    .eq('role_id', roleId)
    .eq('portal_object_id', objectId)
    .select()
    .single()

  if (error) throw error
  return data
}
