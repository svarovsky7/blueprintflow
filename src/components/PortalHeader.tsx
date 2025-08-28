import { Layout, Button, Space } from 'antd';
import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const { Header } = Layout;

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/documents': 'Документы',
  '/documents/estimate': 'Шахматка',
  '/documents/estimate-monolith': 'Шахматка монолит',
  '/documents/work-volume': 'ВОР для подрядчиков',
  '/documents/cost': 'Смета',
  '/documents/chessboard': 'Шахматка',
  '/documents/vor': 'ВОР',
  '/library/rd-codes': 'Шифры РД',
  '/library/pd-codes': 'Шифры ПД',
  '/references': 'Единицы измерения',
  '/references/rates': 'Расценки',
  '/documents/documentation': 'Документация',
  '/references/cost-categories': 'Категории затрат',
  '/references/projects': 'Проекты',
  '/references/locations': 'Локализации',
  '/reports': 'Отчёты',
  '/admin': 'Администрирование',
  '/admin/documentation-tags': 'Тэги документации',
  '/admin/statuses': 'Статусы',
  '/admin/disk': 'Диск',
};

const getPageTitle = (path: string): string => {
  const matched = Object.keys(pageTitles)
    .sort((a, b) => b.length - a.length)
    .find((route) => path.startsWith(route));
  return matched ? pageTitles[matched] : '';
};

export default function PortalHeader() {
  const { pathname } = useLocation();
  const [userEmail, setUserEmail] = useState<string>('');

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  return (
    <Header
      style={{
        background: '#D8BFD8',
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: '#000000',
      }}
    >
        <div style={{ fontSize: '16px', fontWeight: 500 }}>
          <span style={{ fontWeight: 600 }}>BlueprintFlow</span>
          {getPageTitle(pathname) && (
            <>
              <span style={{ margin: '0 8px', opacity: 0.5 }}>/</span>
              <span>{getPageTitle(pathname)}</span>
            </>
          )}
        </div>
      <Space size="middle">
        <Button type="text" icon={<BellOutlined />} />
        <Space>
          <UserOutlined />
          <span>{userEmail}</span>
        </Space>
        <Button
          type="text"
          icon={<LogoutOutlined />}
          onClick={() => supabase?.auth.signOut()}
          disabled={!supabase}
        />
      </Space>
    </Header>
  );
}
