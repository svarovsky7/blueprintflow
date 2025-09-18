import React, { useMemo, useCallback, useState, useEffect } from 'react'
import VirtualizedTable from './VirtualizedTable'
import VirtualTableOptimized from './VirtualTableOptimized'
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
  // Состояние редактирования для корректной работы render функций
  editingRows?: Record<string, any>
  // Ключ для принудительного перерендера
  forceRerenderKey?: number
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
  editingRows = {},
  forceRerenderKey = 0,
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

  // 🚨 ВРЕМЕННО ОТКЛЮЧЕНО: Виртуализация создаёт проблемы с производительностью
  // Возвращаемся к SmartTableOptimizer с жёстким ограничением строк
  const shouldUseVirtualization = false // data.length > 500 // Отключено временно

  // console.log(`🔧 ChessboardOptimized: ${data.length} rows, using ${shouldUseVirtualization ? 'VIRTUALIZATION' : 'SMART_TABLE_OPTIMIZED'}`)

  // Временно отключено до исправления проблем с производительностью
  // if (shouldUseVirtualization) {
  //   console.log('🚀 Using VirtualTableOptimized for large dataset')
  //   return (
  //     <VirtualTableOptimized
  //       {...originalTable.props}
  //       dataSource={data}
  //       columns={optimizedColumns}
  //       height="calc(100vh - 300px)"
  //       itemHeight={virtualRowHeight}
  //       bufferSize={20}
  //       editingRows={editingRows}
  //       performanceMode={performanceMode}
  //       loading={loading}
  //     />
  //   )
  // }

  // Для небольших объёмов используем SmartTableOptimizer
  const smartTableProps = {
    ...originalTable.props,
    data,
    columns,
    displayLimit: displayRowLimit,
    performanceMode,
    loading,
    useAdaptiveHeight: true,
    controlsHeight: scaledControlsHeight,
    rowsPerPage,
    onRowsPerPageChange,
    editingRows, // Явно переопределяем editingRows последним
    forceRerenderKey,
  }

  // console.log('🔧 SmartTableOptimizer props editingRows:', Object.keys(smartTableProps.editingRows || {}).length > 0 ? Object.keys(smartTableProps.editingRows) : 'empty')

  return (
    <SmartTableOptimizer {...smartTableProps} />
  )

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
