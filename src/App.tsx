
import { Layout, Menu, Switch } from 'antd'
import { Link, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Chessboard from './pages/documents/Chessboard'
import Vor from './pages/documents/Vor'
import References from './pages/References'
import Units from './pages/references/Units'
import CostCategories from './pages/references/CostCategories'
import Projects from './pages/references/Projects'
import PortalHeader from './components/PortalHeader'
import { SunOutlined, MoonOutlined } from '@ant-design/icons'

const { Sider, Content, Footer } = Layout

interface AppProps {
  isDark: boolean
  toggleTheme: () => void
}

const App = ({ isDark, toggleTheme }: AppProps) => {
  const items = [
    { key: 'dashboard', label: <Link to="/">Dashboard</Link> },
    {
      key: 'documents',
      label: 'Документы',
      children: [
        { key: 'chessboard', label: <Link to="/documents/chessboard">Шахматка</Link> },
        { key: 'vor', label: <Link to="/documents/vor">ВОР</Link> },
      ],
    },
    {
      key: 'references',
      label: 'Справочники',
      children: [
        { key: 'units', label: <Link to="/references">Единицы измерения</Link> },
        {
          key: 'cost-categories',
          label: <Link to="/references/cost-categories">Категории затрат</Link>,
        },
        { key: 'projects', label: <Link to="/references/projects">Проекты</Link> },
      ],
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme={isDark ? 'dark' : 'light'}
        style={{
          background: isDark ? '#555555' : '#EEF0F1',
        }}
        collapsible
      >
        <div
          style={{
            color: isDark ? '#ffffff' : '#000000',
            padding: 16,
            fontWeight: 600,
          }}
        >
          BlueprintFlow
        </div>
        <Menu
          theme={isDark ? 'dark' : 'light'}
          mode="inline"
          items={items}
          style={{ background: isDark ? '#555555' : '#EEF0F1' }}
        />
      </Sider>
      <Layout>
        <PortalHeader isDark={isDark} />
        <Content
          style={{
            margin: 16,
            background: isDark ? '#555555' : '#EEF0F1',
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
            </Route>
          </Routes>
        </Content>
        <Footer
          style={{
            textAlign: 'center',
            background: isDark ? '#555555' : '#EEF0F1',
            color: isDark ? '#ffffff' : '#000000',
          }}
        >
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            checkedChildren={<MoonOutlined />}
            unCheckedChildren={<SunOutlined />}
          />
        </Footer>
      </Layout>
    </Layout>
  )
}

export default App
