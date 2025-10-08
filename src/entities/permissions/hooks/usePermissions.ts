import { useQuery } from '@tanstack/react-query'
import { getUserPermissions, checkPermission } from '../api/permissions-api'
import type { UserPermissions } from '../model/types'

export function usePermissions(userId: string | null) {
  return useQuery<UserPermissions>({
    queryKey: ['permissions', userId],
    queryFn: () => {
      if (!userId) return Promise.resolve({})
      return getUserPermissions(userId)
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useCheckPermission(
  userId: string | null,
  objectCode: string,
  action: 'view' | 'create' | 'edit' | 'delete'
) {
  return useQuery<boolean>({
    queryKey: ['permission-check', userId, objectCode, action],
    queryFn: () => {
      if (!userId) return Promise.resolve(false)
      return checkPermission(userId, objectCode, action)
    },
    enabled: !!userId && !!objectCode,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })
}

export function useHasPermission(permissions: UserPermissions | undefined, objectCode: string) {
  if (!permissions || !permissions[objectCode]) {
    return {
      canView: false,
      canCreate: false,
      canEdit: false,
      canDelete: false,
      hasAnyPermission: false,
    }
  }

  const perms = permissions[objectCode]
  return {
    canView: perms.view,
    canCreate: perms.create,
    canEdit: perms.edit,
    canDelete: perms.delete,
    hasAnyPermission: perms.view || perms.create || perms.edit || perms.delete,
  }
}
