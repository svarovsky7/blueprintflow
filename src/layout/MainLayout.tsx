import { useState, useEffect } from 'react'
import { Layout, Menu } from 'antd'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  DashboardOutlined,
  FileTextOutlined,
  TableOutlined,
  BuildOutlined,
  ToolOutlined,
  FileDoneOutlined,
  BookOutlined,
  BarChartOutlined,
  SettingOutlined,
  DatabaseOutlined,
} from '@ant-design/icons'
import PortalHeader from '../components/PortalHeader'

const { Sider, Content } = Layout

export default function MainLayout({ children }: { children: React.ReactNode }) {
  console.log('🚀 MAIN LAYOUT COMPONENT LOADED')

  const location = useLocation()
  const navigate = useNavigate()
  const isDark = true
  const [collapsed, setCollapsed] = useState(false)
  const siderWidth = collapsed ? 80 : 240

  console.log('🏗️ MENU RENDER:', { collapsed, siderWidth, location: location.pathname })

  // Отслеживание изменений состояния collapsed
  useEffect(() => {
    console.log('📐 MENU STATE CHANGED:', {
      collapsed,
      siderWidth,
      menuMode: collapsed ? 'collapsed' : 'expanded',
      iconsVisible: collapsed ? 'icons only' : 'icons + text',
    })
  }, [collapsed, siderWidth])

  const handleCollapse = (collapsed: boolean) => {
    console.log('🔄 MENU COLLAPSE:', collapsed ? 'COLLAPSED' : 'EXPANDED')
    setCollapsed(collapsed)
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    console.log('🖱️ MENU CLICK:', key)
    navigate(key)
  }

  // Современный items API для Menu (исправлено по рекомендации агента)
  const menuItems = [
    {
      key: '/',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: 'documents',
      icon: <FileTextOutlined />,
      label: 'Документы',
      children: [
        {
          key: '/documents/estimate',
          icon: <TableOutlined />,
          label: 'Шахматка',
        },
        {
          key: '/documents/estimate-monolith',
          icon: <BuildOutlined />,
          label: 'Шахматка монолит',
        },
        {
          key: '/documents/work-volume',
          icon: <ToolOutlined />,
          label: 'ВОР для подрядчиков',
        },
        {
          key: '/documents/cost',
          icon: <FileDoneOutlined />,
          label: 'Смета',
        },
        {
          key: '/documents/documentation',
          icon: <BookOutlined />,
          label: 'Документация',
        },
      ],
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: 'Отчёты',
    },
    {
      key: '/references',
      icon: <DatabaseOutlined />,
      label: 'Справочники',
    },
    {
      key: '/admin',
      icon: <SettingOutlined />,
      label: 'Настройки',
    },
  ]
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="dark"
        style={{
          background: '#333333',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
          overflow: 'auto',
        }}
        collapsible
        collapsed={collapsed}
        onCollapse={(collapsed) => {
          console.log('📐 SIDER onCollapse called with:', collapsed)
          handleCollapse(collapsed)
        }}
        breakpoint="lg"
        onBreakpoint={(broken) => {
          console.log('📱 SIDER breakpoint:', broken)
        }}
      >
        <div style={{ height: 64 }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems}
          style={{
            background: '#333333',
            border: 'none',
          }}
          className="main-menu"
          data-testid="main-menu"
        />
      </Sider>
      <Layout style={{ marginLeft: siderWidth, transition: 'margin-left 0.2s' }}>
        <div
          style={{
            position: 'fixed',
            top: 0,
            right: 0,
            left: siderWidth,
            zIndex: 99,
            background: '#333333',
            transition: 'left 0.2s',
          }}
        >
          <PortalHeader isDark={isDark} />
        </div>
        <Content
          style={{
            marginTop: 64,
            padding: '16px',
            background: '#333333',
            color: '#ffffff',
            minHeight: 'calc(100vh - 64px)',
          }}
        >
          {children}
        </Content>
      </Layout>
    </Layout>
  )
}
