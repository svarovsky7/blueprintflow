import React, { useCallback, useMemo, useState } from 'react'
import { Button, Space, Switch, InputNumber, Tooltip } from 'antd'
import { SettingOutlined, ThunderboltOutlined, DashboardOutlined } from '@ant-design/icons'
import PerformanceTableWrapper from './PerformanceTableWrapper'
import { useBatchUpdater } from './PerformanceBatchUpdater'

// ===== ТИПЫ =====
interface PerformanceConfig {
  enabled: boolean
  batchingEnabled: boolean
  batchDelay: number
  maxBatchSize: number
  displayLimit: number
  smoothScrolling: boolean
  deepMemoization: boolean
  lazyRendering: boolean
}

interface ChessboardPerformanceIntegrationProps {
  data: any[]
  columns: any[]
  originalTableProps?: any
  onCellUpdate?: (key: string, field: string, value: any) => void
  onBatchUpdate?: (updates: Array<{ key: string; field: string; value: any }>) => void
  loading?: boolean
}

// ===== НАСТРОЙКИ ПО УМОЛЧАНИЮ =====
const defaultPerformanceConfig: PerformanceConfig = {
  enabled: false,
  batchingEnabled: true,
  batchDelay: 100,
  maxBatchSize: 50,
  displayLimit: 200,
  smoothScrolling: true,
  deepMemoization: true,
  lazyRendering: false,
}

