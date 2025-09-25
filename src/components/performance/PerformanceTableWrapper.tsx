import React, { useMemo, useCallback } from 'react'
import { Table } from 'antd'
import type { TableProps } from 'antd'
import SmartTableOptimizer from '../SmartTableOptimizer'
import { useBatchUpdater } from './PerformanceBatchUpdater'
import {
  MemoizedSelect,
  MemoizedInput,
  MemoizedInputNumber,
  MemoizedAutoComplete,
  QuantityInput,
  MaterialSelect,
  NomenclatureSelect,
} from './MemoizedTableCells'
import './SmoothScrollOptimizations.css'

// ===== ТИПЫ =====
interface PerformanceTableWrapperProps extends Omit<TableProps<any>, 'dataSource' | 'columns'> {
  data: any[]
  columns: any[]
  onCellUpdate?: (key: string, field: string, value: any) => void
  onBatchCellUpdate?: (updates: Array<{ key: string; field: string; value: any }>) => void
  // Настройки производительности
  performanceMode?: boolean
  enableBatching?: boolean
  batchDelay?: number
  maxBatchSize?: number
  enableDeepMemo?: boolean
  chunkSize?: number
  lazyRendering?: boolean
  // Настройки отображения
  displayLimit?: number
  adaptiveHeight?: boolean
  smoothScrolling?: boolean
  optimizeCells?: boolean
}

