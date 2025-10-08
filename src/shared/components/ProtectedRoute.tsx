import { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { Spin } from 'antd'
import { useAuthStore } from '@/features/auth'

interface ProtectedRouteProps {
  children: ReactNode
  requireAuth?: boolean
}

export function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore()

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!requireAuth && isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
