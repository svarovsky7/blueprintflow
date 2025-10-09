import { useMemo } from 'react'
import { usePermissions } from './usePermissions'

export interface PagePermissions {
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  canExport: boolean
  canImport: boolean
  canAdmin: boolean
  isReadOnly: boolean
  hasAnyWritePermission: boolean
}

export function usePagePermissions(objectCode: string): PagePermissions {
  const permissions = usePermissions(objectCode)

  const computed = useMemo(() => {
    const isReadOnly = permissions.canView && !permissions.canCreate && !permissions.canEdit && !permissions.canDelete
    const hasAnyWritePermission = permissions.canCreate || permissions.canEdit || permissions.canDelete

    return {
      ...permissions,
      canExport: permissions.canView,
      canImport: permissions.canCreate,
      canAdmin: false,
      isReadOnly,
      hasAnyWritePermission,
    }
  }, [permissions])

  return computed
}
