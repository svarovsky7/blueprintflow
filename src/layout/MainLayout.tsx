import { useState } from 'react'
import { Layout, Menu } from 'antd'
import { Link, useLocation } from 'react-router-dom'
import type { MenuProps } from 'antd'
import PortalHeader from '../components/PortalHeader'

const { Sider, Content } = Layout

const items: MenuProps['items'] = [
  {
    key: '/',
    label: <Link to="/">Dashboard</Link>,
  },
  {
    key: 'documents',
    label: 'Документы',
    children: [
      { key: '/documents/estimate', label: <Link to="/documents/estimate">Шахматка</Link> },
      {
        key: '/documents/estimate-monolith',
        label: <Link to="/documents/estimate-monolith">Шахматка монолит</Link>,
      },
      {
        key: '/documents/work-volume',
        label: <Link to="/documents/work-volume">ВОР для подрядчиков</Link>,
      },
      { key: '/documents/cost', label: <Link to="/documents/cost">Смета</Link> },
      {
        key: '/documents/documentation',
        label: <Link to="/documents/documentation">Документация</Link>,
      },
    ],
  },
  { key: '/reports', label: <Link to="/reports">Отчёты</Link> },
  { key: '/references', label: <Link to="/references">Справочники</Link> },
  { key: '/admin', label: <Link to="/admin">Администрирование</Link> },
]

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const isDark = true
  const [collapsed, setCollapsed] = useState(false)
  const siderWidth = collapsed ? 80 : 200
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
        onCollapse={setCollapsed}
      >
        <div style={{ height: 64 }} />
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
          style={{ background: '#333333' }}
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
