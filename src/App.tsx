import { useState, useEffect } from 'react'
import { Layout, Menu, Popover, Switch, Select } from 'antd'
import { Link, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import { MoonOutlined } from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Chessboard from './pages/documents/Chessboard'
import Vor from './pages/documents/Vor'
import References from './pages/References'
import Units from './pages/references/Units'
import CostCategories from './pages/references/CostCategories'
import Projects from './pages/references/Projects'
import Locations from './pages/references/Locations'
import Rates from './pages/references/Rates'
import Nomenclature from './pages/references/Nomenclature'
import Documentation from './pages/documents/Documentation'
import Admin from './pages/Admin'
import DocumentationTags from './pages/admin/DocumentationTags'
import Statuses from './pages/admin/Statuses'
import Disk from './pages/admin/Disk'
import PortalHeader from './components/PortalHeader'
import TestTableStructure from './pages/TestTableStructure'

import PortalSettings from './pages/admin/PortalSettings'
import { useLogo } from './shared/contexts/LogoContext'
import { useScale } from './shared/contexts/ScaleContext'

import { debugTableScroll } from './shared/debugTableScroll'

const { Sider, Content } = Layout

interface AppProps {
  isDark: boolean
  toggleTheme: () => void
}

const App = ({ isDark, toggleTheme }: AppProps) => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>([])
  const navigate = useNavigate()
  const location = useLocation()
  const { lightLogo, darkLogo } = useLogo()
  const { scale, setScale } = useScale()
  const scaleOptions = [
    { value: 0.7, label: '70%' },
    { value: 0.8, label: '80%' },
    { value: 0.9, label: '90%' },
    { value: 1, label: '100%' },
  ]

  // Автоматически открываем нужные подменю при смене роута
  useEffect(() => {
    const newOpenKeys = []
    if (location.pathname.startsWith('/documents')) {
      newOpenKeys.push('documents')
    }
    if (location.pathname.startsWith('/references')) {
      newOpenKeys.push('references')
    }
    if (location.pathname.startsWith('/admin')) {
      newOpenKeys.push('admin')
    }
    setOpenKeys(newOpenKeys)
  }, [location.pathname])

  useEffect(() => {
    if (import.meta.env.DEV && localStorage.getItem('debug-table-scroll') === '1') {
      debugTableScroll()
    }
  }, [])

  const LetterIcon = ({
    letter,
    children,
    onClick,
    isActive,
  }: {
    letter: string
    children?: React.ReactNode
    onClick?: () => void
    isActive?: boolean
  }) => {
    const iconContent = (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
        }}
      >
        <div
          style={{
            width: 32 * scale,
            height: 32 * scale,
            borderRadius: 4 * scale,
            border: `1px solid ${isActive ? '#a69ead' : 'transparent'}`,
            boxShadow: 'none',
            backgroundColor: isActive
              ? isDark
                ? 'rgba(166, 158, 173, 0.1)'
                : 'rgba(166, 158, 173, 0.05)'
              : 'transparent',
            color: isActive ? '#a69ead' : isDark ? '#ffffff' : '#000000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16 * scale,
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background-color 0.3s, color 0.3s',
            position: 'relative',
            margin: 0,
            padding: 0,
            flexShrink: 0,
          }}
          onClick={onClick}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = isDark
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(0, 0, 0, 0.05)'
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = 'transparent'
            }
          }}
        >
          {letter}
        </div>
      </div>
    )

    if (children) {
      return (
        <Popover
          content={children}
          placement="rightTop"
          trigger="hover"
          overlayStyle={{ paddingLeft: 10 * scale }}
          arrow={false}
          align={{
            offset: [0, -16],
          }}
        >
          {iconContent}
        </Popover>
      )
    }

    return iconContent
  }

  const menuItemStyle: React.CSSProperties = {
    paddingLeft: 12 * scale,
    paddingRight: 12 * scale,
    minWidth: 180 * scale,
    transition: 'background-color 0.3s',
  }

  const linkStyle: React.CSSProperties = {
    color: isDark ? '#fff' : '#000',
    display: 'block',
    padding: `${5 * scale}px 0`,
    textDecoration: 'none',
  }

  const TeletubbySun = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="12" r="6" fill="#ffeb3b" />
      <circle cx="9" cy="10" r="1" fill="#000" />
      <circle cx="15" cy="10" r="1" fill="#000" />
      <path d="M8.5 14 Q12 16 15.5 14" stroke="#000" strokeWidth="0.8" fill="none" />
      <path d="M6 6 L3 3 M18 6 L21 3 M6 18 L3 21 M18 18 L21 21" stroke="#ffeb3b" strokeWidth="2" />
      <path
        d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12"
        stroke="#ffeb3b"
        strokeWidth="2"
      />
    </svg>
  )

  const documentsSubmenu = (
    <div
      style={{
        backgroundColor: isDark ? '#1f1f1f' : '#fff',
        borderRadius: 4 * scale,
        padding: `${4 * scale}px 0`,
      }}
    >
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/documents/chessboard" style={linkStyle}>
          Шахматка
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/documents/vor" style={linkStyle}>
          ВОР
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/documents/documentation" style={linkStyle}>
          Документация
        </Link>
      </div>
    </div>
  )

  const referencesSubmenu = (
    <div
      style={{
        backgroundColor: isDark ? '#1f1f1f' : '#fff',
        borderRadius: 4 * scale,
        padding: `${4 * scale}px 0`,
      }}
    >
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/references" style={linkStyle}>
          Единицы измерения
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/references/cost-categories" style={linkStyle}>
          Категории затрат
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/references/projects" style={linkStyle}>
          Проекты
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/references/locations" style={linkStyle}>
          Локализации
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/references/rates" style={linkStyle}>
          Расценки
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/references/nomenclature" style={linkStyle}>
          Номенклатура
        </Link>
      </div>
    </div>
  )

  const adminSubmenu = (
    <div
      style={{
        backgroundColor: isDark ? '#1f1f1f' : '#fff',
        borderRadius: 4 * scale,
        padding: `${4 * scale}px 0`,
      }}
    >
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/admin/documentation-tags" style={linkStyle}>
          Тэги документации
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/admin/statuses" style={linkStyle}>
          Статусы
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/admin/disk" style={linkStyle}>
          Диск
        </Link>
      </div>
      <div
        style={menuItemStyle}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <Link to="/admin/portal-settings" style={linkStyle}>
          Настройка портала
        </Link>
      </div>
      <div
        style={{
          ...menuItemStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span style={linkStyle}>Масштаб</span>
        <Select<number>
          value={scale}
          onChange={(value) => setScale(value)}
          options={scaleOptions}
          style={{ width: 80 * scale }}
          size="small"
        />
      </div>
      <div
        style={{
          ...menuItemStyle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.backgroundColor = isDark
            ? 'rgba(255, 255, 255, 0.1)'
            : 'rgba(0, 0, 0, 0.05)')
        }
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span style={linkStyle}>Тема</span>
        <Switch
          checked={isDark}
          onChange={toggleTheme}
          checkedChildren={<MoonOutlined />}
          unCheckedChildren={<TeletubbySun />}
          size="small"
        />
      </div>
    </div>
  )

  const items = [
    {
      key: 'dashboard',
      icon: collapsed ? (
        <LetterIcon letter="D" onClick={() => navigate('/')} isActive={location.pathname === '/'} />
      ) : undefined,
      label: collapsed ? '' : <Link to="/">Dashboard</Link>,
      title: collapsed ? '' : undefined,
    },
    {
      key: 'documents',
      icon: collapsed ? (
        <LetterIcon letter="Д" isActive={location.pathname.startsWith('/documents')}>
          {documentsSubmenu}
        </LetterIcon>
      ) : undefined,
      label: collapsed ? '' : 'Документы',
      title: collapsed ? '' : undefined,
      children: collapsed
        ? undefined
        : [
            { key: 'chessboard', label: <Link to="/documents/chessboard">Шахматка</Link> },
            { key: 'vor', label: <Link to="/documents/vor">ВОР</Link> },
            { key: 'docs', label: <Link to="/documents/documentation">Документация</Link> },
          ],
    },
    {
      key: 'references',
      icon: collapsed ? (
        <LetterIcon letter="С" isActive={location.pathname.startsWith('/references')}>
          {referencesSubmenu}
        </LetterIcon>
      ) : undefined,
      label: collapsed ? '' : 'Справочники',
      title: collapsed ? '' : undefined,
      children: collapsed
        ? undefined
        : [
            { key: 'units', label: <Link to="/references">Единицы измерения</Link> },
            {
              key: 'cost-categories',
              label: <Link to="/references/cost-categories">Категории затрат</Link>,
            },
            { key: 'projects', label: <Link to="/references/projects">Проекты</Link> },
            { key: 'locations', label: <Link to="/references/locations">Локализации</Link> },
            { key: 'rates', label: <Link to="/references/rates">Расценки</Link> },
            { key: 'nomenclature', label: <Link to="/references/nomenclature">Номенклатура</Link> },
          ],
    },
    {
      key: 'admin',
      icon: collapsed ? (
        <LetterIcon letter="А" isActive={location.pathname.startsWith('/admin')}>
          {adminSubmenu}
        </LetterIcon>
      ) : undefined,
      label: collapsed ? '' : 'Администрирование',
      title: collapsed ? '' : undefined,
      children: collapsed
        ? undefined
        : [
            {
              key: 'documentation-tags',
              label: <Link to="/admin/documentation-tags">Тэги документации</Link>,
            },
            {
              key: 'statuses',
              label: <Link to="/admin/statuses">Статусы</Link>,
            },
            {
              key: 'disk',
              label: <Link to="/admin/disk">Диск</Link>,
            },
            {
              key: 'portal-settings',
              label: <Link to="/admin/portal-settings">Настройка портала</Link>,
            },
            {
              key: 'scale',
              label: (
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>Масштаб</span>
                  <Select<number>
                    value={scale}
                    onChange={(value) => setScale(value)}
                    options={scaleOptions}
                    style={{ width: 80 * scale }}
                    size="small"
                  />
                </div>
              ),
            },
            {
              key: 'theme-toggle',
              label: (
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <span>Тема</span>
                  <Switch
                    checked={isDark}
                    onChange={toggleTheme}
                    checkedChildren={<MoonOutlined />}
                    unCheckedChildren={<TeletubbySun />}
                    size="small"
                    style={{ marginLeft: 8 }}
                  />
                </div>
              ),
            },
          ],
    },
  ]

  return (
    <>
      <style>
        {`
            .ant-menu-item-selected {
              background-color: transparent !important;
              border: none !important;
              border-radius: 0 !important;
              box-shadow: none !important;
              color: #a69ead !important;
              margin: 0 !important;
            }

            .ant-menu-item-selected a {
              color: #a69ead !important;
            }

            .ant-menu-submenu .ant-menu-item-selected {
              background-color: ${isDark ? 'rgba(166, 158, 173, 0.1)' : 'rgba(166, 158, 173, 0.05)'} !important;
              border: 1px solid #a69ead !important;
              border-radius: calc(4px * var(--app-scale)) !important;
              box-shadow: none !important;
              color: #a69ead !important;
              margin: calc(2px * var(--app-scale)) 0 !important;
              padding: 0 calc(8px * var(--app-scale)) !important;
              padding-left: calc(28px * var(--app-scale)) !important;
              box-sizing: border-box !important;
            }

            .ant-menu-submenu .ant-menu-item-selected a {
              color: #a69ead !important;
            }

            .ant-menu-submenu-selected > .ant-menu-submenu-title {
              color: #a69ead !important;
            }
          
          .ant-menu-item:hover:not(.ant-menu-item-selected) {
            background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'} !important;
          }
          
          .ant-menu-item .anticon {
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            transform: none !important;
          }
          
          .ant-menu-item-selected .anticon {
            margin: 0 !important;
            padding: 0 !important;
            position: static !important;
            transform: none !important;
          }
          
          .ant-menu-item {
            padding: 0 !important;
            margin: 0 !important;
            height: calc(40px * var(--app-scale)) !important;
            line-height: calc(40px * var(--app-scale)) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .ant-menu-item-selected {
            padding: 0 !important;
            margin: 0 !important;
            height: calc(40px * var(--app-scale)) !important;
            line-height: calc(40px * var(--app-scale)) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transform: none !important;
          }

          .ant-menu:not(.ant-menu-inline-collapsed) > .ant-menu-item {
            padding-left: calc(10px * var(--app-scale)) !important;
            justify-content: flex-start !important;
          }

          .ant-menu:not(.ant-menu-inline-collapsed) .ant-menu-submenu-title {
            padding-left: calc(10px * var(--app-scale)) !important;
          }

          .ant-menu:not(.ant-menu-inline-collapsed) .ant-menu-submenu .ant-menu-item {
            padding-left: calc(20px * var(--app-scale)) !important;
            justify-content: flex-start !important;
          }
        `}
      </style>

      <Layout className="app-root" style={{ height: '100vh' }}>
        <Sider
          theme={isDark ? 'dark' : 'light'}
          style={{
            background: 'var(--menu-bg)',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
          }}
          width={200 * scale}
          collapsedWidth={80 * scale}
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
        >
          <div
            style={{
              width: '100%',
              marginTop: 20,
              marginBottom: 16,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <img
              src={isDark ? darkLogo : lightLogo}
              alt="BlueprintFlow logo"
              style={{ width: '72%', height: 'auto' }}
            />
          </div>
          <Menu
            theme={isDark ? 'dark' : 'light'}
            mode="inline"
            inlineCollapsed={collapsed}
            items={items}
            style={{ background: 'var(--menu-bg)', flex: 1 }}
            selectedKeys={[
              location.pathname === '/'
                ? 'dashboard'
                : location.pathname.startsWith('/documents/chessboard')
                  ? 'chessboard'
                  : location.pathname.startsWith('/documents/vor')
                    ? 'vor'
                    : location.pathname.startsWith('/documents/documentation')
                      ? 'docs'
                      : location.pathname.startsWith('/references/cost-categories')
                        ? 'cost-categories'
                        : location.pathname.startsWith('/references/projects')
                          ? 'projects'
                          : location.pathname.startsWith('/references/locations')
                            ? 'locations'
                            : location.pathname.startsWith('/references/rates')
                              ? 'rates'
                              : location.pathname.startsWith('/references/nomenclature')
                                ? 'nomenclature'
                                : location.pathname.startsWith('/references')
                                  ? 'units'
                                  : location.pathname.startsWith('/admin/documentation-tags')
                                    ? 'documentation-tags'
                                    : location.pathname.startsWith('/admin/statuses')
                                      ? 'statuses'
                                      : location.pathname.startsWith('/admin/disk')
                                        ? 'disk'
                                        : location.pathname.startsWith('/admin/portal-settings')
                                          ? 'portal-settings'
                                          : location.pathname,
            ]}
            openKeys={openKeys}
            onOpenChange={setOpenKeys}
          />
        </Sider>

        <Layout className="layout" style={{ height: '100%', minHeight: 0 }}>
          <PortalHeader isDark={isDark} />
          <Content
            className="content"
            style={{
              flex: 1,
              margin: 16 * scale,
              background: isDark ? '#555555' : '#FCFCFC',
              color: isDark ? '#ffffff' : '#000000',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/documents" element={<Documents />}>
                  <Route path="chessboard" element={<Chessboard />} />
                  <Route path="vor" element={<Vor />} />
                  <Route path="documentation" element={<Documentation />} />
                </Route>
                <Route path="/references" element={<References />}>
                  <Route index element={<Units />} />
                  <Route path="cost-categories" element={<CostCategories />} />
                  <Route path="projects" element={<Projects />} />
                  <Route path="locations" element={<Locations />} />
                  <Route path="rates" element={<Rates />} />
                  <Route path="nomenclature" element={<Nomenclature />} />
                </Route>
                <Route path="/admin" element={<Admin />}>
                  <Route path="documentation-tags" element={<DocumentationTags />} />
                  <Route path="statuses" element={<Statuses />} />
                  <Route path="disk" element={<Disk />} />
                  <Route path="portal-settings" element={<PortalSettings />} />
                </Route>
                <Route path="/test-table" element={<TestTableStructure />} />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>
    </>
  )
}

export default App
