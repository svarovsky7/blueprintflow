import { Layout, Button, Space } from 'antd';
import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const { Header } = Layout;

const breadcrumbs: Record<string, string[]> = {
  '/': ['Dashboard'],
  '/documents': ['Документы'],
  '/documents/chessboard': ['Документы', 'Шахматка'],
  '/documents/vor': ['Документы', 'ВОР'],
  '/references': ['Справочники'],
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
        background: '#f9f0ff',
        color: '#722ed1',
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>{breadcrumbs[pathname]?.join(' / ') || ''}</span>
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
