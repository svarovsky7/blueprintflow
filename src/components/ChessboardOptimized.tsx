import React, { useMemo, useCallback, useState, useEffect } from 'react'
import VirtualizedTable from './VirtualizedTable'
import SmartTableOptimizer from './SmartTableOptimizer'
import { useVirtualizedChessboard } from '../hooks/useVirtualizedChessboard'
import { useScale } from '@/shared/contexts/ScaleContext'

interface ChessboardOptimizedProps {
  originalTable: React.ReactElement
  data: any[]
  columns: any[]
  loading?: boolean
  // Новые пропсы для ручного управления
  useVirtualization?: boolean
  onVirtualizationChange?: (enabled: boolean) => void
  virtualRowHeight?: number
  performanceMode?: boolean
  onPerformanceModeChange?: (enabled: boolean) => void
  displayRowLimit?: number
  // Пропсы для пагинации
  rowsPerPage?: number
  onRowsPerPageChange?: (value: number) => void
}

const ChessboardOptimized: React.FC<ChessboardOptimizedProps> = ({
  originalTable,
  data,
  columns,
  loading,
  useVirtualization: externalUseVirtualization,
  onVirtualizationChange,
  virtualRowHeight = 54,
  performanceMode: externalPerformanceMode,
  onPerformanceModeChange,
  displayRowLimit = 200,
  rowsPerPage,
  onRowsPerPageChange,
}) => {
  const { scale } = useScale()

  // Используем внешнее управление, если предоставлено
  const useVirtualization = externalUseVirtualization ?? false
  const performanceMode = externalPerformanceMode ?? false

  // Масштабируемая высота элементов управления (75px для масштаба 1.0)
  const scaledControlsHeight = useMemo(() => Math.round(75 * scale), [scale])

  const { visibleData, handleVisibleRangeChange, stats } = useVirtualizedChessboard({
    data,
    enabled: useVirtualization,
  })

  // Оптимизированные столбцы для виртуализации
  const optimizedColumns = useMemo(() => {
    if (!useVirtualization) return columns

    return columns.map((col) => ({
      ...col,
      // Отключаем сложные фильтры в режиме виртуализации
      filters: performanceMode ? undefined : col.filters,
      filterDropdown: performanceMode ? undefined : col.filterDropdown,
      // Упрощаем сортировку
      sorter: performanceMode ? false : col.sorter,
    }))
  }, [columns, useVirtualization, performanceMode])

  // Удаляем автоматические переключения - теперь все управляется извне

  // Временно отключаем виртуализацию - фокус на оптимизации без виртуализации
  // if (!useVirtualization) {
    // Используем SmartTableOptimizer для обычных таблиц
    return (
      <SmartTableOptimizer
        {...originalTable.props}
        data={data}
        columns={columns}
        displayLimit={displayRowLimit}
        performanceMode={performanceMode}
        loading={loading}
        useAdaptiveHeight={true}
        controlsHeight={scaledControlsHeight} // масштабируемая высота для элементов управления и пагинации
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={onRowsPerPageChange}
      />
    )
  // }

  // Временно отключено - используем виртуализированную таблицу
  // return (
  //   <VirtualizedTable
  //     columns={optimizedColumns}
  //     dataSource={visibleData}
  //     height={'calc(100vh - 300px)'}
  //     loading={loading}
  //     rowHeight={virtualRowHeight}
  //     sticky
  //     scroll={{ y: 'calc(100vh - 300px)' }}
  //     className="chessboard-virtualized"
  //   />
  // )
}

export default ChessboardOptimized