// ===== ОСНОВНОЙ КОМПОНЕНТ =====
const ChessboardPerformanceIntegration: React.FC<ChessboardPerformanceIntegrationProps> = ({
  data,
  columns,
  originalTableProps = {},
  onCellUpdate,
  onBatchUpdate,
  loading = false,
}) => {
  // Состояние конфигурации производительности
  const [perfConfig, setPerfConfig] = useState<PerformanceConfig>(() => {
    // Загружаем настройки из localStorage
    const saved = localStorage.getItem('chessboard-performance-config')
    if (saved) {
      try {
        return { ...defaultPerformanceConfig, ...JSON.parse(saved) }
      } catch {
        return defaultPerformanceConfig
      }
    }
    // Автоматически включаем режим производительности для больших таблиц
    return {
      ...defaultPerformanceConfig,
      enabled: data.length > 150,
    }
  })

  const [showControls, setShowControls] = useState(false)

  // Сохранение настроек в localStorage
  const saveConfig = useCallback((newConfig: PerformanceConfig) => {
    setPerfConfig(newConfig)
    localStorage.setItem('chessboard-performance-config', JSON.stringify(newConfig))
  }, [])

  // Обработчики изменения настроек
  const updateConfig = useCallback(
    (key: keyof PerformanceConfig, value: any) => {
      saveConfig({ ...perfConfig, [key]: value })
    },
    [perfConfig, saveConfig],
  )

  // Автоматическое определение оптимальных настроек
  const autoOptimize = useCallback(() => {
    const dataSize = data.length
    let optimizedConfig: PerformanceConfig

    if (dataSize > 500) {
      // Большие таблицы - агрессивная оптимизация
      optimizedConfig = {
        enabled: true,
        batchingEnabled: true,
        batchDelay: 50,
        maxBatchSize: 25,
        displayLimit: 200,
        smoothScrolling: false,
        deepMemoization: true,
        lazyRendering: true,
      }
    } else if (dataSize > 200) {
      // Средние таблицы - умеренная оптимизация
      optimizedConfig = {
        enabled: true,
        batchingEnabled: true,
        batchDelay: 100,
        maxBatchSize: 50,
        displayLimit: 200,
        smoothScrolling: true,
        deepMemoization: true,
        lazyRendering: false,
      }
    } else if (dataSize > 100) {
      // Небольшие таблицы - легкая оптимизация
      optimizedConfig = {
        enabled: true,
        batchingEnabled: true,
        batchDelay: 150,
        maxBatchSize: 100,
        displayLimit: -1,
        smoothScrolling: true,
        deepMemoization: false,
        lazyRendering: false,
      }
    } else {
      // Маленькие таблицы - минимальная оптимизация
      optimizedConfig = {
        enabled: false,
        batchingEnabled: false,
        batchDelay: 300,
        maxBatchSize: 100,
        displayLimit: -1,
        smoothScrolling: true,
        deepMemoization: false,
        lazyRendering: false,
      }
    }

    saveConfig(optimizedConfig)
  }, [data.length, saveConfig])

  // Мемоизация статистики производительности
  const performanceStats = useMemo(() => {
    const stats = {
      totalRows: data.length,
      visibleRows:
        perfConfig.displayLimit === -1
          ? data.length
          : Math.min(data.length, perfConfig.displayLimit),
      estimatedPerformance: 'Хорошая',
      recommendedSettings: '',
    }

    if (stats.totalRows > 500) {
      stats.estimatedPerformance = 'Требует оптимизации'
      stats.recommendedSettings = 'Включите все оптимизации'
    } else if (stats.totalRows > 200) {
      stats.estimatedPerformance = 'Умеренная'
      stats.recommendedSettings = 'Рекомендуется батчинг'
    } else if (stats.totalRows > 100) {
      stats.estimatedPerformance = 'Хорошая'
      stats.recommendedSettings = 'Базовые оптимизации'
    } else {
      stats.estimatedPerformance = 'Отличная'
      stats.recommendedSettings = 'Оптимизации не требуются'
    }

    return stats
  }, [data.length, perfConfig.displayLimit])

  // Компонент управления производительностью
  const PerformanceControls = useMemo(
    () => (
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1000,
          background: 'white',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          padding: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          minWidth: 280,
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <strong>Оптимизация производительности</strong>
          <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
            Строки: {performanceStats.totalRows} | Производительность:{' '}
            {performanceStats.estimatedPerformance}
          </div>
        </div>

        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Режим производительности:</span>
            <Switch
              checked={perfConfig.enabled}
              onChange={(checked) => updateConfig('enabled', checked)}
              size="small"
            />
          </div>

          {perfConfig.enabled && (
            <>
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Батчинг обновлений:</span>
                <Switch
                  checked={perfConfig.batchingEnabled}
                  onChange={(checked) => updateConfig('batchingEnabled', checked)}
                  size="small"
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Задержка батчинга (мс):</span>
                <InputNumber
                  value={perfConfig.batchDelay}
                  onChange={(value) => updateConfig('batchDelay', value || 100)}
                  min={50}
                  max={1000}
                  step={50}
                  size="small"
                  style={{ width: 80 }}
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Размер пакета:</span>
                <InputNumber
                  value={perfConfig.maxBatchSize}
                  onChange={(value) => updateConfig('maxBatchSize', value || 50)}
                  min={10}
                  max={200}
                  step={10}
                  size="small"
                  style={{ width: 80 }}
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Лимит строк:</span>
                <InputNumber
                  value={perfConfig.displayLimit}
                  onChange={(value) => updateConfig('displayLimit', value || -1)}
                  min={-1}
                  max={1000}
                  step={50}
                  size="small"
                  style={{ width: 80 }}
                  placeholder="Без лимита"
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Плавный скролл:</span>
                <Switch
                  checked={perfConfig.smoothScrolling}
                  onChange={(checked) => updateConfig('smoothScrolling', checked)}
                  size="small"
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Глубокая мемоизация:</span>
                <Switch
                  checked={perfConfig.deepMemoization}
                  onChange={(checked) => updateConfig('deepMemoization', checked)}
                  size="small"
                />
              </div>

              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>Ленивый рендеринг:</span>
                <Switch
                  checked={perfConfig.lazyRendering}
                  onChange={(checked) => updateConfig('lazyRendering', checked)}
                  size="small"
                />
              </div>
            </>
          )}

          <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 8, marginTop: 8 }}>
            <Button type="primary" size="small" onClick={autoOptimize} block>
              Автооптимизация
            </Button>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4, textAlign: 'center' }}>
              {performanceStats.recommendedSettings}
            </div>
          </div>
        </Space>
      </div>
    ),
    [perfConfig, performanceStats, updateConfig, autoOptimize],
  )

  return (
    <div style={{ position: 'relative' }}>
      {/* Кнопка управления производительностью */}
      <div style={{ position: 'absolute', top: -40, right: 0, zIndex: 100 }}>
        <Space>
          <Tooltip title={`Производительность: ${performanceStats.estimatedPerformance}`}>
            <Button
              type={perfConfig.enabled ? 'primary' : 'default'}
              icon={<ThunderboltOutlined />}
              size="small"
              onClick={() => updateConfig('enabled', !perfConfig.enabled)}
            >
              {perfConfig.enabled ? 'Оптимизация ВКЛ' : 'Оптимизация ВЫКЛ'}
            </Button>
          </Tooltip>

          <Tooltip title="Настройки производительности">
            <Button
              icon={<SettingOutlined />}
              size="small"
              onClick={() => setShowControls(!showControls)}
            >
              Настройки
            </Button>
          </Tooltip>

          <Tooltip title="Автооптимизация">
            <Button icon={<DashboardOutlined />} size="small" type="dashed" onClick={autoOptimize}>
              Авто
            </Button>
          </Tooltip>
        </Space>
      </div>

      {/* Панель управления */}
      {showControls && PerformanceControls}

      {/* Оптимизированная таблица */}
      {perfConfig.enabled ? (
        <PerformanceTableWrapper
          data={data}
          columns={columns}
          onCellUpdate={onCellUpdate}
          onBatchCellUpdate={onBatchUpdate}
          performanceMode={perfConfig.enabled}
          enableBatching={perfConfig.batchingEnabled}
          batchDelay={perfConfig.batchDelay}
          maxBatchSize={perfConfig.maxBatchSize}
          enableDeepMemo={perfConfig.deepMemoization}
          displayLimit={perfConfig.displayLimit}
          smoothScrolling={perfConfig.smoothScrolling}
          lazyRendering={perfConfig.lazyRendering}
          loading={loading}
          {...originalTableProps}
        />
      ) : (
        // Обычная таблица без оптимизаций
        <div className="performance-table-container">
          <originalTableProps.component
            {...originalTableProps}
            dataSource={data}
            columns={columns}
            loading={loading}
          />
        </div>
      )}
    </div>
  )
}

export default React.memo(ChessboardPerformanceIntegration)

// ===== ЭКСПОРТ ТИПОВ =====
export type { PerformanceConfig }
