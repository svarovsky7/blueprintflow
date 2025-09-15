import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { Switch, Alert, Space, Typography } from 'antd'
import VirtualizedTable from './VirtualizedTable'
import { useVirtualizedChessboard } from '../hooks/useVirtualizedChessboard'

const { Text } = Typography

interface ChessboardOptimizedProps {
  originalTable: React.ReactElement
  data: any[]
  columns: any[]
  loading?: boolean
}

const ChessboardOptimized: React.FC<ChessboardOptimizedProps> = ({
  originalTable,
  data,
  columns,
  loading
}) => {
  const [useVirtualization, setUseVirtualization] = useState(() => {
    // Автоматически включаем виртуализацию для больших таблиц
    return data.length > 200
  })

  const [performanceMode, setPerformanceMode] = useState(false)

  const {
    visibleData,
    handleVisibleRangeChange,
    stats
  } = useVirtualizedChessboard({
    data,
    enabled: useVirtualization
  })

  // Оптимизированные столбцы для виртуализации
  const optimizedColumns = useMemo(() => {
    if (!useVirtualization) return columns

    return columns.map(col => ({
      ...col,
      // Отключаем сложные фильтры в режиме виртуализации
      filters: performanceMode ? undefined : col.filters,
      filterDropdown: performanceMode ? undefined : col.filterDropdown,
      // Упрощаем сортировку
      sorter: performanceMode ? false : col.sorter
    }))
  }, [columns, useVirtualization, performanceMode])

  // Автоматическое переключение в режим производительности
  useEffect(() => {
    if (data.length > 1000 && !performanceMode) {
      setPerformanceMode(true)
      setUseVirtualization(true)
    }
  }, [data.length, performanceMode])

  const handleVirtualizationToggle = useCallback((checked: boolean) => {
    setUseVirtualization(checked)
    if (!checked) {
      setPerformanceMode(false)
    }
  }, [])

  const renderPerformanceAlert = () => {
    if (data.length <= 200) return null

    return (
      <Alert
        type={data.length > 1000 ? 'warning' : 'info'}
        showIcon
        message={
          <Space direction="vertical" size="small">
            <Text>
              {data.length > 1000
                ? `Обнаружено ${data.length.toLocaleString()} строк. Автоматически включена оптимизация производительности.`
                : `Таблица содержит ${data.length.toLocaleString()} строк. Рекомендуется включить виртуализацию.`
              }
            </Text>
            <Space>
              <Text>Виртуализация:</Text>
              <Switch
                checked={useVirtualization}
                onChange={handleVirtualizationToggle}
                size="small"
              />
              {useVirtualization && (
                <>
                  <Text>Режим производительности:</Text>
                  <Switch
                    checked={performanceMode}
                    onChange={setPerformanceMode}
                    size="small"
                  />
                </>
              )}
            </Space>
            {useVirtualization && (
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Видимые строки: {stats.visibleItems} / {stats.totalItems} |
                Загружено комментариев: {stats.loadedComments}
              </Text>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      />
    )
  }

  if (!useVirtualization) {
    return (
      <>
        {renderPerformanceAlert()}
        {originalTable}
      </>
    )
  }

  return (
    <>
      {renderPerformanceAlert()}
      <VirtualizedTable
        columns={optimizedColumns}
        dataSource={visibleData}
        height={600}
        loading={loading}
        rowHeight={54}
        sticky
        scroll={{ y: 600 }}
        className="chessboard-virtualized"
      />
    </>
  )
}

export default ChessboardOptimized