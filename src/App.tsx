import { useState, useEffect } from 'react'
import { Layout, Menu, Switch, Select } from 'antd'
import { Link, Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom'
import {
  MoonOutlined,
  FileTextOutlined,
  BarChartOutlined,
  DatabaseOutlined,
  SettingOutlined,
  PieChartOutlined,
  ExperimentOutlined,
  UserOutlined,
} from '@ant-design/icons'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Chessboard from './pages/documents/Chessboard'
import Vor from './pages/documents/Vor'
import VorView from './pages/documents/VorView'
import Finishing from './pages/documents/Finishing'
import FinishingPieType from './pages/documents/FinishingPieType'
import FinishingCalculation from './pages/documents/FinishingCalculation'
import References from './pages/References'
import Units from './pages/references/Units'
import CostCategories from './pages/references/CostCategories'
import Projects from './pages/references/Projects'
import Locations from './pages/references/Locations'
import Rooms from './pages/references/Rooms'
import Rates from './pages/references/Rates'
import Nomenclature from './pages/references/Nomenclature'
import SurfaceTypes from './pages/references/SurfaceTypes'
import Documentation from './pages/documents/Documentation'
import Reports from './pages/Reports'
import ProjectAnalysis from './pages/reports/ProjectAnalysis'
import Admin from './pages/Admin'
import AccessControl from './pages/administration/AccessControl'
import Security from './pages/administration/Security'
import DocumentationTags from './pages/administration/DocumentationTags'
import Statuses from './pages/administration/Statuses'
import ApiSettings from './pages/administration/ApiSettings'
import Experiments from './pages/experiments'
import ChessboardML from './pages/experiments/ChessboardML'
import Login from './pages/Login'
import PortalHeader from './components/PortalHeader'
import TestTableStructure from './pages/TestTableStructure'
import { useLogo } from './shared/contexts/LogoContext'
import { useScale } from './shared/contexts/ScaleContext'
import { useAuthStore } from '@/features/auth'
import { ProtectedRoute, PermissionGuard } from '@/shared/components'

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
  const { checkAuth } = useAuthStore()
  const scaleOptions = [
    { value: 0.7, label: '70%' },
    { value: 0.8, label: '80%' },
    { value: 0.9, label: '90%' },
    { value: 1, label: '100%' },
  ]

  useEffect(() => {
    checkAuth()
  }, [])

  // Состояние для управления всплывающим меню
  const [hoveredMenu, setHoveredMenu] = useState<string | null>(null)
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  })
  const [hideMenuTimer, setHideMenuTimer] = useState<NodeJS.Timeout | null>(null)

  // АГРЕССИВНО убираем все title атрибуты после рендера
  useEffect(() => {
    const removeAllTitles = () => {
      // Убираем title атрибуты из всего меню
      const menuElement = document.querySelector('.main-menu')
      if (menuElement) {
        // Убираем title из всех элементов с title атрибутом
        const elementsWithTitle = menuElement.querySelectorAll('[title]')
        elementsWithTitle.forEach((element) => {
          element.removeAttribute('title')
          // Также убираем aria-label который может вызвать tooltip
          element.removeAttribute('aria-label')
        })

        // Специально убираем title из иконок Ant Design
        const icons = menuElement.querySelectorAll('.anticon, .ant-menu-item-icon, [class*="icon"]')
        icons.forEach((icon) => {
          icon.removeAttribute('title')
          icon.removeAttribute('aria-label')
          // Принудительно устанавливаем пустой title
          icon.setAttribute('title', '')
        })
      }

      // Глобальный поиск всех tooltip элементов для скрытия
      const tooltips = document.querySelectorAll('[role="tooltip"], .ant-tooltip, .tooltip')
      tooltips.forEach((tooltip) => {
        const el = tooltip as HTMLElement
        el.style.display = 'none'
        el.style.opacity = '0'
        el.style.visibility = 'hidden'
      })
    }

    removeAllTitles()

    // Повторяем несколько раз для гарантии
    const timers = [
      setTimeout(removeAllTitles, 50),
      setTimeout(removeAllTitles, 200),
      setTimeout(removeAllTitles, 500),
      setTimeout(removeAllTitles, 1000),
    ]

    return () => timers.forEach(clearTimeout)
  }, [collapsed])

  // Дополнительный useEffect для отслеживания изменений DOM
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'title') {
          const target = mutation.target as Element
          if (target.closest('.main-menu')) {
            target.removeAttribute('title')
          }
        }
      })
    })

    const menuElement = document.querySelector('.main-menu')
    if (menuElement) {
      observer.observe(menuElement, {
        attributes: true,
        attributeFilter: ['title', 'aria-label'],
        subtree: true,
      })
    }

    return () => observer.disconnect()
  }, [])

  // Cleanup таймера при размонтировании
  useEffect(() => {
    return () => {
      if (hideMenuTimer) {
        clearTimeout(hideMenuTimer)
      }
    }
  }, [hideMenuTimer])

  // Автоматически открываем нужные подменю при смене роута
  useEffect(() => {
    const newOpenKeys = []
    if (location.pathname.startsWith('/documents')) {
      newOpenKeys.push('documents')
    }
    if (location.pathname.startsWith('/references')) {
      newOpenKeys.push('references')
    }
    if (location.pathname.startsWith('/reports')) {
      newOpenKeys.push('reports')
    }
    if (location.pathname.startsWith('/administration')) {
      newOpenKeys.push('administration')
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

  // Создаем простое всплывающее меню без Popover
  const createHoverMenu = (
    menuKey: string,
    _menuItems: Array<{ key: string; label: React.ReactNode; path: string }>,
  ) => {
    const handleMouseEnter = (e: React.MouseEvent) => {
      // Отменяем предыдущий таймер сокрытия
      if (hideMenuTimer) {
        clearTimeout(hideMenuTimer)
        setHideMenuTimer(null)
      }

      const rect = e.currentTarget.getBoundingClientRect()
      setMenuPosition({
        top: rect.top,
        left: rect.right + 8,
      })
      setHoveredMenu(menuKey)
    }

    const handleMouseLeave = () => {
      // Устанавливаем таймер для сокрытия меню
      const timer = setTimeout(() => {
        setHoveredMenu(null)
        setHideMenuTimer(null)
      }, 300)
      setHideMenuTimer(timer)
    }

    return {
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
    }
  }

  const items = [
    {
      key: 'dashboard',
      icon: <PieChartOutlined />,
      label: collapsed ? '' : <Link to="/">Dashboard</Link>,
      onClick: () => navigate('/'),
    },
    {
      key: 'documents',
      icon: collapsed ? (
        <div
          {...createHoverMenu('documents', [
            { key: 'chessboard', label: 'Шахматка', path: '/documents/chessboard' },
            { key: 'vor', label: 'ВОР', path: '/documents/vor' },
            { key: 'docs', label: 'Документация', path: '/documents/documentation' },
            { key: 'finishing', label: 'Отделка', path: '/documents/finishing' },
          ])}
        >
          <FileTextOutlined />
        </div>
      ) : (
        <FileTextOutlined />
      ),
      label: collapsed ? '' : 'Документы',
      children: collapsed
        ? undefined
        : [
            { key: 'chessboard', label: <Link to="/documents/chessboard">Шахматка</Link> },
            { key: 'vor', label: <Link to="/documents/vor">ВОР</Link> },
            { key: 'docs', label: <Link to="/documents/documentation">Документация</Link> },
            { key: 'finishing', label: <Link to="/documents/finishing">Отделка</Link> },
          ],
    },
    {
      key: 'reports',
      icon: collapsed ? (
        <div
          {...createHoverMenu('reports', [
            {
              key: 'project-analysis',
              label: 'Анализ документации',
              path: '/reports/project-analysis',
            },
          ])}
        >
          <BarChartOutlined />
        </div>
      ) : (
        <BarChartOutlined />
      ),
      label: collapsed ? '' : 'Отчеты',
      children: collapsed
        ? undefined
        : [
            {
              key: 'project-analysis',
              label: <Link to="/reports/project-analysis">Анализ доков</Link>,
            },
          ],
    },
    {
      key: 'references',
      icon: collapsed ? (
        <div
          {...createHoverMenu('references', [
            { key: 'units', label: 'Единицы измерения', path: '/references/units' },
            {
              key: 'cost-categories',
              label: 'Категории затрат',
              path: '/references/cost-categories',
            },
            { key: 'projects', label: 'Проекты', path: '/references/projects' },
            { key: 'locations', label: 'Локализации', path: '/references/locations' },
            { key: 'rooms', label: 'Помещения', path: '/references/rooms' },
            { key: 'rates', label: 'Расценки', path: '/references/rates' },
            { key: 'nomenclature', label: 'Номенклатура', path: '/references/nomenclature' },
          ])}
        >
          <DatabaseOutlined />
        </div>
      ) : (
        <DatabaseOutlined />
      ),
      label: collapsed ? '' : 'Справочники',
      children: collapsed
        ? undefined
        : [
            { key: 'units', label: <Link to="/references/units">Единицы измерения</Link> },
            {
              key: 'cost-categories',
              label: <Link to="/references/cost-categories">Категории затрат</Link>,
            },
            { key: 'projects', label: <Link to="/references/projects">Проекты</Link> },
            { key: 'locations', label: <Link to="/references/locations">Локализации</Link> },
            { key: 'rooms', label: <Link to="/references/rooms">Помещения</Link> },
            { key: 'rates', label: <Link to="/references/rates">Расценки</Link> },
            { key: 'nomenclature', label: <Link to="/references/nomenclature">Номенклатура</Link> },
            { key: 'surface-types', label: <Link to="/references/surface-types">Типы поверхностей</Link> },
          ],
    },
    {
      key: 'experiments',
      icon: <ExperimentOutlined />,
      label: collapsed ? '' : 'Эксперименты',
      onClick: () => navigate('/experiments'),
    },
    {
      key: 'administration',
      icon: collapsed ? (
        <div
          {...createHoverMenu('administration', [
            {
              key: 'access-control',
              label: 'Управление доступом',
              path: '/administration/access-control',
            },
            { key: 'security', label: 'Роли и разрешения', path: '/administration/security' },
            { key: 'statuses', label: 'Статусы', path: '/administration/statuses' },
            { key: 'documentation-tags', label: 'Тэги документации', path: '/administration/documentation-tags' },
            { key: 'api-settings', label: 'Настройки API', path: '/administration/api-settings' },
          ])}
        >
          <UserOutlined />
        </div>
      ) : (
        <UserOutlined />
      ),
      label: collapsed ? '' : 'Админка',
      children: collapsed
        ? undefined
        : [
            {
              key: 'access-control',
              label: <Link to="/administration/access-control">Управление доступом</Link>,
            },
            {
              key: 'security',
              label: <Link to="/administration/security">Роли и разрешения</Link>,
            },
            {
              key: 'statuses',
              label: <Link to="/administration/statuses">Статусы</Link>,
            },
            {
              key: 'documentation-tags',
              label: <Link to="/administration/documentation-tags">Тэги документации</Link>,
            },
            {
              key: 'api-settings',
              label: <Link to="/administration/api-settings">Настройки API</Link>,
            },
          ],
    },
    {
      key: 'admin',
      icon: <SettingOutlined />,
      label: collapsed ? '' : 'Настройки',
      children: collapsed
        ? undefined
        : [
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

  const isLoginPage = location.pathname === '/login'

  // Если это страница логина - рендерим без Layout
  if (isLoginPage) {
    return (
      <Routes>
        <Route
          path="/login"
          element={
            <ProtectedRoute requireAuth={false}>
              <Login />
            </ProtectedRoute>
          }
        />
      </Routes>
    )
  }

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
          
          /* Размер иконок в меню 24px с динамическим масштабированием */
          .main-menu .anticon,
          .main-menu .anticon svg {
            font-size: calc(24px * ${scale}) !important;
            width: calc(24px * ${scale}) !important;
            height: calc(24px * ${scale}) !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin-right: calc(4px * var(--app-scale)) !important;
          }
          
          /* Размер иконок в свернутом меню с динамическим масштабированием */
          .main-menu.ant-menu-inline-collapsed .anticon,
          .main-menu.ant-menu-inline-collapsed .anticon svg {
            font-size: calc(24px * ${scale}) !important;
            width: calc(24px * ${scale}) !important;
            height: calc(24px * ${scale}) !important;
            margin: 0 auto !important;
          }
          
          /* Убеждаемся что все иконки видимы */
          .main-menu .anticon,
          .main-menu span[role="img"] {
            visibility: visible !important;
            opacity: 1 !important;
            display: inline-flex !important;
          }
          
          .ant-menu-item {
            padding: calc(8px * var(--app-scale)) !important;
            margin: 0 !important;
            height: calc(48px * var(--app-scale)) !important;
            line-height: calc(48px * var(--app-scale)) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
          }

          .ant-menu-item-selected {
            padding: calc(8px * var(--app-scale)) !important;
            margin: 0 !important;
            height: calc(48px * var(--app-scale)) !important;
            line-height: calc(48px * var(--app-scale)) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            transform: none !important;
          }
          
          /* Увеличиваем высоту подменю тоже */
          .main-menu .ant-menu-submenu-title {
            height: calc(48px * var(--app-scale)) !important;
            line-height: calc(48px * var(--app-scale)) !important;
            padding: calc(8px * var(--app-scale)) !important;
          }

          /* РАДИКАЛЬНО отключаем все tooltip подсказки */
          .main-menu,
          .main-menu *,
          .main-menu .anticon,
          .main-menu .ant-menu-item,
          .main-menu .ant-menu-item-icon,
          .main-menu [role="menuitem"] {
            title: none !important;
          }
          
          .main-menu .anticon[title] {
            title: '' !important;
          }
          
          /* Убираем все tooltip через глобальный CSS */
          .main-menu [title]:hover::before,
          .main-menu [title]:hover::after,
          .main-menu *[title]:hover::before, 
          .main-menu *[title]:hover::after {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            content: none !important;
          }
          
          /* Блокируем системные tooltip браузера */
          .main-menu * {
            -webkit-appearance: none !important;
          }

          /* Переопределяем все возможные tooltip стили */
          [role="tooltip"],
          .ant-tooltip,
          .tooltip {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
          }

          /* Стили для всплывающего меню настроек */
          .admin-popup-menu .ant-select-dropdown {
            z-index: 1060 !important;
          }
          
          .admin-popup-menu .ant-select {
            pointer-events: auto !important;
          }

          .ant-menu:not(.ant-menu-inline-collapsed) > .ant-menu-item {
            padding-left: calc(6px * var(--app-scale)) !important;
            justify-content: flex-start !important;
          }

          .ant-menu:not(.ant-menu-inline-collapsed) .ant-menu-submenu-title {
            padding-left: calc(6px * var(--app-scale)) !important;
          }

          .ant-menu:not(.ant-menu-inline-collapsed) .ant-menu-submenu .ant-menu-item {
            padding-left: calc(16px * var(--app-scale)) !important;
            justify-content: flex-start !important;
          }
          
          /* Скроллинг меню без видимой полосы прокрутки */
          .main-menu {
            overflow-y: auto !important;
            overflow-x: hidden !important;
            scrollbar-width: none !important; /* Firefox */
            -ms-overflow-style: none !important; /* IE и Edge */
            max-height: calc(100vh - 120px) !important; /* Ограничиваем высоту с учетом логотипа */
            flex: 1 1 auto !important;
            min-height: 0 !important; /* Важно для корректного flex */
          }
          
          /* Скрываем полосу прокрутки в WebKit браузерах */
          .main-menu::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
          }
          
          /* Обеспечиваем корректную работу flex в Sider */
          .ant-layout-sider-children {
            display: flex !important;
            flex-direction: column !important;
            height: 100% !important;
          }
          
          /* Центрируем иконки в свернутом меню */
          .main-menu.ant-menu-inline-collapsed .ant-menu-item,
          .main-menu.ant-menu-inline-collapsed .ant-menu-submenu > .ant-menu-submenu-title {
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            padding: calc(8px * var(--app-scale)) !important;
          }
          
          .main-menu.ant-menu-inline-collapsed .ant-menu-item .ant-menu-title-content,
          .main-menu.ant-menu-inline-collapsed .ant-menu-submenu-title .ant-menu-title-content {
            display: none !important;
          }
          
          /* Стили для всплывающих пунктов меню */
          .popover-menu-item:hover {
            background-color: ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'} !important;
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
            items={items}
            className="main-menu"
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
                      : location.pathname.startsWith('/documents/finishing')
                        ? 'finishing'
                        : location.pathname.startsWith('/references/cost-categories')
                        ? 'cost-categories'
                        : location.pathname.startsWith('/references/projects')
                          ? 'projects'
                          : location.pathname.startsWith('/references/locations')
                            ? 'locations'
                            : location.pathname.startsWith('/references/rooms')
                              ? 'rooms'
                              : location.pathname.startsWith('/references/rates')
                              ? 'rates'
                              : location.pathname.startsWith('/references/nomenclature')
                                ? 'nomenclature'
                                : location.pathname.startsWith('/references')
                                  ? 'units'
                                  : location.pathname.startsWith('/reports/project-analysis')
                                    ? 'project-analysis'
                                    : location.pathname.startsWith('/admin/documentation-tags')
                                      ? 'documentation-tags'
                                      : location.pathname.startsWith('/admin/statuses')
                                        ? 'statuses'
                                        : location.pathname.startsWith('/admin/api-settings')
                                          ? 'api-settings'
                                          : location.pathname.startsWith('/experiments')
                                            ? 'experiments'
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
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/documents"
                  element={
                    <ProtectedRoute>
                      <Documents />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="chessboard"
                    element={
                      <PermissionGuard objectCode="chessboard_page">
                        <Chessboard />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="vor"
                    element={
                      <PermissionGuard objectCode="vor_page">
                        <Vor />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="vor-view"
                    element={
                      <PermissionGuard objectCode="vor_page">
                        <VorView />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="documentation"
                    element={
                      <PermissionGuard objectCode="documentation_page">
                        <Documentation />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="finishing"
                    element={
                      <PermissionGuard objectCode="finishing_page">
                        <Finishing />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="finishing-pie-type/:id"
                    element={
                      <PermissionGuard objectCode="finishing_page">
                        <FinishingPieType />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="finishing-calculation/:id"
                    element={
                      <PermissionGuard objectCode="finishing_page">
                        <FinishingCalculation />
                      </PermissionGuard>
                    }
                  />
                </Route>
                <Route
                  path="/references"
                  element={
                    <ProtectedRoute>
                      <References />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="units"
                    element={
                      <PermissionGuard objectCode="units_page">
                        <Units />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="cost-categories"
                    element={
                      <PermissionGuard objectCode="cost_categories_page">
                        <CostCategories />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="projects"
                    element={
                      <PermissionGuard objectCode="projects_page">
                        <Projects />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="locations"
                    element={
                      <PermissionGuard objectCode="locations_page">
                        <Locations />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="rooms"
                    element={
                      <PermissionGuard objectCode="rooms_page">
                        <Rooms />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="rates"
                    element={
                      <PermissionGuard objectCode="rates_page">
                        <Rates />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="nomenclature"
                    element={
                      <PermissionGuard objectCode="nomenclature_page">
                        <Nomenclature />
                      </PermissionGuard>
                    }
                  />
                  <Route
                    path="surface-types"
                    element={
                      <PermissionGuard objectCode="surface_types_page">
                        <SurfaceTypes />
                      </PermissionGuard>
                    }
                  />
                </Route>
                <Route
                  path="/reports"
                  element={
                    <ProtectedRoute>
                      <Reports />
                    </ProtectedRoute>
                  }
                >
                  <Route path="project-analysis" element={<ProjectAnalysis />} />
                </Route>
                <Route
                  path="/administration/access-control"
                  element={
                    <ProtectedRoute>
                      <PermissionGuard objectCode="users_page">
                        <AccessControl />
                      </PermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/administration/security"
                  element={
                    <ProtectedRoute>
                      <PermissionGuard objectCode="roles_page">
                        <Security />
                      </PermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/administration/documentation-tags"
                  element={
                    <ProtectedRoute>
                      <PermissionGuard objectCode="tags_page">
                        <DocumentationTags />
                      </PermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/administration/statuses"
                  element={
                    <ProtectedRoute>
                      <PermissionGuard objectCode="statuses_page">
                        <Statuses />
                      </PermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/administration/api-settings"
                  element={
                    <ProtectedRoute>
                      <PermissionGuard objectCode="api_settings_page">
                        <ApiSettings />
                      </PermissionGuard>
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute>
                      <Admin />
                    </ProtectedRoute>
                  }
                >
                  <Route path="disk" element={<Navigate to="/administration/api-settings" replace />} />
                  <Route path="users" element={<Navigate to="/administration/access-control?tab=users" replace />} />
                  <Route path="user-groups" element={<Navigate to="/administration/access-control?tab=groups" replace />} />
                  <Route path="roles" element={<Navigate to="/administration/security?tab=roles" replace />} />
                  <Route path="permissions" element={<Navigate to="/administration/security?tab=permissions" replace />} />
                  <Route path="documentation-tags" element={<Navigate to="/administration/documentation-tags" replace />} />
                  <Route path="statuses" element={<Navigate to="/administration/statuses" replace />} />
                  <Route path="api-settings" element={<Navigate to="/administration/api-settings" replace />} />
                </Route>
                <Route
                  path="/experiments"
                  element={
                    <ProtectedRoute>
                      <Experiments />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/experiments/chessboard-ml"
                  element={
                    <ProtectedRoute>
                      <ChessboardML />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/test-table"
                  element={
                    <ProtectedRoute>
                      <TestTableStructure />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </div>
          </Content>
        </Layout>
      </Layout>

      {/* Всплывающее меню для свернутого режима */}
      {hoveredMenu && collapsed && (
        <div
          className="admin-popup-menu"
          style={{
            position: 'fixed',
            top: menuPosition.top,
            left: menuPosition.left,
            backgroundColor: 'white',
            border: '1px solid #d9d9d9',
            borderRadius: '6px',
            boxShadow:
              '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
            zIndex: 1050,
            minWidth: '220px',
            padding: '4px 0',
          }}
          onMouseEnter={() => {
            // Отменяем таймер сокрытия при наведении на всплывающее меню
            if (hideMenuTimer) {
              clearTimeout(hideMenuTimer)
              setHideMenuTimer(null)
            }
          }}
          onMouseLeave={(e) => {
            // Не закрываем меню, если курсор над выпадающим списком
            const relatedTarget = e.relatedTarget as HTMLElement
            if (relatedTarget && relatedTarget.closest('.ant-select-dropdown')) {
              return
            }
            // Устанавливаем таймер для сокрытия меню
            const timer = setTimeout(() => {
              setHoveredMenu(null)
              setHideMenuTimer(null)
            }, 200)
            setHideMenuTimer(timer)
          }}
        >
          {hoveredMenu === 'documents' &&
            [
              { key: 'chessboard', label: 'Шахматка', path: '/documents/chessboard' },
              { key: 'vor', label: 'ВОР', path: '/documents/vor' },
              { key: 'docs', label: 'Документация', path: '/documents/documentation' },
              { key: 'finishing', label: 'Отделка', path: '/documents/finishing' },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                onClick={() => {
                  navigate(item.path)
                  if (hideMenuTimer) {
                    clearTimeout(hideMenuTimer)
                    setHideMenuTimer(null)
                  }
                  setHoveredMenu(null)
                }}
              >
                {item.label}
              </div>
            ))}

          {hoveredMenu === 'reports' &&
            [
              {
                key: 'project-analysis',
                label: 'Анализ документации',
                path: '/reports/project-analysis',
              },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                onClick={() => {
                  navigate(item.path)
                  if (hideMenuTimer) {
                    clearTimeout(hideMenuTimer)
                    setHideMenuTimer(null)
                  }
                  setHoveredMenu(null)
                }}
              >
                {item.label}
              </div>
            ))}

          {hoveredMenu === 'references' &&
            [
              { key: 'units', label: 'Единицы измерения', path: '/references/units' },
              {
                key: 'cost-categories',
                label: 'Категории затрат',
                path: '/references/cost-categories',
              },
              { key: 'projects', label: 'Проекты', path: '/references/projects' },
              { key: 'locations', label: 'Локализации', path: '/references/locations' },
              { key: 'rooms', label: 'Помещения', path: '/references/rooms' },
              { key: 'rates', label: 'Расценки', path: '/references/rates' },
              { key: 'nomenclature', label: 'Номенклатура', path: '/references/nomenclature' },
            ].map((item) => (
              <div
                key={item.key}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f0f0f0'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
                onClick={() => {
                  navigate(item.path)
                  if (hideMenuTimer) {
                    clearTimeout(hideMenuTimer)
                    setHideMenuTimer(null)
                  }
                  setHoveredMenu(null)
                }}
              >
                {item.label}
              </div>
            ))}

          {hoveredMenu === 'admin' && (
            <>
              {/* Переключатель темы */}
              <div
                style={{
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <span style={{ fontSize: '14px' }}>Темная тема</span>
                <Switch
                  checked={isDark}
                  onChange={toggleTheme}
                  checkedChildren={<MoonOutlined />}
                  unCheckedChildren="☀️"
                  size="small"
                />
              </div>

              {/* Выбор масштаба */}
              <div
                style={{
                  padding: '8px 12px',
                  borderBottom: '1px solid #f0f0f0',
                }}
              >
                <div style={{ fontSize: '14px', marginBottom: '4px' }}>Масштаб</div>
                <Select
                  value={scale}
                  onChange={setScale}
                  size="small"
                  style={{ width: '100%' }}
                  options={scaleOptions}
                />
              </div>

              {/* Обычные пункты меню */}
              {[
                {
                  key: 'documentation-tags',
                  label: 'Тэги документации',
                  path: '/admin/documentation-tags',
                },
                { key: 'statuses', label: 'Статусы', path: '/admin/statuses' },
                { key: 'api-settings', label: 'API', path: '/admin/api-settings' },
                { key: 'users', label: 'Пользователи', path: '/admin/users' },
              ].map((item) => (
                <div
                  key={item.key}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f0f0f0'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                  onClick={() => {
                    navigate(item.path)
                    setHoveredMenu(null)
                  }}
                >
                  {item.label}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </>
  )
}

export default App
