import React, { useMemo, useCallback, useState, useRef, useLayoutEffect } from 'react'
import { Table } from 'antd'
import { useTableHeight } from '../hooks/useTableHeight'

interface SmartTableOptimizerProps {
  data: any[]
  columns: any[]
  displayLimit: number
  performanceMode: boolean
  // Новые опции для глубокой оптимизации
  enableDeepMemo?: boolean
  chunkSize?: number
  lazyRendering?: boolean
  // Опции для динамической высоты таблицы
  useAdaptiveHeight?: boolean
  controlsHeight?: number
  // Пропсы для управления пагинацией
  rowsPerPage?: number
  onRowsPerPageChange?: (value: number) => void
  [key: string]: any // остальные пропсы Table
}

// Функция для создания стабильного ключа строки
const createStableRowKey = (() => {
  const keyCache = new WeakMap<any, string>()
  let keyCounter = 0

  return (record: any): string => {
    // Попытаемся найти уникальный идентификатор
    if (record.key) return String(record.key)
    if (record.id) return String(record.id)

    // Используем кэш для объектов
    if (keyCache.has(record)) {
      return keyCache.get(record)!
    }

    // Создаем стабильный ключ без index
    const key = `row-${keyCounter++}-${Date.now()}`
    keyCache.set(record, key)
    return key
  }
})()

// Функция для глубокого сравнения колонок
const deepMemoColumns = (() => {
  const columnsCache = new WeakMap<any[], any[]>()

  return (columns: any[], performanceMode: boolean): any[] => {
    if (!performanceMode) {
      if (columnsCache.has(columns)) {
        return columnsCache.get(columns)!
      }
      columnsCache.set(columns, columns)
      return columns
    }

    // В режиме производительности упрощаем колонки
    const optimized = columns.map((col: any) => ({
      ...col,
      // Отключаем сложные фильтры
      filters: undefined,
      filterDropdown: undefined,
      filterIcon: undefined,
      // Упрощаем сортировку только для базовых типов
      sorter: (col.sorter === true || typeof col.sorter === 'function') ? true : false,
      // Сохраняем только критические рендеры
      render: (['actions', 'comments', 'checkbox'].includes(col.dataIndex) || col.key === 'actions')
        ? col.render
        : undefined,
    }))

    if (columnsCache.has(columns)) {
      const cached = columnsCache.get(columns)!
      // Безопасное сравнение без JSON.stringify для избежания циклических ссылок
      if (cached.length === optimized.length &&
          cached.every((col, i) => col.dataIndex === optimized[i]?.dataIndex &&
                                   col.title === optimized[i]?.title &&
                                   col.width === optimized[i]?.width)) {
        return cached
      }
    }

    columnsCache.set(columns, optimized)
    return optimized
  }
})()

