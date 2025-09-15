import React, { useMemo, useCallback, useRef } from 'react'
import { FixedSizeList as List } from 'react-window'
import { Table, Checkbox } from 'antd'
import type { ColumnType } from 'antd/es/table'

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
  sticky?: boolean | { offsetHeader?: number; offsetScroll?: number; getContainer?: () => HTMLElement }
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
  }
}

const Row: React.FC<RowProps> = ({ index, style, data }) => {
  const { items, columns, rowSelection, onRow } = data
  const item = items[index]

  const rowProps = onRow?.(item, index) || {}

  return (
    <div
      style={{
        ...style,
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid #f0f0f0',
        backgroundColor: index % 2 === 0 ? '#fafafa' : '#ffffff'
      }}
      {...rowProps}
    >
      {rowSelection && (
        <div style={{ width: 60, padding: '0 8px', display: 'flex', justifyContent: 'center' }}>
          <Checkbox
            checked={rowSelection.selectedRowKeys?.includes(item[rowSelection.getCheckboxProps?.(item)?.key || 'key'])}
            onChange={(e) => {
              const key = item[rowSelection.getCheckboxProps?.(item)?.key || 'key']
              if (e.target.checked) {
                rowSelection.onSelect?.(item, true, [...(rowSelection.selectedRowKeys || []), key])
              } else {
                rowSelection.onSelect?.(item, false, (rowSelection.selectedRowKeys || []).filter((k: any) => k !== key))
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
              width: col.width || 150,
              minWidth: col.width || 150,
              maxWidth: col.maxWidth || col.width || 200,
              padding: '8px 12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center'
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
}> = ({ columns, rowSelection, sticky }) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        backgroundColor: '#fafafa',
        borderBottom: '2px solid #e0e0e0',
        fontWeight: 600,
        fontSize: '14px',
        color: '#262626',
        position: sticky ? 'sticky' : 'static',
        top: sticky ? 0 : 'auto',
        zIndex: 100,
        height: 56
      }}
    >
      {rowSelection && (
        <div style={{ width: 60, padding: '0 8px', display: 'flex', justifyContent: 'center' }}>
          <Checkbox
            indeterminate={
              rowSelection.selectedRowKeys?.length > 0 &&
              rowSelection.selectedRowKeys?.length < (rowSelection.getCheckboxProps?.totalCount || 0)
            }
            checked={
              rowSelection.selectedRowKeys?.length > 0 &&
              rowSelection.selectedRowKeys?.length === (rowSelection.getCheckboxProps?.totalCount || 0)
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
            width: col.width || 150,
            minWidth: col.width || 150,
            maxWidth: col.maxWidth || col.width || 200,
            padding: '12px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            borderRight: index < columns.length - 1 ? '1px solid #e0e0e0' : 'none'
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
  className
}) => {
  const listRef = useRef<List>(null)

  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.width !== 0 && col.width !== '0px')
  }, [columns])

  const tableWidth = useMemo(() => {
    if (width) return width
    if (scroll?.x) return scroll.x as number

    const calculatedWidth = visibleColumns.reduce((total, col) => {
      return total + (col.width as number || 150)
    }, rowSelection ? 60 : 0)

    return Math.max(calculatedWidth, 800)
  }, [visibleColumns, width, scroll?.x, rowSelection])

  const tableHeight = useMemo(() => {
    if (scroll?.y) return scroll.y as number
    return height
  }, [height, scroll?.y])

  const rowData = useMemo(() => ({
    items: dataSource,
    columns: visibleColumns,
    rowSelection,
    onRow
  }), [dataSource, visibleColumns, rowSelection, onRow])

  if (loading) {
    return (
      <div style={{ height: tableHeight, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
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
        width: '100%'
      }}
    >
      <VirtualizedTableHeader
        columns={visibleColumns}
        rowSelection={rowSelection}
        sticky={sticky}
      />

      <div style={{ width: '100%', overflowX: 'auto' }}>
        <List
          ref={listRef}
          height={typeof tableHeight === 'number' ? tableHeight - 56 : 544} // Вычитаем высоту заголовка
          width={tableWidth}
          itemCount={dataSource.length}
          itemSize={rowHeight}
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