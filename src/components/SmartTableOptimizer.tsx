import React, { useMemo, useCallback, useState, useRef, useLayoutEffect, useDeferredValue } from 'react'
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
  // Состояние редактирования для правильной обработки render функций
  editingRows?: Record<string, any>
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

// Функция для глубокого сравнения колонок - ИСПРАВЛЕНО для Select компонентов
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

    // В режиме производительности упрощаем колонки, НО сохраняем важные render функции
    const optimized = columns.map((col: any) => ({
      ...col,
      // Отключаем сложные фильтры
      filters: undefined,
      filterDropdown: undefined,
      filterIcon: undefined,
      // Упрощаем сортировку только для базовых типов
      sorter: (col.sorter === true || typeof col.sorter === 'function') ? true : false,
      // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Сохраняем render функции для Select полей + критические
      render: (['actions', 'comments', 'checkbox', 'tagName', 'unit', 'costCategory', 'costType', 'location', 'workName', 'material'].includes(col.dataIndex) || col.key === 'actions')
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
  editingRows = {},
  ...tableProps
}) => {
  // Убран избыточный лог рендеринга для оптимизации производительности
  const [isReady, setIsReady] = useState(!lazyRendering)
  const previousDataRef = useRef<any[]>([])
  const frameRef = useRef<number>()

  // 🚀 ОПТИМИЗАЦИЯ: Используем useDeferredValue для неблокирующих обновлений
  const deferredData = useDeferredValue(data)
  const deferredEditingRows = useDeferredValue(editingRows)

  // Убрано избыточное отслеживание editingRows для оптимизации

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

  // 🚀 ОПТИМИЗАЦИЯ 1: ЖЁСТКОЕ ограничение данных для производительности
  const limitedData = useMemo(() => {
    // ОПТИМИЗАЦИЯ: Логируем только значительные изменения (>100 строк) для уменьшения спама
    if (Math.abs(deferredData.length - previousDataRef.current.length) > 100) {
      if (process.env.NODE_ENV === 'development') { // LOG: условное логирование для отладки
        console.log('🔍 SmartTableOptimizer значительное изменение данных:', { // LOG: большое изменение количества строк
          старо: previousDataRef.current.length,
          новое: deferredData.length,
          displayLimit,
        })
      }
    }

    if (!isReady) return []

    // Возвращаем все данные - пагинация Ant Design сама управляет отображением
    return deferredData
  }, [deferredData, displayLimit, chunkSize, isReady])

  // 🚀 ОПТИМИЗАЦИЯ 2: Глубокая мемоизация колонок с deferredEditingRows
  const optimizedColumns = useMemo(() => {
    const hasActiveEditing = Object.keys(deferredEditingRows).length > 0
    // Убран избыточный лог оптимизации колонок

    // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Никогда не отключаем render функции при активном редактировании
    if (hasActiveEditing) {
      // Режим активного редактирования - возвращаем все оригинальные колонки
      return columns
    }

    if (!enableDeepMemo) {
      // Простая оптимизация только при отсутствии активного редактирования
      if (!performanceMode) {
        return columns
      }
      return columns.map((col: any) => ({
        ...col,
        filters: undefined,
        filterDropdown: undefined,
        filterIcon: undefined,
        sorter: col.sorter === true ? true : false,
        render: ['actions', 'comments', 'checkbox'].includes(col.dataIndex) ? col.render : undefined,
      }))
    }

    // Глубокая мемоизация - только при отсутствии активного редактирования
    return deepMemoColumns(columns, performanceMode)
  }, [columns, performanceMode, enableDeepMemo, deferredEditingRows])

  // 🚀 ОПТИМИЗАЦИЯ 3: Intelligent shouldCellUpdate для минимизации перерендеров
  const shouldCellUpdate = useCallback((record: any, prevRecord: any) => {
    // Быстрая проверка ссылочного равенства
    if (record === prevRecord) return false

    // Проверяем только ключевые поля, которые влияют на отображение
    const keyFields = ['id', 'material', 'quantityPd', 'quantitySpec', 'quantityRd', 'unit', 'updated_at']

    return keyFields.some(field => record[field] !== prevRecord[field])
  }, [])

  // Оптимизация 4: Стабильная функция rowKey (без deprecated index)
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

    // Избыточные логи размера страницы убраны для производительности

    return {
      total: dataLength, // ВАЖНО: передаем общее количество записей
      pageSize: defaultPageSize,
      showSizeChanger: true,
      pageSizeOptions: ['50', '100', '200', '500', '1000'],
      showQuickJumper: false, // убираем "Go to page"
      showTotal: (total: number, range: [number, number]) =>
        `${range[0]}-${range[1]} из ${total.toLocaleString('ru-RU')}`,
      size: 'small',
      onShowSizeChange: (_current: number, size: number) => {
        if (onRowsPerPageChange) {
          onRowsPerPageChange(size)
        }
      },
      onChange: (page: number, pageSize: number) => {
        // Pagination change handled
      },
      // НЕ используем tableProps.pagination чтобы избежать конфликтов
    }
  }, [limitedData.length, rowsPerPage, onRowsPerPageChange])

  // 🚀 ОПТИМИЗАЦИЯ 7: Performance Monitor для отслеживания ПОЛНОГО времени рендеринга
  const renderStartTime = useRef<number>(0)
  const tableRef = useRef<HTMLDivElement>(null)

  React.useLayoutEffect(() => {
    renderStartTime.current = performance.now()
  })

  React.useEffect(() => {
    // ИСПРАВЛЕНИЕ: ТОЧНОЕ измерение времени до ПОЛНОЙ видимости таблицы пользователю
    if (limitedData.length > 0 && tableRef.current) {
      // Используем IntersectionObserver для определения полной видимости
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.9) {
              // Дополнительно ждем завершения всех браузерных задач
              setTimeout(() => {
                requestAnimationFrame(() => {
                  const renderTime = performance.now() - renderStartTime.current
                  if (renderTime > 50 && process.env.NODE_ENV === 'development') { // LOG: условное логирование для отладки
                    console.warn(`⚠️ SmartTableOptimizer РЕАЛЬНОЕ время до полной видимости: ${Math.round(renderTime)}ms для ${limitedData.length} строк`) // LOG: точное время рендеринга таблицы
                  }
                  observer.disconnect()
                })
              }, 50) // Небольшая задержка для учета финальной отрисовки
            }
          })
        },
        { threshold: 0.9 } // Ждем, когда таблица станет на 90% видимой
      )

      observer.observe(tableRef.current)

      return () => observer.disconnect()
    }
  }, [limitedData.length])

  // Оптимизация 8: Детекция изменений данных с deferredData
  const hasDataChanged = useMemo(() => {
    const changed = previousDataRef.current.length !== deferredData.length ||
      previousDataRef.current.some((item, index) => item !== deferredData[index])

    if (changed) {
      previousDataRef.current = deferredData
    }

    return changed
  }, [deferredData])

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

  // Создаем уникальный ключ для принудительного перерендера при изменении editingRows
  const editingRowsHash = useMemo(() => {
    const keys = Object.keys(editingRows).sort()
    // Создаем хэш только из критических полей для Select компонентов (ПОЛНЫЙ СПИСОК)
    const criticalFields = [
      // Select компоненты
      'tagId', 'tagName', 'documentationId', 'projectCode', 'versionNumber',
      'unitId', 'blockId', 'block', 'costCategoryId', 'costTypeId',
      'locationId', 'rateId', 'materialId', 'material', 'nomenclatureId',
      'nomenclature', 'supplier',
      // Input компоненты
      'floors', 'quantityPd', 'quantitySpec', 'quantityRd'
    ]
    const values = keys.map(key => {
      const row = editingRows[key]
      const criticalValues = criticalFields.map(field => `${field}:${row[field] || ''}`).join(',')
      return `${key}:(${criticalValues})`
    }).join('|')

    return values || 'empty'
  }, [editingRows])

  return (
    <div ref={tableRef}> {/* ВАЖНО: ref для IntersectionObserver */}
      <Table
        {...tableProps}
        key={`table-${rowsPerPage}-${limitedData.length}`} // стабильный ключ для сохранения скролла
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
    </div>
  )
}

