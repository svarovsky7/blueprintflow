import React, { useMemo, useCallback, useRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Table, Checkbox } from 'antd'
import type { ColumnType } from 'antd/es/table'
import { useScale } from '@/shared/contexts/ScaleContext'

export interface VirtualizedTableProps<T = any> {
  columns: ColumnType<T>[]
  dataSource: T[]
  rowHeight?: number
  height?: number
  width?: number
  loading?: boolean
  rowSelection?: any
  scroll?: { x?: string | number; y?: string | number }
  onRow?: (record: T, index?: number) => React.HTMLAttributes<any>
  sticky?:
    | boolean
    | { offsetHeader?: number; offsetScroll?: number; getContainer?: () => HTMLElement }
  className?: string
}

interface RowProps {
  index: number
  style: React.CSSProperties
  data: {
    items: any[]
    columns: ColumnType<any>[]
    rowSelection?: any
    onRow?: (record: any, index?: number) => React.HTMLAttributes<any>
    scale: number
  }
}

const Row: React.FC<RowProps> = ({ index, style, data }) => {
  const { items, columns, rowSelection, onRow, scale } = data
  const item = items[index]

  const rowProps = onRow?.(item, index) || {}

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff',
      }}
      {...rowProps}
    >
      {rowSelection && (
        <div
          style={{
            width: 60 * scale,
            padding: `0 ${8 * scale}px`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Checkbox
            checked={rowSelection.selectedRowKeys?.includes(
              item[rowSelection.getCheckboxProps?.(item)?.key || 'key'],
            )}
            onChange={(e) => {
              const key = item[rowSelection.getCheckboxProps?.(item)?.key || 'key']
              if (e.target.checked) {
                rowSelection.onSelect?.(item, true, [...(rowSelection.selectedRowKeys || []), key])
              } else {
                rowSelection.onSelect?.(
                  item,
                  false,
                  (rowSelection.selectedRowKeys || []).filter((k: any) => k !== key),
                )
              }
            }}
          />
        </div>
      )}

      {columns.map((col, colIndex) => {
        const cellValue = col.render
          ? col.render(item[col.dataIndex as keyof typeof item], item, index)
          : item[col.dataIndex as keyof typeof item]

        return (
          <div
            key={colIndex}
            style={{
              width: ((col.width as number) || 150) * scale,
              minWidth: ((col.width as number) || 150) * scale,
              maxWidth: ((col.maxWidth as number) || (col.width as number) || 200) * scale,
              padding: `${8 * scale}px ${12 * scale}px`,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: `${14 * scale}px`,
              display: 'flex',
              alignItems: 'center',
            }}
            title={typeof cellValue === 'string' ? cellValue : ''}
          >
            {cellValue}
          </div>
        )
      })}
    </div>
  )
}

const VirtualizedTableHeader: React.FC<{
  columns: ColumnType<any>[]
  rowSelection?: any
  sticky?: boolean
  scale: number
}> = ({ columns, rowSelection, sticky, scale }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fafafa',
        borderBottom: '2px solid #e0e0e0',
        fontWeight: 600,
        fontSize: `${14 * scale}px`,
        color: '#262626',
        position: sticky ? 'sticky' : 'static',
        top: sticky ? 0 : 'auto',
        zIndex: 100,
        height: 56 * scale,
      }}
    >
      {rowSelection && (
        <div
          style={{
            width: 60 * scale,
            padding: `0 ${8 * scale}px`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Checkbox
            indeterminate={
              rowSelection.selectedRowKeys?.length > 0 &&
              rowSelection.selectedRowKeys?.length <
                (rowSelection.getCheckboxProps?.totalCount || 0)
            }
            checked={
              rowSelection.selectedRowKeys?.length > 0 &&
              rowSelection.selectedRowKeys?.length ===
                (rowSelection.getCheckboxProps?.totalCount || 0)
            }
            onChange={(e) => {
              rowSelection.onSelectAll?.(e.target.checked, [], [])
            }}
          />
        </div>
      )}

      {columns.map((col, index) => (
        <div
          key={index}
          style={{
            width: ((col.width as number) || 150) * scale,
            minWidth: ((col.width as number) || 150) * scale,
            maxWidth: ((col.maxWidth as number) || (col.width as number) || 200) * scale,
            padding: `${12 * scale}px`,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderRight: index < columns.length - 1 ? '1px solid #e0e0e0' : 'none',
          }}
        >
          {col.title}
        </div>
      ))}
    </div>
  )
}

const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  columns,
  dataSource,
  rowHeight = 54,
  height = 600,
  width,
  loading = false,
  rowSelection,
  scroll,
  onRow,
  sticky = true,
  className,
}) => {
  const listRef = useRef<List>(null)
  const { scale } = useScale()

  const visibleColumns = useMemo(() => {
    return columns.filter((col) => col.width !== 0 && col.width !== '0px')
  }, [columns])

  const tableWidth = useMemo(() => {
    if (width) return width
    if (scroll?.x) return scroll.x as number

    const calculatedWidth = visibleColumns.reduce(
      (total, col) => {
        return total + ((col.width as number) || 150) * scale
      },
      rowSelection ? 60 * scale : 0,
    )

    return Math.max(calculatedWidth, 800 * scale)
  }, [visibleColumns, width, scroll?.x, rowSelection, scale])

  const tableHeight = useMemo(() => {
    if (scroll?.y) return scroll.y as number
    return height
  }, [height, scroll?.y])

  const rowData = useMemo(
    () => ({
      items: dataSource,
      columns: visibleColumns,
      rowSelection,
      onRow,
      scale,
    }),
    [dataSource, visibleColumns, rowSelection, onRow, scale],
  )

  if (loading) {
    return (
      <div
        style={{
          height: tableHeight,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div>Загрузка...</div>
      </div>
    )
  }

  return (
    <div
      className={className}
      style={{
        border: '1px solid #d9d9d9',
        borderRadius: '6px',
        overflow: 'hidden',
        width: '100%',
      }}
    >
      <VirtualizedTableHeader
        columns={visibleColumns}
        rowSelection={rowSelection}
        sticky={sticky}
        scale={scale}
      />

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <List
          ref={listRef}
          height={typeof tableHeight === 'number' ? tableHeight - 56 * scale : 544 * scale} // Вычитаем высоту заголовка
          width={tableWidth}
          itemCount={dataSource.length}
          itemSize={rowHeight * scale}
          itemData={rowData}
          overscanCount={5} // Рендерим 5 дополнительных строк для плавного скроллинга
        >
          {Row}
        </List>
      </div>
    </div>
  )
}

export default VirtualizedTable
