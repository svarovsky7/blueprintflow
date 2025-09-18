import React, { memo, useMemo } from 'react'
import MemoizedTableCell from './MemoizedTableCell'

interface FastRowRendererProps {
  record: any
  columns: any[]
  index: number
  editingRows: Record<string, any>
  onEdit?: (field: string, value: any) => void
  onOpenComments?: (rowKey: string) => void
  performanceMode?: boolean
}

// 🚀 ОПТИМИЗАЦИЯ: Мемоизированный рендерер строк для минимизации перерендеров
const FastRowRenderer: React.FC<FastRowRendererProps> = memo(
  ({ record, columns, index, editingRows, onEdit, onOpenComments, performanceMode = false }) => {
    const isEditing = useMemo(() => !!editingRows[record.key], [editingRows, record.key])

    const renderedCells = useMemo(() => {
      return columns.map((column) => {
        const value = record[column.dataIndex]

        return (
          <MemoizedTableCell
            key={`cell-${record.key}-${column.dataIndex}`}
            value={value}
            record={record}
            column={column}
            isEditing={isEditing}
            onEdit={onEdit}
            onOpenComments={onOpenComments}
            performanceMode={performanceMode}
          />
        )
      })
    }, [record, columns, isEditing, onEdit, onOpenComments, performanceMode])

    return <>{renderedCells}</>
  },
  (prevProps, nextProps) => {
    // Оптимизированное сравнение для строки
    if (
      prevProps.record !== nextProps.record ||
      prevProps.index !== nextProps.index ||
      prevProps.performanceMode !== nextProps.performanceMode ||
      prevProps.columns.length !== nextProps.columns.length
    ) {
      return false
    }

    // Проверяем изменение состояния редактирования для этой строки
    const prevEditing = !!prevProps.editingRows[prevProps.record.key]
    const nextEditing = !!nextProps.editingRows[nextProps.record.key]

    if (prevEditing !== nextEditing) {
      return false
    }

    // Если строка редактируется, проверяем изменения данных редактирования
    if (nextEditing) {
      const prevEditData = prevProps.editingRows[prevProps.record.key]
      const nextEditData = nextProps.editingRows[nextProps.record.key]

      if (JSON.stringify(prevEditData) !== JSON.stringify(nextEditData)) {
        return false
      }
    }

    return true
  },
)

FastRowRenderer.displayName = 'FastRowRenderer'

export default FastRowRenderer