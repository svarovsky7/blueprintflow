import { Card, Col, Row, Statistic, Progress, Typography, Space, Skeleton } from 'antd'
import { 
  ProjectOutlined, CheckCircleOutlined, ClockCircleOutlined, 
  TeamOutlined, DollarOutlined, RiseOutlined, FallOutlined,
  FileTextOutlined, WarningOutlined
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

const { Title, Text } = Typography

interface StatCardProps {
  title: string
  value: number | string
  prefix?: React.ReactNode
  suffix?: string
  trend?: number
  loading?: boolean
  color?: string
  icon?: React.ReactNode
}

const StatCard = ({ 
  title, 
  value, 
  prefix, 
  suffix, 
  trend, 
  loading = false,
  color = '#3b82f6',
  icon
}: StatCardProps) => {
  const isPositive = trend && trend > 0

  return (
    <Card 
      style={{ 
        borderRadius: 12,
        height: '100%',
        background: `linear-gradient(135deg, ${color}08 0%, ${color}03 100%)`,
        borderLeft: `4px solid ${color}`,
      }}
      bodyStyle={{ padding: 20 }}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 2 }} />
      ) : (
        <>
          <Space align="start" style={{ width: '100%', justifyContent: 'space-between' }}>
            <div style={{ flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase' }}>
                {title}
              </Text>
              <Statistic
                value={value}
                prefix={prefix}
                suffix={suffix}
                valueStyle={{ fontSize: 28, fontWeight: 600, color }}
              />
              {trend !== undefined && (
                <Space style={{ marginTop: 8 }}>
                  {isPositive ? (
                    <RiseOutlined style={{ color: '#52c41a' }} />
                  ) : (
                    <FallOutlined style={{ color: '#f5222d' }} />
                  )}
                  <Text style={{ color: isPositive ? '#52c41a' : '#f5222d', fontSize: 14 }}>
                    {Math.abs(trend)}% vs прошлый месяц
                  </Text>
                </Space>
              )}
            </div>
            {icon && (
              <div style={{ 
                fontSize: 32, 
                color, 
                opacity: 0.3,
                marginLeft: 16
              }}>
                {icon}
              </div>
            )}
          </Space>
        </>
      )}
    </Card>
  )
}