const SmartTableOptimizer: React.FC<SmartTableOptimizerProps> = ({
  data,
  columns,
  displayLimit,
  performanceMode,
  enableDeepMemo = true,
  chunkSize = 50,
  lazyRendering = false,
  useAdaptiveHeight = true,
  controlsHeight = 56,
  rowsPerPage = 50,
  onRowsPerPageChange,
  ...tableProps
}) => {
  const [isReady, setIsReady] = useState(!lazyRendering)
  const previousDataRef = useRef<any[]>([])
  const frameRef = useRef<number>()

  // Используем динамический расчет высоты таблицы
  const { tableHeight } = useTableHeight({
    controlsHeight,
    minHeight: 300,
  })

  // Lazy rendering - постепенная загрузка данных
  useLayoutEffect(() => {
    if (lazyRendering && !isReady) {
      frameRef.current = requestAnimationFrame(() => {
        setIsReady(true)
      })
    }

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
    }
  }, [lazyRendering, isReady])

  // Оптимизация 1: Интеллектуальное ограничение данных с чанками
  const limitedData = useMemo(() => {
    console.log('🔍 SmartTableOptimizer limitedData:', {
      isReady,
      dataLength: data.length,
      displayLimit,
      chunkSize,
      calculatedLimit: chunkSize * 4
    })

    if (!isReady) return []

    if (displayLimit === -1) {
      // Убираем ограничение чанками - отображаем все данные
      // Пагинация в Table компоненте сама управляет отображением
      console.log('🔍 Unlimited mode: returning all', data.length, 'rows')
      return data
    }

    console.log('🔍 Limited mode: returning first', displayLimit, 'of', data.length, 'rows')
    return data.slice(0, displayLimit)
  }, [data, displayLimit, chunkSize, isReady])

  // Оптимизация 2: Глубокая мемоизация колонок
  const optimizedColumns = useMemo(() => {
    if (!enableDeepMemo) {
      // Простая оптимизация
      if (!performanceMode) return columns
      return columns.map((col: any) => ({
        ...col,
        filters: undefined,
        filterDropdown: undefined,
        filterIcon: undefined,
        sorter: col.sorter === true ? true : false,
        render: ['actions', 'comments', 'checkbox'].includes(col.dataIndex) ? col.render : undefined,
      }))
    }

    // Глубокая мемоизация
    return deepMemoColumns(columns, performanceMode)
  }, [columns, performanceMode, enableDeepMemo])

  // Оптимизация 3: Стабильная функция rowKey (без deprecated index)
  const getRowKey = useCallback((record: any) => {
    return createStableRowKey(record)
  }, [])

  // Оптимизация 4: Умные onRow handlers
  const optimizedOnRow = useCallback((record: any, index?: number) => {
    if (performanceMode) {
      // В режиме производительности только базовые события
      return {
        onClick: tableProps.onRow?.(record, index)?.onClick,
      }
    }
    return tableProps.onRow?.(record, index) || {}
  }, [performanceMode, tableProps.onRow])

  // Оптимизация 5: Адаптивная scroll конфигурация
  const scrollConfig = useMemo(() => {
    const baseScroll = tableProps.scroll || {}

    return {
      ...baseScroll,
      x: 'max-content',
      // Используем динамически рассчитанную высоту с небольшим запасом для пагинации
      y: useAdaptiveHeight
        ? tableHeight.includes('max(')
          ? `calc(${tableHeight.split('max(')[1].split(',')[0]} - 30px)` // отступ для пагинации
          : `calc(${tableHeight} - 30px)`
        : baseScroll.y || 'calc(100vh - 230px)',
    }
  }, [tableProps.scroll, useAdaptiveHeight, tableHeight])

  // Оптимизация 6: Принудительная пагинация (игнорируем tableProps.pagination)
  const paginationConfig = useMemo(() => {
    // Всегда включаем пагинацию, игнорируя tableProps.pagination

    const dataLength = limitedData.length

    // Используем переданное значение rowsPerPage или безопасный fallback
    const defaultPageSize = rowsPerPage && rowsPerPage > 0 ? rowsPerPage : 100

    console.log('🔍 SmartTableOptimizer paginationConfig:', {
      dataLength,
      rowsPerPage,
      rowsPerPageType: typeof rowsPerPage,
      rowsPerPageValid: rowsPerPage && rowsPerPage > 0,
      defaultPageSize,
      onRowsPerPageChangeExists: !!onRowsPerPageChange
    })

    return {
      pageSize: defaultPageSize,
      showSizeChanger: true,
      pageSizeOptions: ['50', '100', '200', '500', '1000'],
      showQuickJumper: false, // убираем "Go to page"
      showTotal: (total: number, range: [number, number]) =>
        `${range[0]}-${range[1]} из ${total.toLocaleString('ru-RU')}`,
      size: 'small',
      onShowSizeChange: (_current: number, size: number) => {
        console.log('🔍 onShowSizeChange triggered:', { size, onRowsPerPageChangeExists: !!onRowsPerPageChange })
        if (onRowsPerPageChange) {
          onRowsPerPageChange(size)
        }
      },
      onChange: (page: number, pageSize: number) => {
        console.log('🔍 onChange triggered:', { page, pageSize })
      },
      // НЕ используем tableProps.pagination чтобы избежать конфликтов
    }
  }, [limitedData.length, rowsPerPage, onRowsPerPageChange])

  // Оптимизация 7: Детекция изменений данных
  const hasDataChanged = useMemo(() => {
    const changed = previousDataRef.current.length !== data.length ||
      previousDataRef.current.some((item, index) => item !== data[index])

    if (changed) {
      previousDataRef.current = data
    }

    return changed
  }, [data])

  // Показать loading состояние если lazy rendering не готов
  if (!isReady) {
    return (
      <Table
        {...tableProps}
        dataSource={[]}
        columns={optimizedColumns}
        loading={true}
        pagination={false}
      />
    )
  }

  return (
    <Table
      {...tableProps}
      key={`table-${rowsPerPage}-${limitedData.length}`} // принудительный перерендер при изменении rowsPerPage
      dataSource={limitedData}
      columns={optimizedColumns}
      rowKey={getRowKey}
      onRow={optimizedOnRow}
      scroll={scrollConfig}
      pagination={paginationConfig}
      size={performanceMode ? 'small' : tableProps.size}
      // Дополнительные оптимизации для производительности
      sticky={performanceMode ? false : tableProps.sticky}
      showSorterTooltip={performanceMode ? false : tableProps.showSorterTooltip}
      locale={performanceMode ? { emptyText: 'Нет данных' } : tableProps.locale}
    />
  )
}

// Мемоизация с проверкой глубоких изменений
export default React.memo(SmartTableOptimizer, (prevProps, nextProps) => {
  // Быстрая проверка примитивных значений
  if (
    prevProps.displayLimit !== nextProps.displayLimit ||
    prevProps.performanceMode !== nextProps.performanceMode ||
    prevProps.enableDeepMemo !== nextProps.enableDeepMemo ||
    prevProps.chunkSize !== nextProps.chunkSize ||
    prevProps.lazyRendering !== nextProps.lazyRendering ||
    prevProps.useAdaptiveHeight !== nextProps.useAdaptiveHeight ||
    prevProps.controlsHeight !== nextProps.controlsHeight ||
    prevProps.rowsPerPage !== nextProps.rowsPerPage // КРИТИЧЕСКИ ВАЖНО для обновления пагинации
  ) {
    return false
  }

  // Проверка изменений данных
  if (prevProps.data.length !== nextProps.data.length) {
    return false
  }

  // Проверка изменений колонок по длине
  if (prevProps.columns.length !== nextProps.columns.length) {
    return false
  }

  // Поверхностная проверка первых элементов для производительности
  if (prevProps.data.length > 0 && nextProps.data.length > 0) {
    if (prevProps.data[0] !== nextProps.data[0]) {
      return false
    }
  }

  return true
})