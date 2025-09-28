# План реализации оптимизации Chessboard для 20K+ строк

## Общая стратегия

**Цель**: Снизить время загрузки с 10-15 секунд до 2-3 секунд для проектов с 20000+ записей

**Подход**: Поэтапная реализация с немедленным применением критических оптимизаций

## ЭТАП 1: КРИТИЧЕСКИЕ ОПТИМИЗАЦИИ (Неделя 1) - ПРИОРИТЕТ 1

### 1.1 Применение индексов БД (День 1) 🔥 КРИТИЧНО
**Файл**: `sql/chessboard_performance_indexes.sql`

**Действия**:
```bash
# Немедленно применить в production
psql "$SUPABASE_DB_URL" -f sql/chessboard_performance_indexes.sql
```

**Ожидаемый результат**: Ускорение запросов в 3-5 раз

**Проверка**:
```sql
-- Проверить применение индексов
SELECT indexname, tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_chessboard%';

-- Анализ использования индексов
EXPLAIN ANALYZE
SELECT * FROM chessboard
WHERE project_id = 'uuid'
ORDER BY created_at DESC
LIMIT 1000;
```

### 1.2 Серверная пагинация (Дни 2-3)
**Файлы для изменения**:
- `src/pages/documents/Chessboard/types/index.ts` - добавить PaginationParams
- `src/pages/documents/Chessboard/hooks/useChessboardData.ts` - реализовать пагинацию
- `src/pages/documents/Chessboard.tsx` - обновить UI компонент

**Изменения в типах**:
```typescript
// Добавить к AppliedFilters
interface AppliedFilters {
  // ... существующие фильтры
  pagination: {
    page: number        // Текущая страница (1-based)
    pageSize: number    // Размер страницы (50, 100, 200, 500, 1000)
    total?: number      // Общее количество записей
  }
}
```

**Модификация useChessboardData**:
```typescript
// Разделить на два запроса: count + data
const { data: totalCount } = useQuery({
  queryKey: ['chessboard-count', filterKey],
  queryFn: () => getChessboardCount(appliedFilters)
})

const { data: pageData } = useQuery({
  queryKey: ['chessboard-page', filterKey, pagination.page],
  queryFn: () => getChessboardPage(appliedFilters, pagination),
  enabled: !!totalCount
})
```

### 1.3 Устранение N+1 Problem (Дни 4-5)
**Цель**: Заменить 4 отдельных запроса одним консолидированным

**Создать новую API функцию**:
```typescript
// src/entities/chessboard/api/chessboard-optimized-api.ts
export const getChessboardDataOptimized = async (
  filters: AppliedFilters,
  pagination: PaginationParams
): Promise<{ data: RowData[], total: number }> => {
  // Использовать функцию get_chessboard_data_optimized из SQL
  const { data, error } = await supabase.rpc(
    'get_chessboard_data_optimized',
    {
      p_project_id: filters.project_id,
      p_cost_category_ids: filters.cost_category_ids,
      p_block_ids: filters.block_ids,
      // ... остальные параметры
      p_limit: pagination.pageSize,
      p_offset: (pagination.page - 1) * pagination.pageSize
    }
  )

  if (error) throw error
  return {
    data: data?.map(transformRow) || [],
    total: data?.[0]?.total_count || 0
  }
}
```

**Ожидаемый результат**: Сокращение сетевых запросов с 4 до 1

## ЭТАП 2: АРХИТЕКТУРНЫЕ УЛУЧШЕНИЯ (Неделя 2) - ПРИОРИТЕТ 2

### 2.1 Оптимизация React Query кеширования (Дни 1-2)

**Настройка агрессивного кеширования**:
```typescript
// src/pages/documents/Chessboard/hooks/useChessboardData.ts
const queryClient = useQueryClient()

const staleTime = {
  chessboard: 5 * 60 * 1000,    // 5 минут для основных данных
  references: 30 * 60 * 1000,   // 30 минут для справочников
  count: 2 * 60 * 1000          // 2 минуты для счетчиков
}

// Prefetching следующей страницы
useEffect(() => {
  if (pagination.page < Math.ceil(totalCount / pagination.pageSize)) {
    queryClient.prefetchQuery({
      queryKey: ['chessboard-page', filterKey, pagination.page + 1],
      queryFn: () => getChessboardPage(appliedFilters, {
        ...pagination,
        page: pagination.page + 1
      }),
      staleTime: staleTime.chessboard
    })
  }
}, [pagination.page, totalCount])
```

### 2.2 Оптимизация мемоизации (Дни 3-4)