// ===== ОСНОВНОЙ КОМПОНЕНТ =====
const PerformanceTableWrapper: React.FC<PerformanceTableWrapperProps> = ({
  data,
  columns,
  onCellUpdate,
  onBatchCellUpdate,
  performanceMode = false,
  enableBatching = true,
  batchDelay = 100,
  maxBatchSize = 50,
  enableDeepMemo = true,
  chunkSize = 50,
  lazyRendering = false,
  displayLimit = 200,
  adaptiveHeight = true,
  smoothScrolling = true,
  optimizeCells = true,
  className,
  ...tableProps
}) => {
  // Батчер для обновлений
  const { batchedUpdate } = useBatchUpdater(onCellUpdate || (() => {}), {
    batchDelay,
    maxBatchSize,
    onBatchComplete: onBatchCellUpdate
      ? (updates) => {
          onBatchCellUpdate(updates.map(({ key, field, value }) => ({ key, field, value })))
        }
      : undefined,
  })

  // Обработчик обновления ячеек
  const handleCellUpdate = useCallback(
    (key: string, field: string, value: any) => {
      if (enableBatching) {
        batchedUpdate(key, field, value)
      } else {
        onCellUpdate?.(key, field, value)
      }
    },
    [enableBatching, batchedUpdate, onCellUpdate],
  )

  // Мемоизация оптимизированных колонок
  const optimizedColumns = useMemo(() => {
    if (!optimizeCells) return columns

    return columns.map((column) => {
      // Если у колонки есть render функция, оптимизируем её
      if (column.render && column.dataIndex) {
        const originalRender = column.render

        return {
          ...column,
          render: (value: any, record: any, index: number) => {
            // Проверяем, является ли это ячейкой для редактирования
            const isEditing = record.isEditing || record.editMode

            if (isEditing) {
              // Возвращаем оптимизированные компоненты для редактирования
              switch (column.dataIndex) {
                case 'material':
                  return (
                    <MaterialSelect
                      value={value}
                      materialId={record.materialId}
                      onChange={(materialName, materialId) => {
                        handleCellUpdate(record.key, 'material', materialName)
                        handleCellUpdate(record.key, 'materialId', materialId)
                      }}
                      options={column.options || []}
                      disabled={performanceMode}
                    />
                  )

                case 'quantityPd':
                case 'quantitySpec':
                case 'quantityRd':
                  return (
                    <QuantityInput
                      value={value}
                      onChange={(newValue) =>
                        handleCellUpdate(record.key, column.dataIndex, newValue)
                      }
                      disabled={performanceMode}
                    />
                  )

                case 'nomenclature':
                case 'nomenclatureId':
                  return (
                    <NomenclatureSelect
                      value={value}
                      onChange={(newValue, option) => {
                        handleCellUpdate(record.key, column.dataIndex, newValue)
                        if (option) {
                          handleCellUpdate(record.key, 'nomenclature', option.label)
                        }
                      }}
                      onSearch={column.onSearch}
                      options={column.options || []}
                      dropdownWidth={column.dropdownWidth}
                      disabled={performanceMode}
                    />
                  )

                default:
                  // Для остальных полей используем базовые оптимизированные компоненты
                  if (column.type === 'select') {
                    return (
                      <MemoizedSelect
                        value={value}
                        onChange={(newValue) =>
                          handleCellUpdate(record.key, column.dataIndex, newValue)
                        }
                        options={column.options || []}
                        placeholder={column.placeholder}
                        disabled={performanceMode}
                        size="small"
                      />
                    )
                  } else if (column.type === 'number') {
                    return (
                      <MemoizedInputNumber
                        value={value}
                        onChange={(newValue) =>
                          handleCellUpdate(record.key, column.dataIndex, newValue)
                        }
                        placeholder={column.placeholder}
                        disabled={performanceMode}
                        size="small"
                      />
                    )
                  } else if (column.type === 'autocomplete') {
                    return (
                      <MemoizedAutoComplete
                        value={value}
                        onChange={(newValue) =>
                          handleCellUpdate(record.key, column.dataIndex, newValue)
                        }
                        onSelect={column.onSelect}
                        onSearch={column.onSearch}
                        options={column.options || []}
                        placeholder={column.placeholder}
                        disabled={performanceMode}
                        size="small"
                      />
                    )
                  } else {
                    return (
                      <MemoizedInput
                        value={value}
                        onChange={(newValue) =>
                          handleCellUpdate(record.key, column.dataIndex, newValue)
                        }
                        placeholder={column.placeholder}
                        disabled={performanceMode}
                        size="small"
                      />
                    )
                  }
              }
            }

            // Для обычного отображения используем оригинальный render
            return originalRender(value, record, index)
          },
        }
      }

      return column
    })
  }, [columns, optimizeCells, handleCellUpdate, performanceMode])

  // Генерация CSS классов
  const containerClasses = useMemo(() => {
    const classes = ['performance-table-container']

    if (performanceMode) {
      classes.push('performance-mode')
    }

    if (smoothScrolling) {
      classes.push('smooth-scrolling')
    }

    if (data.length > 100) {
      classes.push('large-table-optimization')
    }

    if (data.length > 200) {
      classes.push('massive-table-optimization')
    }

    if (className) {
      classes.push(className)
    }

    return classes.join(' ')
  }, [performanceMode, smoothScrolling, data.length, className])

  // Дополнительные пропсы для таблицы
  const enhancedTableProps = useMemo(() => {
    const props: any = {
      ...tableProps,
      className: `ant-table-performance-mode ${tableProps.className || ''}`,
    }

    // Адаптивная высота
    if (adaptiveHeight && !tableProps.scroll?.y) {
      const baseHeight = data.length > 150 ? 280 : data.length > 75 ? 300 : 320
      props.scroll = {
        ...tableProps.scroll,
        y: `calc(100vh - ${baseHeight}px)`,
      }
    }

    return props
  }, [tableProps, adaptiveHeight, data.length])

  return (
    <div className={containerClasses}>
      <SmartTableOptimizer
        {...enhancedTableProps}
        data={data}
        columns={optimizedColumns}
        displayLimit={displayLimit}
        performanceMode={performanceMode}
        enableDeepMemo={enableDeepMemo}
        chunkSize={chunkSize}
        lazyRendering={lazyRendering}
      />
    </div>
  )
}

// ===== МЕМОИЗАЦИЯ =====
export default React.memo(PerformanceTableWrapper, (prevProps, nextProps) => {
  // Быстрая проверка основных параметров
  if (
    prevProps.performanceMode !== nextProps.performanceMode ||
    prevProps.enableBatching !== nextProps.enableBatching ||
    prevProps.displayLimit !== nextProps.displayLimit ||
    prevProps.data.length !== nextProps.data.length ||
    prevProps.columns.length !== nextProps.columns.length
  ) {
    return false
  }

  // Поверхностная проверка данных
  if (prevProps.data.length > 0 && nextProps.data.length > 0) {
    if (prevProps.data[0] !== nextProps.data[0]) {
      return false
    }
  }

  return true
})

// ===== ЭКСПОРТ ВСПОМОГАТЕЛЬНЫХ КОМПОНЕНТОВ =====
export {
  MemoizedSelect,
  MemoizedInput,
  MemoizedInputNumber,
  MemoizedAutoComplete,
  QuantityInput,
  MaterialSelect,
  NomenclatureSelect,
  useBatchUpdater,
}
