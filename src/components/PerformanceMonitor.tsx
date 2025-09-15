import React, { useState, useEffect, useMemo } from 'react'
import { Card, Progress, Tag, Space, Typography, Tooltip, Button } from 'antd'
import { ThunderboltOutlined, EyeOutlined, DatabaseOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

interface PerformanceStats {
  renderTime: number
  memoryUsage: number
  visibleRows: number
  totalRows: number
  loadedComments: number
  activeQueries: number
}

interface PerformanceMonitorProps {
  stats: PerformanceStats
  isVisible?: boolean
  onToggle?: () => void
}

const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  stats,
  isVisible = false,
  onToggle
}) => {
  const [fps, setFps] = useState(60)
  const [frameCount, setFrameCount] = useState(0)

  // Мониторинг FPS
  useEffect(() => {
    let animationId: number
    let lastTime = performance.now()
    let frameCounter = 0

    const measureFPS = (currentTime: number) => {
      frameCounter++

      if (currentTime - lastTime >= 1000) { // Каждую секунду
        setFps(Math.round((frameCounter * 1000) / (currentTime - lastTime)))
        setFrameCount(frameCounter)
        frameCounter = 0
        lastTime = currentTime
      }

      animationId = requestAnimationFrame(measureFPS)
    }

    if (isVisible) {
      animationId = requestAnimationFrame(measureFPS)
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isVisible])

  // Вычисляем уровни производительности
  const performanceLevel = useMemo(() => {
    const efficiency = (stats.visibleRows / stats.totalRows) * 100

    if (efficiency > 80 && fps > 50 && stats.renderTime < 100) {
      return { level: 'excellent', color: '#52c41a', text: 'Отличная' }
    } else if (efficiency > 60 && fps > 30 && stats.renderTime < 300) {
      return { level: 'good', color: '#1890ff', text: 'Хорошая' }
    } else if (efficiency > 40 && fps > 20 && stats.renderTime < 500) {
      return { level: 'fair', color: '#faad14', text: 'Приемлемая' }
    } else {
      return { level: 'poor', color: '#ff4d4f', text: 'Низкая' }
    }
  }, [stats, fps])

  const memoryUsagePercent = Math.min((stats.memoryUsage / (1024 * 1024 * 100)) * 100, 100) // До 100MB считаем 100%

  if (!isVisible) {
    return (
      <Button
        type="text"
        icon={<ThunderboltOutlined />}
        onClick={onToggle}
        size="small"
        style={{
          position: 'fixed',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          backgroundColor: 'rgba(0,0,0,0.1)',
          borderRadius: '20px'
        }}
      >
        Монитор
      </Button>
    )
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <ThunderboltOutlined />
          <Text strong>Монитор производительности</Text>
          <Tag color={performanceLevel.color}>{performanceLevel.text}</Tag>
        </Space>
      }
      extra={
        <Button type="text" onClick={onToggle} size="small">
          Скрыть
        </Button>
      }
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        width: 350,
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}
    >
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* FPS и время рендера */}
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Tooltip title="Кадров в секунду">
            <Space size="small">
              <ClockCircleOutlined style={{ color: fps > 50 ? '#52c41a' : fps > 30 ? '#faad14' : '#ff4d4f' }} />
              <Text style={{ fontSize: '12px' }}>{fps} FPS</Text>
            </Space>
          </Tooltip>

          <Tooltip title="Время рендера последнего обновления">
            <Space size="small">
              <Text style={{ fontSize: '12px' }}>{stats.renderTime}ms</Text>
            </Space>
          </Tooltip>
        </Space>

        {/* Использование памяти */}
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Space justify="space-between" style={{ width: '100%' }}>
            <Text style={{ fontSize: '12px' }}>Память:</Text>
            <Text style={{ fontSize: '12px' }}>
              {(stats.memoryUsage / (1024 * 1024)).toFixed(1)} MB
            </Text>
          </Space>
          <Progress
            percent={memoryUsagePercent}
            size="small"
            strokeColor={memoryUsagePercent > 80 ? '#ff4d4f' : memoryUsagePercent > 60 ? '#faad14' : '#52c41a'}
            showInfo={false}
          />
        </Space>

        {/* Строки и эффективность */}
        <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
          <Tooltip title="Видимые строки из общего количества">
            <Space size="small">
              <EyeOutlined style={{ color: '#1890ff' }} />
              <Text style={{ fontSize: '12px' }}>
                {stats.visibleRows.toLocaleString('ru-RU')} / {stats.totalRows.toLocaleString('ru-RU')}
              </Text>
            </Space>
          </Tooltip>

          <Tooltip title="Загруженные комментарии">
            <Space size="small">
              <DatabaseOutlined style={{ color: '#722ed1' }} />
              <Text style={{ fontSize: '12px' }}>{stats.loadedComments}</Text>
            </Space>
          </Tooltip>
        </Space>

        {/* Эффективность рендеринга */}
        <Space direction="vertical" size={2} style={{ width: '100%' }}>
          <Space justify="space-between" style={{ width: '100%' }}>
            <Text style={{ fontSize: '12px' }}>Эффективность:</Text>
            <Text style={{ fontSize: '12px' }}>
              {((stats.visibleRows / stats.totalRows) * 100).toFixed(1)}%
            </Text>
          </Space>
          <Progress
            percent={(stats.visibleRows / stats.totalRows) * 100}
            size="small"
            strokeColor={performanceLevel.color}
            showInfo={false}
          />
        </Space>

        {/* Активные запросы */}
        {stats.activeQueries > 0 && (
          <Tooltip title="Активные запросы к серверу">
            <Tag color="processing" style={{ fontSize: '11px' }}>
              {stats.activeQueries} запросов
            </Tag>
          </Tooltip>
        )}

        {/* Рекомендации */}
        {performanceLevel.level === 'poor' && (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            💡 Рекомендация: включите виртуализацию или режим производительности
          </Text>
        )}
      </Space>
    </Card>
  )
}

export default PerformanceMonitor