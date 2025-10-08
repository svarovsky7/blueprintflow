import { Tag } from 'antd'
import type { User } from '../model/types'

interface UserBadgeProps {
  user: User | null
  showStatus?: boolean
}

export function UserBadge({ user, showStatus = false }: UserBadgeProps) {
  if (!user) return null

  const displayName = user.display_name || `${user.first_name} ${user.last_name}`

  if (!showStatus) {
    return <span>{displayName}</span>
  }

  return (
    <Tag color={user.is_active ? 'green' : 'red'}>{user.is_active ? 'Активен' : 'Отключен'}</Tag>
  )
}
