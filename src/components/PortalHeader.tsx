import { Layout, Button, Space } from 'antd'
import { BellOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useScale } from '../shared/contexts/ScaleContext'

const { Header } = Layout

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/documents': 'Документы',
  '/documents/estimate': 'Шахматка',
  '/documents/estimate-monolith': 'Шахматка монолит',
  '/documents/work-volume': 'ВОР для подрядчиков',
  '/documents/cost': 'Смета',
  '/documents/chessboard': 'Шахматка',
  '/documents/vor': 'ВОР',
  '/documents/vor-view': 'Просмотр ВОР',
  '/library/rd-codes': 'Шифры РД',
  '/library/pd-codes': 'Шифры ПД',
  '/references': 'Единицы измерения',
  '/references/rates': 'Расценки',
  '/references/nomenclature': 'Номенклатура',
  '/documents/documentation': 'Документация',
  '/references/cost-categories': 'Категории затрат',
  '/references/projects': 'Проекты',
  '/references/locations': 'Локализации',
  '/reports/project-analysis': 'Анализ документации',
  '/reports': 'Отчёты',
  '/admin': 'Настройки',
  '/admin/documentation-tags': 'Тэги документации',
  '/admin/statuses': 'Статусы',
  '/admin/disk': 'Диск',
  '/admin/portal-settings': 'Настройка портала',
}

const getPageTitle = (path: string): string => {
  const matched = Object.keys(pageTitles)
    .sort((a, b) => b.length - a.length)
    .find((route) => path.startsWith(route))
  return matched ? pageTitles[matched] : ''
}

interface PortalHeaderProps {
  isDark: boolean
}

export default function PortalHeader({ isDark }: PortalHeaderProps) {
  const { pathname } = useLocation()
  const [userEmail, setUserEmail] = useState<string>('')
  const { scale } = useScale()

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? '')
    })
  }, [])

  return (
    <Header
      className="header"
      style={{
        background: isDark ? '#555555' : '#f0edf2',
        padding: `0 ${16 * scale}px`,
        height: `${64 * scale}px`,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        color: isDark ? '#ffffff' : '#000000',
      }}
    >
      <div style={{ fontSize: `${16 * scale}px`, fontWeight: 500 }}>
        <span style={{ fontWeight: 600 }}>BlueprintFlow</span>
        {getPageTitle(pathname) && (
          <>
            <span style={{ margin: `0 ${8 * scale}px`, opacity: 0.5 }}>/</span>
            <span>{getPageTitle(pathname)}</span>
          </>
        )}
      </div>
      <Space size={16 * scale}>
        <Button type="text" icon={<BellOutlined />} />
        <Space size={4 * scale}>
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
  )
}
