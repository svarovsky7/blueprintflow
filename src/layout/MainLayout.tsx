import { useEffect, useState } from 'react';
import { Layout, Menu, Button, Space } from 'antd';
import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import type { MenuProps } from 'antd';
import { supabase } from '../supabaseClient';

const { Sider, Content, Header } = Layout;

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
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  const routeTitles: Record<string, string> = {
    '/': 'Dashboard',
    '/documents/estimate': 'Шахматка',
    '/documents/estimate-monolith': 'Шахматка монолит',
    '/documents/work-volume': 'ВОР для подрядчиков',
    '/documents/cost': 'Смета',
    '/library/docs': 'Документация',
    '/library/rd-codes': 'Шифры РД',
    '/library/pd-codes': 'Шифры ПД',
    '/references': 'Справочники',
    '/reports': 'Отчёты',
    '/admin': 'Администрирование',
    '/admin/users': 'Пользователи',
    '/admin/departments': 'Подразделения',
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible className="app-sider">
        <div style={{ color: '#003a8c', padding: 16, fontWeight: 600 }}>Blueprintflow</div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname.startsWith('/admin') ? '/admin' : location.pathname]}
          items={items}
        />
      </Sider>
      <Layout>
        <Header className="app-header">
          <div>{routeTitles[location.pathname] || ''}</div>
          <Space size="middle">
            <BellOutlined />
            <Space>
              <UserOutlined />
              <span>{userEmail ?? 'Гость'}</span>
            </Space>
            <Button type="text" icon={<LogoutOutlined />} onClick={handleLogout}>
              Выход
            </Button>
          </Space>
        </Header>
        <Content style={{ margin: '16px' }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
