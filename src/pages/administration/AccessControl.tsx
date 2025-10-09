import { useState, useEffect } from 'react'
import { Tabs } from 'antd'
import { UserOutlined, TeamOutlined, SafetyOutlined, UsergroupAddOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import UsersTab from './tabs/UsersTab'
import GroupsTab from './tabs/GroupsTab'
import UserRolesTab from './tabs/UserRolesTab'
import UserGroupsTab from './tabs/UserGroupsTab'

export default function AccessControl() {
  const [activeTab, setActiveTab] = useState('users')
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tab = params.get('tab')
    if (tab) {
      setActiveTab(tab)
    }
  }, [location.search])

  const handleTabChange = (key: string) => {
    setActiveTab(key)
    navigate(`?tab=${key}`, { replace: true })
  }

  const tabs = [
    {
      key: 'users',
      label: 'Пользователи',
      icon: <UserOutlined />,
      children: <UsersTab />,
    },
    {
      key: 'groups',
      label: 'Группы',
      icon: <TeamOutlined />,
      children: <GroupsTab />,
    },
    {
      key: 'user-roles',
      label: 'Назначение ролей',
      icon: <SafetyOutlined />,
      children: <UserRolesTab />,
    },
    {
      key: 'user-groups',
      label: 'Состав групп',
      icon: <UsergroupAddOutlined />,
      children: <UserGroupsTab />,
    },
  ]

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <h1 style={{ marginBottom: 16 }}>Управление доступом</h1>

      <Tabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={tabs}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        tabBarStyle={{ marginBottom: 16 }}
      />
    </div>
  )
}
