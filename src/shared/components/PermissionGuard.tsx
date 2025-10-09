import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/model/auth-store'
import { Result, Button } from 'antd'
import { LockOutlined } from '@ant-design/icons'

interface PermissionGuardProps {
  children: ReactNode
  objectCode: string
  action?: 'view' | 'create' | 'edit' | 'delete'
  fallback?: ReactNode
}

export function PermissionGuard({
  children,
  objectCode,
  action = 'view',
  fallback,
}: PermissionGuardProps) {
  const { hasPermission, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const hasAccess = hasPermission(objectCode, action)

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Result
          status="403"
          title="Доступ запрещён"
          subTitle="У вас нет прав для просмотра этой страницы. Обратитесь к администратору."
          icon={<LockOutlined style={{ fontSize: 72, color: '#ff4d4f' }} />}
          extra={
            <Button type="primary" onClick={() => window.history.back()}>
              Назад
            </Button>
          }
        />
      </div>
    )
  }

  return <>{children}</>
}
