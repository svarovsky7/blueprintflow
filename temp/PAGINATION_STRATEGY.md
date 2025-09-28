# Стратегия серверной пагинации для Chessboard

## Текущая проблема

**Лимит 1000 строк недостаточен для проектов с 20K+ записей**

```typescript
// Текущий подход - жесткий лимит
.limit(1000) // Показывает только первые 1000 из 20000+ записей
```

## Рекомендуемые стратегии пагинации

### 1. OFFSET-BASED ПАГИНАЦИЯ (Простая реализация)

#### Преимущества:
- Простота реализации
- Совместимость с Ant Design Pagination
- Знакомый интерфейс для пользователей

#### Недостатки:
- Медленная для больших offset значений
- Проблема консистентности при изменении данных

#### Реализация:

```typescript
interface PaginationParams {
  page: number        // Текущая страница (1-based)
  pageSize: number    // Размер страницы
  total?: number      // Общее количество записей
}

// Добавить к AppliedFilters
interface AppliedFilters {
  // ... существующие фильтры
  pagination: PaginationParams
}

// Модифицированный хук
const useChessboardData = ({ appliedFilters, enabled }: UseChessboardDataProps) => {
  const { pagination } = appliedFilters
  const offset = (pagination.page - 1) * pagination.pageSize

  const queryFn = async () => {
    // Отдельный запрос для подсчета общего количества
    const { count } = await supabase
      .from('chessboard')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', appliedFilters.project_id)
      // ... применить фильтры

    // Основной запрос с пагинацией
    const { data } = await supabase
      .from('chessboard')
      .select(buildSelectQuery(appliedFilters))
      .eq('project_id', appliedFilters.project_id)
      // ... применить фильтры
      .range(offset, offset + pagination.pageSize - 1)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    return { data, total: count }
  }
}
```

### 2. CURSOR-BASED ПАГИНАЦИЯ (Рекомендуемая для больших данных)

#### Преимущества:
- Константная производительность O(log n)
- Консистентность при изменении данных
- Масштабируемость до миллионов записей

#### Недостатки:
- Сложнее реализация
- Нет прямого перехода на произвольную страницу
- Требует изменение UI компонентов

#### Реализация:

```typescript
interface CursorPagination {
  cursor?: {
    created_at: string  // Timestamp последней записи
    id: string         // UUID последней записи
  }
  limit: number
  hasMore: boolean
  hasPrevious: boolean
}

// Cursor запрос для следующей страницы
const getNextPage = async (cursor: CursorPagination['cursor'], limit: number) => {
  let query = supabase
    .from('chessboard')
    .select(buildSelectQuery(appliedFilters))
    .eq('project_id', appliedFilters.project_id)

  // Cursor условие для следующей страницы
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
  }

  return query
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit + 1) // +1 для определения hasMore
}

// UI компоненты для cursor навигации
const CursorPagination = ({ currentCursor, onNext, onPrevious, hasMore, hasPrevious }) => (
  <div className="pagination-cursor">
    <Button disabled={!hasPrevious} onClick={onPrevious}>
      ← Предыдущая
    </Button>
    <span>Страница {currentPage}</span>
    <Button disabled={!hasMore} onClick={onNext}>
      Следующая →
    </Button>
  </div>
)
```

### 3. ГИБРИДНАЯ СТРАТЕГИЯ (Комбинированный подход)

#### Концепция:
- Offset пагинация для небольших наборов данных (< 5K записей)
- Cursor пагинация для больших наборов данных (≥ 5K записей)
- Автоматическое переключение на основе размера данных

#### Реализация:

```typescript
const useAdaptivePagination = (appliedFilters: AppliedFilters) => {
  // Сначала получаем размер данных
  const { data: stats } = useQuery({
    queryKey: ['chessboard-stats', appliedFilters],
    queryFn: async () => {
      const { count } = await supabase
        .from('chessboard')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', appliedFilters.project_id)
        // ... применить фильтры
      return { totalRecords: count }
    }
  })

  // Выбираем стратегию на основе размера данных
  const paginationStrategy = useMemo(() => {
    if (!stats) return 'offset'
    return stats.totalRecords >= 5000 ? 'cursor' : 'offset'
  }, [stats?.totalRecords])

  return {
    strategy: paginationStrategy,
    useOffsetPagination: paginationStrategy === 'offset',
    useCursorPagination: paginationStrategy === 'cursor'
  }
}
```

## Рекомендуемая реализация для Chessboard

### Этап 1: Offset пагинация (Быстрая реализация)

