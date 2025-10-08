import { ReactNode } from 'react'
import { Result, Button } from 'antd'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth'

interface RequirePermissionProps {
  children: ReactNode
  objectCode: string
  action?: 'view' | 'create' | 'edit' | 'delete'
  fallback?: ReactNode
}

export function RequirePermission({
  children,
  objectCode,
  action = 'view',
  fallback,
}: RequirePermissionProps) {
  const navigate = useNavigate()
  const hasPermission = useAuthStore((state) => state.hasPermission)

  const allowed = hasPermission(objectCode, action)

  if (!allowed) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <Result
        status="403"
        title="403"
        subTitle="У вас нет прав для доступа к этой странице"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            На главную
          </Button>
        }
      />
    )
  }

  return <>{children}</>
}

interface CanProps {
  children: ReactNode
  objectCode: string
  action: 'view' | 'create' | 'edit' | 'delete'
  fallback?: ReactNode
}

export function Can({ children, objectCode, action, fallback = null }: CanProps) {
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const allowed = hasPermission(objectCode, action)

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
