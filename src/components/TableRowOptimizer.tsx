import React, { memo, useMemo } from 'react'

interface TableRowOptimizerProps {
  record: any
  columns: any[]
  rowIndex: number
  performanceMode: boolean
  children: React.ReactNode
}

const TableRowOptimizer: React.FC<TableRowOptimizerProps> = memo(
  ({ record, columns, rowIndex, performanceMode, children }) => {
    // Оптимизация 1: Пропускаем тяжелые вычисления в режиме производительности
    const shouldSkipExpensiveCalc = useMemo(() => {
      return performanceMode && rowIndex > 100
    }, [performanceMode, rowIndex])

    // Оптимизация 2: Простой рендер для невидимых строк (виртуальная пагинация)
    const isLikelyVisible = useMemo(() => {
      // Простая эвристика для определения видимости строки
      return rowIndex < 50 || !performanceMode
    }, [rowIndex, performanceMode])

    // Оптимизация 3: Упрощенный рендер для режима производительности
    if (shouldSkipExpensiveCalc && !isLikelyVisible) {
      return (
        <tr style={{ height: 40 }}>
          {columns.map((col, colIndex) => (
            <td key={colIndex} style={{ padding: '4px 8px', fontSize: '12px' }}>
              {record[col.dataIndex] || ''}
            </td>
          ))}
        </tr>
      )
    }

    return <>{children}</>
  },
  (prevProps, nextProps) => {
    // Кастомное сравнение для оптимизации
    if (prevProps.performanceMode !== nextProps.performanceMode) return false
    if (prevProps.rowIndex !== nextProps.rowIndex) return false

    // В режиме производительности делаем поверхностное сравнение
    if (prevProps.performanceMode) {
      return (
        prevProps.record.key === nextProps.record.key &&
        prevProps.record.updated_at === nextProps.record.updated_at
      )
    }

    // Обычное сравнение
    return (
      prevProps.record === nextProps.record &&
      prevProps.columns === nextProps.columns
    )
  }
)

TableRowOptimizer.displayName = 'TableRowOptimizer'

export default TableRowOptimizer