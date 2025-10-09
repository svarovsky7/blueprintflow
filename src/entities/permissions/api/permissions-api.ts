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
  // Сначала проверяем, существует ли запись
  const { data: existing } = await supabase
    .from('permissions')
    .select('id')
    .eq('role_id', roleId)
    .eq('portal_object_id', objectId)
    .maybeSingle()

  if (existing) {
    // Если запись существует - обновляем
    const { data, error } = await supabase
      .from('permissions')
      .update(dto)
      .eq('role_id', roleId)
      .eq('portal_object_id', objectId)
      .select()
      .single()

    if (error) throw error
    return data
  } else {
    // Если записи нет - создаем новую
    const insertData = {
      role_id: roleId,
      portal_object_id: objectId,
      can_view: dto.can_view ?? false,
      can_create: dto.can_create ?? false,
      can_edit: dto.can_edit ?? false,
      can_delete: dto.can_delete ?? false,
    }

    const { data, error } = await supabase
      .from('permissions')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    return data
  }
}

export async function batchUpdatePermissions(
  updates: { roleId: string; objectId: string; data: UpdatePermissionDto }[]
): Promise<void> {
  // Получаем все существующие записи одним запросом
  const objectIds = updates.map((u) => u.objectId)
  const roleId = updates[0]?.roleId

  if (!roleId) return

  const { data: existing } = await supabase
    .from('permissions')
    .select('id, role_id, portal_object_id')
    .eq('role_id', roleId)
    .in('portal_object_id', objectIds)

  const existingMap = new Map(
    existing?.map((item) => [item.portal_object_id, item.id]) || []
  )

  // Разделяем на обновления и вставки
  const toUpdate: { id: string; data: UpdatePermissionDto }[] = []
  const toInsert: any[] = []

  updates.forEach((update) => {
    const existingId = existingMap.get(update.objectId)
    if (existingId) {
      toUpdate.push({ id: existingId, data: update.data })
    } else {
      toInsert.push({
        role_id: update.roleId,
        portal_object_id: update.objectId,
        can_view: update.data.can_view ?? false,
        can_create: update.data.can_create ?? false,
        can_edit: update.data.can_edit ?? false,
        can_delete: update.data.can_delete ?? false,
      })
    }
  })

  // Выполняем операции
  const promises: Promise<any>[] = []

  // Массовый insert для новых записей
  if (toInsert.length > 0) {
    promises.push(supabase.from('permissions').insert(toInsert))
  }

  // Для обновлений делаем отдельные update запросы (можно оптимизировать через RPC функцию)
  toUpdate.forEach((item) => {
    promises.push(
      supabase
        .from('permissions')
        .update({
          can_view: item.data.can_view ?? false,
          can_create: item.data.can_create ?? false,
          can_edit: item.data.can_edit ?? false,
          can_delete: item.data.can_delete ?? false,
        })
        .eq('id', item.id)
    )
  })

  const results = await Promise.all(promises)
  const errors = results.filter((r) => r.error).map((r) => r.error)

  if (errors.length > 0) {
    throw errors[0]
  }
}
