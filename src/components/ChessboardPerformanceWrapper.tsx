import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Divider, Space, Button, Typography } from 'antd'
import { SettingOutlined } from '@ant-design/icons'
import ChessboardOptimized from './ChessboardOptimized'
import PerformanceMonitor from './PerformanceMonitor'
import { usePerformanceMetrics } from '../hooks/usePerformanceMetrics'
import { useServerPagination } from '../hooks/useServerPagination'

const { Text } = Typography

interface ChessboardPerformanceWrapperProps {
  // Оригинальные пропсы Шахматки
  originalTable: React.ReactElement
  data: any[]
  columns: any[]
  loading?: boolean
  filters?: {
    projectId?: string
    blockId?: string[]
    categoryId?: string[]
    typeId?: string[]
    tagId?: string[]
    documentationId?: string[]
    search?: string
  }
  // Настройки производительности
  enableServerPagination?: boolean
  enableVirtualization?: boolean
  enablePerformanceMonitor?: boolean
}

const ChessboardPerformanceWrapper: React.FC<ChessboardPerformanceWrapperProps> = ({
  originalTable,
  data,
  columns,
  loading = false,
  filters = {},
  enableServerPagination = false,
  enableVirtualization = true,
  enablePerformanceMonitor = true,
}) => {
  const { metrics, startMeasure, endMeasure, markRender } = usePerformanceMetrics()
  const [showMonitor, setShowMonitor] = useState(false)
  const [renderCount, setRenderCount] = useState(0)

  // Серверная пагинация (опционально)
  const serverPagination = useServerPagination({
    table: 'chessboard',
    filters,
    enabled: enableServerPagination,
    defaultPageSize: 200,
  })

  // Выбираем источник данных
  const effectiveData = enableServerPagination ? serverPagination.data : data
  const effectiveLoading = enableServerPagination ? serverPagination.loading : loading

  // Измеряем производительность рендеринга
  useEffect(() => {
    startMeasure('chessboard-render')
    const timeoutId = setTimeout(() => {
      endMeasure('chessboard-render')
      markRender()
      setRenderCount((prev) => prev + 1)
    }, 0)

    return () => clearTimeout(timeoutId)
  }, [effectiveData, startMeasure, endMeasure, markRender])

  // Статистика для монитора производительности
  const performanceStats = useMemo(
    () => ({
      renderTime: metrics.renderTime,
      memoryUsage: metrics.memoryUsage,
      visibleRows: enableVirtualization ? Math.min(50, effectiveData.length) : effectiveData.length,
      totalRows: effectiveData.length,
      loadedComments: 0, // Будет обновляться из hook'а комментариев
      activeQueries: effectiveLoading ? 1 : 0,
    }),
    [metrics, enableVirtualization, effectiveData.length, effectiveLoading],
  )

  // Автоматическое включение оптимизаций
  const optimizationRecommendations = useMemo(() => {
    const recommendations = []

    if (effectiveData.length > 1000 && !enableVirtualization) {
      recommendations.push('Включите виртуализацию для улучшения производительности')
    }

    if (effectiveData.length > 500 && !enableServerPagination) {
      recommendations.push('Рекомендуется серверная пагинация для больших объемов данных')
    }

    if (metrics.renderTime > 500) {
      recommendations.push(
        'Время рендеринга превышает рекомендуемое. Попробуйте режим производительности',
      )
    }

    return recommendations
  }, [effectiveData.length, enableVirtualization, enableServerPagination, metrics.renderTime])

  const handleToggleMonitor = useCallback(() => {
    setShowMonitor((prev) => !prev)
  }, [])

  return (
    <>
      {/* Информационная панель */}
      {optimizationRecommendations.length > 0 && (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: '#fffbe6',
            border: '1px solid #ffe58f',
            borderRadius: '6px',
            marginBottom: '16px',
          }}
        >
          <Space direction="vertical" size="small">
            <Text strong style={{ color: '#d48806' }}>
              💡 Рекомендации по производительности:
            </Text>
            {optimizationRecommendations.map((rec, index) => (
              <Text key={index} style={{ fontSize: '12px', color: '#ad6800' }}>
                • {rec}
              </Text>
            ))}
          </Space>
        </div>
      )}

      {/* Краткая статистика */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
          padding: '8px 12px',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        <Space size="large">
          <Text type="secondary">Строк: {effectiveData.length.toLocaleString('ru-RU')}</Text>
          <Text type="secondary">Рендеров: {renderCount}</Text>
          <Text type="secondary">Время: {metrics.renderTime}ms</Text>
          {enableServerPagination && (
            <Text type="secondary">Страница: {serverPagination.pagination.current}</Text>
          )}
        </Space>

        {enablePerformanceMonitor && (
          <Button type="text" icon={<SettingOutlined />} onClick={handleToggleMonitor} size="small">
            Монитор
          </Button>
        )}
      </div>

      {/* Основная таблица */}
      <ChessboardOptimized
        originalTable={originalTable}
        data={effectiveData}
        columns={columns}
        loading={effectiveLoading}
      />

      {/* Пагинация для серверной пагинации */}
      {enableServerPagination && (
        <div style={{ marginTop: '16px', textAlign: 'right' }}>
          <Divider style={{ margin: '16px 0' }} />
          {/* Здесь будет компонент пагинации */}
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Серверная пагинация активна
          </Text>
        </div>
      )}

      {/* Монитор производительности */}
      {enablePerformanceMonitor && (
        <PerformanceMonitor
          stats={performanceStats}
          isVisible={showMonitor}
          onToggle={handleToggleMonitor}
        />
      )}
    </>
  )
}

export default ChessboardPerformanceWrapper