**Разделение трансформации данных**:
```typescript
// Стабильная мемоизация без пересчета при изменении фильтров
const processedData = useMemo(() => {
  if (!rawData) return []

  return rawData.map(row => ({
    ...row,
    // Обработка только необходимых полей
    displayName: `${row.material_name} (${row.unit_name})`,
    totalQuantity: calculateRowTotal(row.floors_data),
    // Парсинг JSON данных один раз
    documentation: JSON.parse(row.documentation_data),
    floors: JSON.parse(row.floors_data)
  }))
}, [rawData]) // Зависит только от rawData, не от фильтров

// Отдельная мемоизация для статистики
const statistics = useMemo(() => {
  return calculateStatistics(processedData)
}, [processedData])
```

### 2.3 Batch loading для справочников (День 5)

**Кеширование статических данных**:
```typescript
// src/shared/hooks/useReferenceData.ts
export const useReferenceData = () => {
  return useQuery({
    queryKey: ['reference-data'],
    queryFn: async () => {
      // Загрузить все справочники одним запросом
      const [materials, units, blocks, categories] = await Promise.all([
        supabase.from('materials').select('id, name'),
        supabase.from('units').select('id, name'),
        supabase.from('blocks').select('id, name'),
        supabase.from('cost_categories').select('id, name, number')
      ])

      return {
        materials: materials.data || [],
        units: units.data || [],
        blocks: blocks.data || [],
        categories: categories.data || []
      }
    },
    staleTime: 30 * 60 * 1000, // 30 минут
    cacheTime: 60 * 60 * 1000  // 1 час
  })
}
```

## ЭТАП 3: UI ОПТИМИЗАЦИЯ (Неделя 3) - ПРИОРИТЕТ 3

### 3.1 Виртуализация таблицы (Дни 1-3)

**Установка зависимостей**:
```bash
npm install @tanstack/react-virtual
```

**Реализация виртуальной таблицы**:
```typescript
// src/pages/documents/Chessboard/components/VirtualizedTable.tsx
import { useVirtualizer } from '@tanstack/react-virtual'

export const VirtualizedChessboardTable = ({ data, columns }) => {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // высота строки
    overscan: 10 // строки для предзагрузки
  })

  return (
    <div ref={parentRef} style={{ height: 'calc(100vh - 300px)', overflow: 'auto' }}>
      <div style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((virtualRow) => (
          <div
            key={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: virtualRow.size,
              transform: `translateY(${virtualRow.start}px)`
            }}
          >
            <ChessboardRow data={data[virtualRow.index]} />
          </div>
        ))}
      </div>
    </div>
  )
}
```

### 3.2 Ленивая загрузка деталей (Дни 4-5)

**Загрузка деталей по требованию**:
```typescript
// Загружать детали только при раскрытии строки
const useRowDetails = (rowId: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['row-details', rowId],
    queryFn: () => getRowDetails(rowId),
    enabled: enabled,
    staleTime: 10 * 60 * 1000
  })
}

// В компоненте таблицы
const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

const handleRowExpand = (rowId: string, expanded: boolean) => {
  setExpandedRows(prev => {
    const newSet = new Set(prev)
    if (expanded) {
      newSet.add(rowId)
    } else {
      newSet.delete(rowId)
    }
    return newSet
  })
}
```

## ЭТАП 4: МОНИТОРИНГ И FINE-TUNING (Неделя 4) - ПРИОРИТЕТ 4

### 4.1 Метрики производительности (Дни 1-2)

**Добавление мониторинга**:
```typescript
// src/shared/hooks/usePerformanceMonitoring.ts
export const usePerformanceMonitoring = () => {
  const startTime = useRef<number>()

  const startMeasure = (label: string) => {
    startTime.current = performance.now()
    console.log(`⏱️ ${label} started`)
  }

  const endMeasure = (label: string) => {
    if (startTime.current) {
      const duration = performance.now() - startTime.current
      console.log(`✅ ${label} completed in ${Math.round(duration)}ms`)

      // Отправка метрик в аналитику
      if (duration > 3000) {
        console.warn(`⚠️ Slow performance detected: ${label} took ${duration}ms`)
      }
    }
  }

  return { startMeasure, endMeasure }
}
```

### 4.2 Автоматическое тестирование производительности (Дни 3-4)

**Playwright тесты производительности**:
```typescript
// tests/chessboard-performance.spec.ts
import { test, expect } from '@playwright/test'

test('Chessboard loads large dataset within 3 seconds', async ({ page }) => {
  await page.goto('/chessboard')

  // Выбрать проект с большим количеством данных
  await page.selectOption('[data-testid="project-select"]', 'large-project-id')

  // Измерить время загрузки
  const startTime = Date.now()

  await page.waitForSelector('[data-testid="chessboard-table"]')
  await page.waitForFunction(() => {
    const table = document.querySelector('[data-testid="chessboard-table"]')
    return table && table.querySelectorAll('tbody tr').length > 0
  })

  const loadTime = Date.now() - startTime

  // Проверить время загрузки
  expect(loadTime).toBeLessThan(3000)

  // Проверить количество загруженных строк
  const rows = await page.locator('[data-testid="chessboard-table"] tbody tr').count()
  expect(rows).toBeGreaterThan(0)
  expect(rows).toBeLessThanOrEqual(100) // Размер страницы
})

test('Pagination works smoothly for large datasets', async ({ page }) => {
  await page.goto('/chessboard')
  await page.selectOption('[data-testid="project-select"]', 'large-project-id')

  // Дождаться загрузки первой страницы
  await page.waitForSelector('[data-testid="chessboard-table"]')

  // Перейти на вторую страницу
  const startTime = Date.now()
  await page.click('[data-testid="pagination-next"]')
  await page.waitForSelector('[data-testid="chessboard-table"]')
  const pageChangeTime = Date.now() - startTime

  // Проверить быстроту переключения страниц
  expect(pageChangeTime).toBeLessThan(1000)
})
```

