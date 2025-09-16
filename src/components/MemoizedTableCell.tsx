import React, { memo, useMemo } from 'react'
import { Button, Select } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import DebouncedInput from './DebouncedInput'

interface MemoizedTableCellProps {
  value: any
  record: any
  column: any
  isEditing?: boolean
  onEdit?: (field: string, value: any) => void
  onOpenComments?: (rowKey: string) => void
  performanceMode?: boolean
}

const MemoizedTableCell: React.FC<MemoizedTableCellProps> = memo(
  ({ value, record, column, isEditing, onEdit, onOpenComments, performanceMode = false }) => {
    const cellContent = useMemo(() => {
      // Режим редактирования
      if (isEditing) {
        switch (column.dataIndex) {
          case 'material':
            return (
              <DebouncedInput
                value={value}
                onChange={(val) => onEdit?.(column.dataIndex, val)}
                placeholder="Материал"
                size="small"
                debounceMs={500}
              />
            )

          case 'quantityPd':
          case 'quantitySpec':
          case 'quantityRd':
            return (
              <DebouncedInput
                type="number"
                value={value}
                onChange={(val) => onEdit?.(column.dataIndex, val)}
                placeholder="Количество"
                size="small"
                style={{ width: '100px' }}
                debounceMs={300}
              />
            )

          case 'unit':
            if (performanceMode) {
              return (
                <DebouncedInput
                  value={value}
                  onChange={(val) => onEdit?.(column.dataIndex, val)}
                  placeholder="Ед.изм."
                  size="small"
                  style={{ width: '80px' }}
                  debounceMs={400}
                />
              )
            }
            return (
              <Select
                value={value}
                onChange={(val) => onEdit?.(column.dataIndex, val)}
                placeholder="Ед.изм."
                size="small"
                style={{ width: '80px' }}
                showSearch
                allowClear
              >
                {/* Опции загружаются отдельно */}
              </Select>
            )

          default:
            return (
              <DebouncedInput
                value={value}
                onChange={(val) => onEdit?.(column.dataIndex, val)}
                size="small"
                debounceMs={400}
              />
            )
        }
      }

      // Режим просмотра
      switch (column.dataIndex) {
        case 'comments':
          const comments = record.comments || []
          if (comments.length === 0) {
            return (
              <Button
                type="text"
                icon={<PlusOutlined />}
                onClick={() => onOpenComments?.(record.key)}
                title="Добавить комментарий"
                size="small"
              />
            )
          } else {
            const latestComment = comments[0]
            const displayText =
              latestComment.comment_text?.length > 10
                ? `${latestComment.comment_text.substring(0, 10)}...`
                : latestComment.comment_text

            return (
              <div
                style={{
                  cursor: 'pointer',
                  color: '#1890ff',
                  textDecoration: 'underline',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '120px',
                }}
                onClick={() => onOpenComments?.(record.key)}
                title={latestComment.comment_text}
              >
                {displayText}
              </div>
            )
          }

        case 'quantityPd':
        case 'quantitySpec':
        case 'quantityRd':
          // Форматируем числа
          if (typeof value === 'number') {
            return value.toLocaleString('ru-RU', { maximumFractionDigits: 3 })
          }
          return value

        default:
          return value
      }
    }, [value, record, column, isEditing, onEdit, onOpenComments, performanceMode])

    return (
      <div
        style={{
          padding: '4px 8px',
          minHeight: '32px',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {cellContent}
      </div>
    )
  },
  (prevProps, nextProps) => {
    // Кастомная функция сравнения для оптимизации
    return (
      prevProps.value === nextProps.value &&
      prevProps.isEditing === nextProps.isEditing &&
      prevProps.record.key === nextProps.record.key &&
      prevProps.column.dataIndex === nextProps.column.dataIndex &&
      prevProps.performanceMode === nextProps.performanceMode &&
      // Сравниваем комментарии только для столбца комментариев
      (prevProps.column.dataIndex !== 'comments' ||
        JSON.stringify(prevProps.record.comments) === JSON.stringify(nextProps.record.comments))
    )
  },
)

MemoizedTableCell.displayName = 'MemoizedTableCell'

export default MemoizedTableCell
