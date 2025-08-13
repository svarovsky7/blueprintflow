import { Layout, Menu, theme } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import PortalHeader from '../components/PortalHeader';

const { Sider, Content } = Layout;

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
      { key: '/documents/estimate-monolith', label: <Link to="/documents/estimate-monolith">Шахматка монолит</Link> },
      { key: '/documents/work-volume', label: <Link to="/documents/work-volume">ВОР для подрядчиков</Link> },
      { key: '/documents/cost', label: <Link to="/documents/cost">Смета</Link> },
    ],
  },
  {
    key: 'library',
    label: 'Библиотека',
    children: [
      { key: '/library/docs', label: <Link to="/library/docs">Документация</Link> },
      { key: '/library/rd-codes', label: <Link to="/library/rd-codes">Шифры РД</Link> },
      { key: '/library/pd-codes', label: <Link to="/library/pd-codes">Шифры ПД</Link> },
    ],
  },
  { key: '/references', label: <Link to="/references">Справочники</Link> },
  { key: '/reports', label: <Link to="/reports">Отчёты</Link> },
  { key: '/admin', label: <Link to="/admin">Администрирование</Link> },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { token } = theme.useToken();
  const menuTheme = token.colorBgContainer === '#141414' ? 'dark' : 'light';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme={menuTheme}
        style={{ background: token.colorBgContainer }}
        collapsible
      >
        <div
          style={{ color: token.colorText, padding: 16, fontWeight: 600 }}
        >
          BlueprintFlow
        </div>
        <Menu
          theme={menuTheme}
          mode="inline"
          selectedKeys={[location.pathname]}
          items={items}
        />
      </Sider>
      <Layout>
        <PortalHeader />
        <Content style={{ margin: '16px' }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
