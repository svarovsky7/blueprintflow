import React from 'react'
import { Space, Switch, Select, Typography, Tooltip, Divider } from 'antd'
import { ThunderboltOutlined, TableOutlined, EyeOutlined } from '@ant-design/icons'

const { Text } = Typography

interface PerformanceControlsProps {
  // Виртуализация
  useVirtualization: boolean
  onVirtualizationChange: (enabled: boolean) => void
  virtualRowHeight: number
  onVirtualRowHeightChange: (height: number) => void

  // Режим производительности
  performanceMode: boolean
  onPerformanceModeChange: (enabled: boolean) => void

  // Количество строк для отображения (без виртуализации)
  displayRowLimit: number
  onDisplayRowLimitChange: (limit: number) => void

  // Статистика
  totalRows: number
  visibleRows: number
}

const PerformanceControls: React.FC<PerformanceControlsProps> = ({
  useVirtualization,
  onVirtualizationChange,
  virtualRowHeight,
  onVirtualRowHeightChange,
  performanceMode,
  onPerformanceModeChange,
  displayRowLimit,
  onDisplayRowLimitChange,
  totalRows,
  visibleRows,
}) => {
  return (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Divider style={{ margin: '8px 0', fontSize: '12px' }} orientation="left">
        <Space size="small">
          <ThunderboltOutlined />
          <Text style={{ fontSize: '12px', fontWeight: 500 }}>Производительность</Text>
        </Space>
      </Divider>

      {/* Статистика */}
      <Space size="large" style={{ fontSize: '11px', color: '#666' }}>
        <Text type="secondary">
          Всего строк: <strong>{totalRows.toLocaleString('ru-RU')}</strong>
        </Text>
        <Text type="secondary">
          Отображается: <strong>{visibleRows.toLocaleString('ru-RU')}</strong>
        </Text>
      </Space>

      {/* Виртуализация */}
      <Space size="small" align="center">
        <TableOutlined style={{ fontSize: '12px', color: '#1890ff' }} />
        <Text style={{ fontSize: '12px' }}>Виртуализация:</Text>
        <Switch
          size="small"
          checked={useVirtualization}
          onChange={onVirtualizationChange}
        />
        {useVirtualization && (
          <Tooltip title="Высота строки в виртуальной таблице">
            <Select
              size="small"
              value={virtualRowHeight}
              onChange={onVirtualRowHeightChange}
              style={{ width: 65 }}
              options={[
                { value: 40, label: '40px' },
                { value: 48, label: '48px' },
                { value: 54, label: '54px' },
                { value: 60, label: '60px' },
              ]}
            />
          </Tooltip>
        )}
      </Space>

      {/* Лимит отображения (без виртуализации) */}
      {!useVirtualization && (
        <Space size="small" align="center">
          <EyeOutlined style={{ fontSize: '12px', color: '#52c41a' }} />
          <Text style={{ fontSize: '12px' }}>Лимит строк:</Text>
          <Select
            size="small"
            value={displayRowLimit}
            onChange={onDisplayRowLimitChange}
            style={{ width: 80 }}
            options={[
              { value: 50, label: '50' },
              { value: 100, label: '100' },
              { value: 200, label: '200' },
              { value: 500, label: '500' },
              { value: 1000, label: '1000' },
              { value: -1, label: 'Все' },
            ]}
          />
          {displayRowLimit > 0 && totalRows > displayRowLimit && (
            <Text type="warning" style={{ fontSize: '11px' }}>
              ({totalRows - displayRowLimit} скрыто)
            </Text>
          )}
        </Space>
      )}

      {/* Режим производительности */}
      <Space size="small" align="center">
        <ThunderboltOutlined style={{ fontSize: '12px', color: '#fa8c16' }} />
        <Text style={{ fontSize: '12px' }}>Режим производительности:</Text>
        <Switch
          size="small"
          checked={performanceMode}
          onChange={onPerformanceModeChange}
        />
        {performanceMode && (
          <Text type="secondary" style={{ fontSize: '10px' }}>
            (упрощенные фильтры и сортировка)
          </Text>
        )}
      </Space>

      {/* Рекомендации */}
      {totalRows > 200 && !useVirtualization && (
        <Text type="warning" style={{ fontSize: '11px' }}>
          💡 Рекомендуется виртуализация для {totalRows.toLocaleString('ru-RU')} строк
        </Text>
      )}

      {totalRows > 500 && !performanceMode && (
        <Text type="warning" style={{ fontSize: '11px' }}>
          ⚡ Включите режим производительности для ускорения работы
        </Text>
      )}
    </Space>
  )
}

export default React.memo(PerformanceControls)