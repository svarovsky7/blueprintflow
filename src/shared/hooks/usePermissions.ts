import { useAuthStore } from '@/features/auth/model/auth-store'

export function usePermissions(objectCode: string) {
  const hasPermission = useAuthStore((state) => state.hasPermission)

  return {
    canView: hasPermission(objectCode, 'view'),
    canCreate: hasPermission(objectCode, 'create'),
    canEdit: hasPermission(objectCode, 'edit'),
    canDelete: hasPermission(objectCode, 'delete'),
  }
}