### 4.3 Настройка алертов и дашборда (День 5)

**Интеграция с мониторингом**:
```typescript
// src/shared/utils/performance-tracker.ts
export class PerformanceTracker {
  private static instance: PerformanceTracker

  static getInstance() {
    if (!this.instance) {
      this.instance = new PerformanceTracker()
    }
    return this.instance
  }

  trackQuery(queryName: string, duration: number, recordCount: number) {
    const metrics = {
      query: queryName,
      duration,
      recordCount,
      timestamp: new Date().toISOString(),
      url: window.location.pathname
    }

    // Отправка в аналитику
    if (window.gtag) {
      window.gtag('event', 'query_performance', {
        custom_map: metrics
      })
    }

    // Логирование медленных запросов
    if (duration > 3000) {
      console.warn('🐌 Slow query detected:', metrics)

      // Можно добавить отправку в Sentry или другую систему мониторинга
      if (window.Sentry) {
        window.Sentry.captureMessage('Slow query performance', {
          extra: metrics,
          level: 'warning'
        })
      }
    }
  }
}
```

## КРИТИЧЕСКИЕ КОНТРОЛЬНЫЕ ТОЧКИ

### Неделя 1 - Контрольная точка 1
**Критерии успеха**:
- [x] Индексы применены и используются (проверка EXPLAIN ANALYZE)
- [x] Серверная пагинация работает
- [x] Время загрузки первой страницы < 5 секунд
- [x] N+1 проблема устранена

**Метрики**:
```sql
-- Проверка производительности после этапа 1
SELECT
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
WHERE query LIKE '%chessboard%'
ORDER BY mean_time DESC;
```

### Неделя 2 - Контрольная точка 2
**Критерии успеха**:
- [x] Prefetching работает
- [x] Кеширование справочников активно
- [x] Memory usage стабилен
- [x] Время переключения страниц < 1 секунды

### Неделя 3 - Контрольная точка 3
**Критерии успеха**:
- [x] Виртуализация таблицы работает плавно
- [x] Прокрутка 20K+ строк без лагов
- [x] Ленивая загрузка деталей функционирует
- [x] UI остается отзывчивым

### Неделя 4 - Финальная контрольная точка
**Критерии успеха**:
- [x] Все автотесты проходят
- [x] Время загрузки 20K проекта < 3 секунд
- [x] Memory usage < 150MB для 20K записей
- [x] Пользователи подтверждают улучшение производительности

## ПЛАН ОТКАТА (ROLLBACK PLAN)

**В случае проблем с производительностью**:

1. **Отключить новые функции**:
```typescript
// Feature flags для быстрого отключения
const USE_OPTIMIZED_QUERIES = false
const USE_VIRTUALIZATION = false
const USE_PAGINATION = false
```

2. **Откат индексов** (только при критических проблемах):
```sql
-- Удалить проблемные индексы
DROP INDEX CONCURRENTLY IF EXISTS idx_chessboard_project_performance;
```

3. **Возврат к старой версии хука**:
```bash
git checkout main -- src/pages/documents/Chessboard/hooks/useChessboardData.ts
```

## ОЖИДАЕМЫЕ РЕЗУЛЬТАТЫ

### Производительность
- **Время загрузки**: ↓ 70% (с 10-15 сек до 2-3 сек)
- **Memory usage**: ↓ 60% (только текущая страница в памяти)
- **Network requests**: ↓ 75% (с 4 запросов до 1)
- **UI responsiveness**: ↑ 90% (плавная прокрутка любого количества строк)

### Пользовательский опыт
- ✅ Мгновенная отзывчивость при фильтрации
- ✅ Плавная прокрутка без лагов
- ✅ Быстрое переключение между страницами
- ✅ Стабильная работа с проектами любого размера
- ✅ Индикатор прогресса при загрузке

### Техническая задолженность
- ✅ Устранение N+1 anti-pattern
- ✅ Оптимизация SQL запросов
- ✅ Современные паттерны React (мемоизация, виртуализация)
- ✅ Покрытие автотестами производительности