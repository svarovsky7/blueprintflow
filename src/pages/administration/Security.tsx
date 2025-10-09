import { useState, useEffect } from 'react'
import { Tabs } from 'antd'
import { SafetyOutlined, KeyOutlined, TeamOutlined, AppstoreOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import RolesTab from './tabs/RolesTab'
import PermissionsTab from './tabs/PermissionsTab'
import GroupRolesTab from './tabs/GroupRolesTab'
import PortalObjectsTab from './tabs/PortalObjectsTab'

export default function Security() {
  const [activeTab, setActiveTab] = useState('roles')
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
      key: 'roles',
      label: 'Роли',
      icon: <SafetyOutlined />,
      children: <RolesTab />,
    },
    {
      key: 'permissions',
      label: 'Разрешения',
      icon: <KeyOutlined />,
      children: <PermissionsTab />,
    },
    {
      key: 'group-roles',
      label: 'Роли групп',
      icon: <TeamOutlined />,
      children: <GroupRolesTab />,
    },
    {
      key: 'portal-objects',
      label: 'Объекты портала',
      icon: <AppstoreOutlined />,
      children: <PortalObjectsTab />,
    },
  ]

  return (
    <div style={{ padding: '24px', height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <h1 style={{ marginBottom: 16 }}>Роли и разрешения</h1>

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
