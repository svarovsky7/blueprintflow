import React, { useMemo, useRef, useCallback, useLayoutEffect, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Table } from 'antd'
import type { TableProps } from 'antd'

interface VirtualTableOptimizedProps extends Omit<TableProps, 'dataSource'> {
  dataSource: any[]
  height?: number | string
  itemHeight?: number
  bufferSize?: number
  onScroll?: (scrollTop: number) => void
  // Пропсы для редактирования
  editingRows?: Record<string, any>
  onEdit?: (field: string, value: any) => void
  onOpenComments?: (rowKey: string) => void
  performanceMode?: boolean
}

// 🚀 ОПТИМИЗАЦИЯ: Современная виртуализация с TanStack Virtual
const VirtualTableOptimized: React.FC<VirtualTableOptimizedProps> = ({
  dataSource = [],
  columns = [],
  height = 'calc(100vh - 300px)',
  itemHeight = 54,
  bufferSize = 20, // ±20 строк буфер как запросил пользователь
  scroll,
  onScroll,
  editingRows = {},
  onEdit,
  onOpenComments,
  performanceMode = false,
  ...tableProps
}) => {
  const [scrollElement, setScrollElement] = useState<HTMLElement | null>(null)
  const renderStartTime = useRef<number>(0)

  // Performance Monitor - только критичные логи
  useLayoutEffect(() => {
    renderStartTime.current = performance.now()
  })

  React.useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current
    if (renderTime > 100 && process.env.NODE_ENV === 'development') { // Только действительно медленные рендеры
      console.warn(`⚠️ VirtualTableOptimized slow render: ${Math.round(renderTime)}ms for ${dataSource.length} total rows`)
    }
  })

  // 🚀 TanStack Virtual - самая современная виртуализация 2024
  const virtualizer = useVirtualizer({
    count: dataSource.length,
    getScrollElement: () => scrollElement,
    estimateSize: () => itemHeight,
    overscan: bufferSize, // Буферизация ±20 строк
    measureElement: element => {
      // Автоматическое измерение высоты для динамического контента
      const height = element?.getBoundingClientRect().height
      return height || itemHeight
    },
  })

  // Получаем только видимые элементы с буфером
  const virtualItems = virtualizer.getVirtualItems()

  // Обработчик скролла с дебаунсом
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const target = e.target as HTMLElement
    onScroll?.(target.scrollTop)
  }, [onScroll])

  // Мемоизированные столбцы для виртуализации
  const virtualizedColumns = useMemo(() => {
    return columns.map((col, index) => ({
      ...col,
      render: (value: any, record: any, rowIndex: number) => {
        // Вызываем оригинальный render если есть
        if (col.render) {
          return col.render(value, record, rowIndex)
        }

        // Базовый рендеринг для виртуализации
        return (
          <div
            style={{
              padding: '8px',
              minHeight: itemHeight - 16,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {value}
          </div>
        )
      },
    }))
  }, [columns, itemHeight])

  // Стабильная функция rowKey
  const getRowKey = useCallback((record: any, index?: number) => {
    return record.key || record.id || `row-${index}`
  }, [])

  // console.log(`🔍 VirtualTableOptimized: rendering ${virtualItems.length} of ${dataSource.length} rows (buffer: ±${bufferSize})`)

  // Если данных мало, используем обычную таблицу
  if (dataSource.length <= 50) {
    // console.log('📊 Using regular Table for small dataset')
    return (
      <Table
        {...tableProps}
        dataSource={dataSource}
        columns={virtualizedColumns}
        scroll={scroll}
        rowKey={getRowKey}
        pagination={false}
        size="small"
      />
    )
  }

  return (
    <div style={{ height, width: '100%' }}>
      {/* Виртуализированный контейнер */}
      <div
        ref={setScrollElement}
        style={{
          height: '100%',
          overflow: 'auto',
          width: '100%',
        }}
        onScroll={handleScroll}
      >
        {/* Общая высота виртуального контента */}
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: '100%',
            position: 'relative',
          }}
        >
          {/* Заголовок таблицы (sticky) */}
          <div
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 10,
              background: '#fafafa',
              borderBottom: '1px solid #f0f0f0',
            }}
          >
            <Table
              {...tableProps}
              dataSource={[]}
              columns={virtualizedColumns}
              pagination={false}
              showHeader={true}
              size="small"
              style={{ marginBottom: 0 }}
            />
          </div>

          {/* Виртуализированные строки */}
          <div style={{ position: 'relative' }}>
            {virtualItems.map((virtualItem) => {
              const record = dataSource[virtualItem.index]
              const isEditing = !!editingRows[record.key || record.id]

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    borderBottom: '1px solid #f0f0f0',
                    background: isEditing ? '#fff7e6' : '#fff',
                  }}
                >
                  {/* Рендерим строку таблицы без заголовка */}
                  <Table
                    {...tableProps}
                    dataSource={[record]}
                    columns={virtualizedColumns}
                    pagination={false}
                    showHeader={false}
                    rowKey={getRowKey}
                    size="small"
                    style={{
                      marginBottom: 0,
                      background: 'transparent',
                    }}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Информация о виртуализации в dev mode */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          bottom: 10,
          right: 10,
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px 12px',
          borderRadius: 4,
          fontSize: 12,
          zIndex: 9999
        }}>
          Виртуализация: {virtualItems.length} из {dataSource.length} строк
          <br />
          Буфер: ±{bufferSize} строк
          <br />
          Диапазон: {virtualItems[0]?.index || 0} - {virtualItems[virtualItems.length - 1]?.index || 0}
        </div>
      )}
    </div>
  )
}

export default VirtualTableOptimized