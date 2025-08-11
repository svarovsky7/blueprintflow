import { Layout, Menu } from 'antd'
import { Link, Route, Routes } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import Chessboard from './pages/documents/Chessboard'
import Vor from './pages/documents/Vor'
import References from './pages/References'
import Units from './pages/references/Units'
import Projects from './pages/references/Projects'
import PortalHeader from './components/PortalHeader'

const { Sider, Content } = Layout

const App = () => {
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
        { key: 'projects', label: <Link to="/references/projects">Проекты</Link> },
      ],
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" style={{ background: '#e6f7ff' }} collapsible>
        <div style={{ color: '#000', padding: 16, fontWeight: 600 }}>BlueprintFlow</div>
        <Menu theme="light" mode="inline" items={items} />
      </Sider>
      <Layout>
        <PortalHeader />
        <Content style={{ margin: 16 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />}> 
              <Route path="chessboard" element={<Chessboard />} />
              <Route path="vor" element={<Vor />} />
            </Route>
            <Route path="/references" element={<References />}> 
              <Route index element={<Units />} />
              <Route path="projects" element={<Projects />} />
            </Route>
          </Routes>
        </Content>
      </Layout>
    </Layout>
  )
}

export default App
console.log(
    'URL:', import.meta.env.VITE_SUPABASE_URL,
    'KEY:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY
)