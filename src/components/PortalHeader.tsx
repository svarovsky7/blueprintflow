import { Layout, Button, Space } from 'antd';
import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons';
import { useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { portalConfig, pageTitles } from '../lib/portalConfig';

const { Header } = Layout;

interface PortalHeaderProps {
  isDark: boolean;
}

export default function PortalHeader({ isDark }: PortalHeaderProps) {
  const { pathname } = useLocation();
  const [userEmail, setUserEmail] = useState<string>('');
  const title = portalConfig.header.showPageTitle ? pageTitles[pathname] ?? '' : '';

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '');
    });
  }, []);

  return (
    <Header
      style={{
        background: isDark ? '#555555' : '#EEF0F1',
        padding: '0 16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: isDark ? '#ffffff' : '#000000',
      }}
    >
      {portalConfig.header.showPageTitle && <span>{title}</span>}
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