```typescript
// 1. Обновить типы
interface AppliedFilters {
  // ... существующие фильтры
  pagination: {
    page: number
    pageSize: number
    total?: number
  }
}

// 2. Модифицировать useChessboardData
export const useChessboardData = ({ appliedFilters, enabled }: UseChessboardDataProps) => {
  const { pagination } = appliedFilters

  // Запрос для подсчета общего количества
  const { data: countData } = useQuery({
    queryKey: ['chessboard-count', appliedFilters.project_id, /* ... фильтры */],
    queryFn: async () => {
      let countQuery = supabase
        .from('chessboard')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', appliedFilters.project_id)

      countQuery = applyServerSideFilters(countQuery, appliedFilters)

      const { count, error } = await countQuery
      if (error) throw error
      return count || 0
    },
    enabled: enabled && !!appliedFilters.project_id
  })

  // Основной запрос данных с пагинацией
  const dataQuery = useQuery({
    queryKey: ['chessboard-data', appliedFilters, pagination.page, pagination.pageSize],
    queryFn: async () => {
      const offset = (pagination.page - 1) * pagination.pageSize

      let query = supabase
        .from('chessboard')
        .select(buildSelectQuery(appliedFilters))
        .eq('project_id', appliedFilters.project_id)

      query = applyServerSideFilters(query, appliedFilters)

      const { data, error } = await query
        .range(offset, offset + pagination.pageSize - 1)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: enabled && !!appliedFilters.project_id && !!countData
  })

  return {
    data: dataQuery.data || [],
    isLoading: dataQuery.isLoading,
    error: dataQuery.error,
    refetch: dataQuery.refetch,
    pagination: {
      current: pagination.page,
      pageSize: pagination.pageSize,
      total: countData || 0,
      showSizeChanger: true,
      showQuickJumper: true,
      showTotal: (total, range) =>
        `${range[0]}-${range[1]} из ${total} записей`
    }
  }
}

// 3. Обновить компонент таблицы
const ChessboardTable = () => {
  const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>({
    // ... существующие фильтры
    pagination: {
      page: 1,
      pageSize: 100, // Увеличить с 50 до 100 для лучшей производительности
      total: 0
    }
  })

  const { data, isLoading, pagination } = useChessboardData({ appliedFilters })

  const handlePaginationChange = (page: number, pageSize: number) => {
    setAppliedFilters(prev => ({
      ...prev,
      pagination: { ...prev.pagination, page, pageSize }
    }))
  }

  return (
    <Table
      dataSource={data}
      loading={isLoading}
      pagination={{
        ...pagination,
        onChange: handlePaginationChange,
        onShowSizeChange: handlePaginationChange
      }}
      // ... остальные props
    />
  )
}
```

### Этап 2: Cursor пагинация (Долгосрочная оптимизация)

```typescript
// Будущая реализация для проектов > 10K записей
interface CursorPaginationState {
  cursors: Array<{
    created_at: string
    id: string
    page: number
  }>
  currentPage: number
  pageSize: number
  hasMore: boolean
  hasPrevious: boolean
}

const useCursorPagination = (filters: AppliedFilters) => {
  // Реализация cursor логики
  // Сохранение cursors для возможности навигации назад
  // Prefetching следующей страницы
}
```

## UI/UX изменения

### 1. Расширенная пагинация
```typescript
const PaginationControls = ({
  strategy,
  offsetPagination,
  cursorPagination,
  onStrategyChange
}) => (
  <div className="pagination-controls">
    {strategy === 'offset' && (
      <Pagination
        {...offsetPagination}
        showSizeChanger
        showQuickJumper
        showTotal={(total, range) =>
          `${range[0]}-${range[1]} из ${total} записей`
        }
        pageSizeOptions={['50', '100', '200', '500', '1000']}
      />
    )}

    {strategy === 'cursor' && (
      <div className="cursor-pagination">
        <Button
          disabled={!cursorPagination.hasPrevious}
          onClick={cursorPagination.onPrevious}
        >
          ← Предыдущая
        </Button>
        <span>Страница {cursorPagination.currentPage}</span>
        <Button
          disabled={!cursorPagination.hasMore}
          onClick={cursorPagination.onNext}
        >
          Следующая →
        </Button>
      </div>
    )}

    {/* Переключатель стратегии для больших данных */}
    <Select
      value={strategy}
      onChange={onStrategyChange}
      style={{ marginLeft: 16 }}
    >
      <Option value="offset">Классическая пагинация</Option>
      <Option value="cursor">Быстрая навигация</Option>
    </Select>
  </div>
)
```

### 2. Индикатор загрузки с прогрессом
```typescript
const LoadingProgress = ({ currentPage, totalPages, isLoading }) => (
  <div className="loading-progress">
    {isLoading && (
      <Progress
        percent={Math.round((currentPage / totalPages) * 100)}
        format={() => `Загрузка страницы ${currentPage} из ${totalPages}`}
      />
    )}
  </div>
)
```

## Преимущества новой архитектуры

### Производительность:
- **Время загрузки**: 2-3 секунды для любого размера проекта
- **Memory usage**: Загрузка только текущей страницы (100-500 записей)
- **Network efficiency**: Один запрос вместо 4

### Пользовательский опыт:
- **Быстрая навигация** по большим наборам данных
- **Выбор размера страницы** от 50 до 1000 записей
- **Быстрый переход** на любую страницу (offset) или плавная навигация (cursor)
- **Индикатор прогресса** при загрузке

### Масштабируемость:
- **Поддержка проектов** любого размера (до 1M+ записей)
- **Автоматическое переключение** стратегий пагинации
- **Оптимизация памяти** браузера