// Мемоизация с ИСПРАВЛЕННОЙ проверкой глубоких изменений editingRows
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
    prevProps.rowsPerPage !== nextProps.rowsPerPage || // КРИТИЧЕСКИ ВАЖНО для обновления пагинации
    false // Убрано forceRerenderKey
  ) {
    return false
  }

  // КРИТИЧЕСКИ ВАЖНО: Глубокая проверка изменений editingRows
  const prevEditingRows = prevProps.editingRows || {}
  const nextEditingRows = nextProps.editingRows || {}
  const prevEditingKeys = Object.keys(prevEditingRows)
  const nextEditingKeys = Object.keys(nextEditingRows)

  if (prevEditingKeys.length !== nextEditingKeys.length) {
    return false
  }

  // Проверяем, изменились ли ключи редактируемых строк
  if (prevEditingKeys.length > 0 || nextEditingKeys.length > 0) {
    const keysChanged = prevEditingKeys.some(key => !nextEditingKeys.includes(key)) ||
                       nextEditingKeys.some(key => !prevEditingKeys.includes(key))
    if (keysChanged) {
      return false
    }

    // НОВОЕ: Глубокое сравнение значений editingRows для одинаковых ключей
    for (const key of prevEditingKeys) {
      const prevRow = prevEditingRows[key]
      const nextRow = nextEditingRows[key]

      if (!nextRow) continue // ключ исчез, уже обработано выше

      // Сравниваем критические поля для Select компонентов (ПОЛНЫЙ СПИСОК)
      const criticalFields = [
        // Select компоненты
        'tagId', 'tagName', 'documentationId', 'projectCode', 'versionNumber',
        'unitId', 'blockId', 'block', 'costCategoryId', 'costTypeId',
        'locationId', 'rateId', 'materialId', 'material', 'nomenclatureId',
        'nomenclature', 'supplier',
        // Input компоненты
        'floors', 'quantityPd', 'quantitySpec', 'quantityRd'
      ]
      for (const field of criticalFields) {
        if (prevRow[field] !== nextRow[field]) {
          return false
        }
      }
    }
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