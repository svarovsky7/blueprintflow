import { Avatar } from 'antd'
import { UserOutlined } from '@ant-design/icons'
import type { User } from '../model/types'

interface UserAvatarProps {
  user: User | null
  size?: number | 'small' | 'default' | 'large'
}

export function UserAvatar({ user, size = 'default' }: UserAvatarProps) {
  if (!user) {
    return <Avatar size={size} icon={<UserOutlined />} />
  }

  const displayName = user.display_name || `${user.first_name} ${user.last_name}`
  const initials = `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()

  if (user.avatar_url) {
    return <Avatar size={size} src={user.avatar_url} alt={displayName} />
  }

  return <Avatar size={size}>{initials}</Avatar>
}