const DashboardImproved = () => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      if (!supabase) return null
      
      // Получаем статистику по проектам
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { head: true, count: 'exact' })
      
      // Получаем статистику по шахматке
      const { count: chessboardCount } = await supabase
        .from('chessboard')
        .select('*', { head: true, count: 'exact' })
      
      // Получаем статистику по документам
      const { count: documentsCount } = await supabase
        .from('chessboard_mapping')
        .select('*', { head: true, count: 'exact' })

      return {
        projects: projectsCount || 0,
        chessboard: chessboardCount || 0,
        documents: documentsCount || 0,
        completedWorks: Math.floor((chessboardCount || 0) * 0.7),
        inProgress: Math.floor((chessboardCount || 0) * 0.2),
        pending: Math.floor((chessboardCount || 0) * 0.1),
      }
    },
    enabled: !!supabase,
  })

  const greeting = () => {
    const hour = currentTime.getHours()
    if (hour < 12) return 'Доброе утро'
    if (hour < 18) return 'Добрый день'
    return 'Добрый вечер'
  }

  const projectProgress = stats ? Math.round((stats.completedWorks / (stats.chessboard || 1)) * 100) : 0

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header Section */}
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col span={24}>
          <Card 
            style={{ 
              borderRadius: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
            }}
            bodyStyle={{ padding: '32px 40px' }}
          >
            <Row align="middle">
              <Col flex="auto">
                <Title level={2} style={{ color: '#ffffff', marginBottom: 8 }}>
                  {greeting()}! 👋
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
                  Сегодня {currentTime.toLocaleDateString('ru-RU', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </Col>
              <Col>
                <div style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={projectProgress}
                    strokeColor={{
                      '0%': '#108ee9',
                      '100%': '#87d068',
                    }}
                    strokeWidth={8}
                    width={120}
                    format={(percent) => (
                      <span style={{ color: '#ffffff', fontSize: 24, fontWeight: 600 }}>
                        {percent}%
                      </span>
                    )}
                  />
                  <div style={{ color: 'rgba(255,255,255,0.9)', marginTop: 8 }}>
                    Общий прогресс
                  </div>
                </div>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Main Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Активные проекты"
            value={stats?.projects || 0}
            icon={<ProjectOutlined />}
            color="#6366f1"
            trend={12}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Выполненные работы"
            value={stats?.completedWorks || 0}
            icon={<CheckCircleOutlined />}
            color="#10b981"
            trend={8}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="В процессе"
            value={stats?.inProgress || 0}
            icon={<ClockCircleOutlined />}
            color="#f59e0b"
            trend={-5}
            loading={isLoading}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatCard
            title="Документов"
            value={stats?.documents || 0}
            icon={<FileTextOutlined />}
            color="#8b5cf6"
            trend={15}
            loading={isLoading}
          />
        </Col>
      </Row>

      {/* Secondary Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title="Статистика по материалам"
            style={{ borderRadius: 12, height: '100%' }}
            bodyStyle={{ padding: 20 }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Statistic
                  title="Всего позиций"
                  value={stats?.chessboard || 0}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Обработано"
                  value={stats?.completedWorks || 0}
                  valueStyle={{ color: '#3f8600' }}
                  prefix={<CheckCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="В работе"
                  value={stats?.inProgress || 0}
                  valueStyle={{ color: '#faad14' }}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Ожидает"
                  value={stats?.pending || 0}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<WarningOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>
        
        <Col xs={24} lg={12}>
          <Card 
            title="Эффективность"
            style={{ borderRadius: 12, height: '100%' }}
            bodyStyle={{ padding: 20 }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Выполнение плана</Text>
                  <Text strong>{projectProgress}%</Text>
                </div>
                <Progress 
                  percent={projectProgress} 
                  strokeColor="#52c41a"
                  showInfo={false}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Качество данных</Text>
                  <Text strong>92%</Text>
                </div>
                <Progress 
                  percent={92} 
                  strokeColor="#1890ff"
                  showInfo={false}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>Скорость обработки</Text>
                  <Text strong>78%</Text>
                </div>
                <Progress 
                  percent={78} 
                  strokeColor="#faad14"
                  showInfo={false}
                />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      {/* Quick Actions */}
      <Row>
        <Col span={24}>
          <Card 
            title="Быстрые действия"
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: 20 }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card 
                  hoverable 
                  style={{ 
                    textAlign: 'center', 
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)'
                  }}
                >
                  <ProjectOutlined style={{ fontSize: 32, color: '#6366f1', marginBottom: 8 }} />
                  <div>Новый проект</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card 
                  hoverable 
                  style={{ 
                    textAlign: 'center', 
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #10b98115 0%, #10b98115 100%)'
                  }}
                >
                  <FileTextOutlined style={{ fontSize: 32, color: '#10b981', marginBottom: 8 }} />
                  <div>Импорт данных</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card 
                  hoverable 
                  style={{ 
                    textAlign: 'center', 
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #f59e0b15 0%, #f59e0b15 100%)'
                  }}
                >
                  <TeamOutlined style={{ fontSize: 32, color: '#f59e0b', marginBottom: 8 }} />
                  <div>Управление командой</div>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card 
                  hoverable 
                  style={{ 
                    textAlign: 'center', 
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #8b5cf615 0%, #8b5cf615 100%)'
                  }}
                >
                  <DollarOutlined style={{ fontSize: 32, color: '#8b5cf6', marginBottom: 8 }} />
                  <div>Финансовый отчет</div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default DashboardImproved