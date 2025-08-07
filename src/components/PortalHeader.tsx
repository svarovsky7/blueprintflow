import { Layout, Button, Space } from 'antd';
import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const { Header } = Layout;

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/documents': 'Документы',
  '/documents/chessboard': 'Шахматка',
  '/documents/vor': 'ВОР',
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
        background: '#f5f5f5',
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <span>{pageTitles[pathname] || ''}</span>
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
