
import { useState } from 'react'
import { Layout, Menu, Popover } from 'antd'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Chessboard from './pages/documents/Chessboard'
import Vor from './pages/documents/Vor'
import References from './pages/References'
import Units from './pages/references/Units'
import CostCategories from './pages/references/CostCategories'
import Projects from './pages/references/Projects'
import Locations from './pages/references/Locations'
import PortalHeader from './components/PortalHeader'

const { Sider, Content } = Layout

interface AppProps {
  isDark: boolean
  toggleTheme: () => void
}

const App = ({ isDark, toggleTheme }: AppProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  
  const LetterIcon = ({ letter, children, onClick }: { letter: string; children?: React.ReactNode; onClick?: () => void }) => {
    const iconContent = (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 4,
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'}`,
          color: isDark ? '#ffffff' : '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.3s',
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.6)' : 'rgba(0, 0, 0, 0.3)'
          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.15)'
          e.currentTarget.style.backgroundColor = 'transparent'
        }}
      >
        {letter}
      </div>
    )

    if (children) {
      return (
        <Popover
          content={children}
          placement="rightTop"
          trigger="hover"
          overlayStyle={{ paddingLeft: 10 }}
          arrow={false}
          align={{
            offset: [0, -16]
          }}
        >
          {iconContent}
        </Popover>
      )
    }

    return iconContent
  }

  const menuItemStyle: React.CSSProperties = {
    paddingLeft: '12px',
    paddingRight: '12px',
    minWidth: '180px',
    transition: 'background-color 0.3s',
  }

  const linkStyle: React.CSSProperties = {
    color: isDark ? '#fff' : '#000',
    display: 'block',
    padding: '5px 0',
    textDecoration: 'none',
  }

  const documentsSubmenu = (
    <div style={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 4, padding: '4px 0' }}>
      <div 
        style={menuItemStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Link to="/documents/chessboard" style={linkStyle}>
          Шахматка
        </Link>
      </div>
      <div 
        style={menuItemStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Link to="/documents/vor" style={linkStyle}>
          ВОР
        </Link>
      </div>
    </div>
  )

  const referencesSubmenu = (
    <div style={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 4, padding: '4px 0' }}>
      <div 
        style={menuItemStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Link to="/references" style={linkStyle}>
          Единицы измерения
        </Link>
      </div>
      <div 
        style={menuItemStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Link to="/references/cost-categories" style={linkStyle}>
          Категории затрат
        </Link>
      </div>
      <div 
        style={menuItemStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Link to="/references/projects" style={linkStyle}>
          Проекты
        </Link>
      </div>
      <div 
        style={menuItemStyle}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <Link to="/references/locations" style={linkStyle}>
          Локализации
        </Link>
      </div>
    </div>
  )

  const adminSubmenu = (
    <div style={{ backgroundColor: isDark ? '#1f1f1f' : '#fff', borderRadius: 4, padding: '4px 0' }}>
      <div 
        style={{ ...menuItemStyle, cursor: 'pointer' }} 
        onClick={toggleTheme}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
      >
        <span style={linkStyle}>
          {isDark ? 'Светлая тема' : 'Темная тема'}
        </span>
      </div>
    </div>
  )

  const items = [
    { 
      key: 'dashboard', 
      icon: collapsed ? <LetterIcon letter="D" onClick={() => navigate('/')} /> : undefined,
      label: collapsed ? '' : <Link to="/">Dashboard</Link>,
      title: collapsed ? '' : undefined
    },
    {
      key: 'documents',
      icon: collapsed ? <LetterIcon letter="Д">{documentsSubmenu}</LetterIcon> : undefined,
      label: collapsed ? '' : 'Документы',
      title: collapsed ? '' : undefined,
      children: collapsed ? undefined : [
        { key: 'chessboard', label: <Link to="/documents/chessboard">Шахматка</Link> },
        { key: 'vor', label: <Link to="/documents/vor">ВОР</Link> },
      ],
    },
    {
      key: 'references',
      icon: collapsed ? <LetterIcon letter="С">{referencesSubmenu}</LetterIcon> : undefined,
      label: collapsed ? '' : 'Справочники',
      title: collapsed ? '' : undefined,
      children: collapsed ? undefined : [
        { key: 'units', label: <Link to="/references">Единицы измерения</Link> },
        {
          key: 'cost-categories',
          label: <Link to="/references/cost-categories">Категории затрат</Link>,
        },
        { key: 'projects', label: <Link to="/references/projects">Проекты</Link> },
        { key: 'locations', label: <Link to="/references/locations">Локализации</Link> },
      ],
    },
    {
      key: 'admin',
      icon: collapsed ? <LetterIcon letter="А">{adminSubmenu}</LetterIcon> : undefined,
      label: collapsed ? '' : 'Администрирование',
      title: collapsed ? '' : undefined,
      children: collapsed ? undefined : [
        { 
          key: 'theme-toggle', 
          label: (
            <span onClick={toggleTheme} style={{ cursor: 'pointer' }}>
              {isDark ? 'Светлая тема' : 'Темная тема'}
            </span>
          ) 
        },
      ],
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme={isDark ? 'dark' : 'light'}
        style={{
          background: 'var(--menu-bg)',
        }}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
      >
        <div style={{ height: 64 }} />
        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          inlineCollapsed={collapsed}
          items={items}
          style={{ background: 'var(--menu-bg)' }}
        />
      </Sider>
      <Layout>
        <PortalHeader isDark={isDark} />
        <Content
          style={{
            margin: 16,
            background: isDark ? '#555555' : '#FCFCFC',
            color: isDark ? '#ffffff' : '#000000',
          }}
        >
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />}>
              <Route path="chessboard" element={<Chessboard />} />
              <Route path="vor" element={<Vor />} />
            </Route>
            <Route path="/references" element={<References />}>
              <Route index element={<Units />} />
              <Route path="cost-categories" element={<CostCategories />} />
              <Route path="projects" element={<Projects />} />
              <Route path="locations" element={<Locations />} />
            </Route>
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
