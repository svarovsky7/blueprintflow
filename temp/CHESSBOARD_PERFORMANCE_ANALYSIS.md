# Анализ производительности Chessboard: Оптимизация для 20K+ строк

## Анализ текущих узких мест

### 1. КРИТИЧЕСКИЕ ПРОБЛЕМЫ

#### 1.1 N+1 Query Problem
**Проблема**: Основной запрос + 3 отдельных запроса для связанных данных
```typescript
// Текущая архитектура:
1. Основной запрос чессборда (rawData)
2. Запрос документации (documentationData)
3. Запрос этажей (floorsData)
4. Запрос расценок (ratesData)
```

**Влияние**: 4 сетевых запроса вместо 1, увеличение latency в 4 раза

#### 1.2 URL Length Overflow
**Проблема**: Батчинг по 50 ID может превышать лимит URL (2048 символов)
```typescript
// Текущий батчинг создает длинные URL:
.in('id', batch) // batch[50] * 36 chars (UUID) = 1800+ chars
```

**Влияние**: HTTP 414 ошибки при больших выборках

#### 1.3 Клиентская обработка больших массивов
**Проблема**: Трансформация 20K+ записей на клиенте
```typescript
// useMemo пересчитывает все данные при каждом изменении фильтров
const transformedData = useMemo(() => {
  // O(n) обработка для каждой записи + O(n) для Map lookups
}, [rawData, documentationData, floorsData, ratesData])
```

#### 1.4 Отсутствие серверной пагинации
**Проблема**: Лимит 1000 строк - недостаточно для проектов 20K+
```typescript
.limit(1000) // Жестко установленный лимит
```

### 2. ПРОИЗВОДИТЕЛЬНЫЕ УЗКИЕ МЕСТА

#### 2.1 Множественные JOIN операции
```sql
-- Текущий запрос делает 8+ JOIN для каждой строки
SELECT chessboard.*,
       materials.name,
       units.name,
       chessboard_mapping.*,
       cost_categories.*,
       detail_cost_categories.*,
       location.*,
       blocks.*,
       chessboard_nomenclature_mapping.*,
       nomenclature.*
```

#### 2.2 Отсутствие индексов на фильтруемые поля
**Отсутствуют композитные индексы для:**
- (project_id, cost_category_id)
- (project_id, block_id)
- (chessboard_id, documentation_id)

#### 2.3 Дублированные запросы
**Проблема**: Одинаковые запросы выполняются несколько раз из-за нестабильных queryKey

### 3. MEMORY OVERHEAD

#### 3.1 Хранение дублированных данных
- `rawData` - исходные данные (основной запрос)
- `filteredRawData` - отфильтрованные данные (batch processing)
- `transformedData` - преобразованные данные для UI

**Оценка памяти**: 20K записей × 3 копии × ~2KB = ~120MB только данных

## Рекомендации по оптимизации

### 1. АРХИТЕКТУРНЫЕ ИЗМЕНЕНИЯ

#### 1.1 Консолидированный SQL запрос
Заменить N+1 запросы на один комплексный запрос с правильными JOIN:

```sql
-- Оптимизированный запрос
SELECT
  c.id,
  c.material,
  c.color,
  c.created_at,
  c.updated_at,

  -- Материалы и единицы
  m.name as material_name,
  u.name as unit_name,

  -- Маппинг данные (одним запросом)
  cm.cost_category_id,
  cm.cost_type_id,
  cm.location_id,
  cm.block_id,
  cc.name as cost_category_name,
  cc.number as cost_category_number,
  dcc.name as detail_cost_category_name,
  l.name as location_name,
  b.name as block_name,

  -- Номенклатура
  cnm.nomenclature_id,
  cnm.supplier_name,
  n.name as nomenclature_name,

  -- Документация (агрегированно)
  COALESCE(
    JSON_AGG(
      DISTINCT jsonb_build_object(
        'version_id', cdm.version_id,
        'documentation_code', d.code,
        'project_name', d.project_name,
        'version_number', dv.version_number,
        'tag_name', dt.name
      )
    ) FILTER (WHERE cdm.chessboard_id IS NOT NULL),
    '[]'::json
  ) as documentation_data,

  -- Этажи (агрегированно)
  COALESCE(
    JSON_AGG(
      DISTINCT jsonb_build_object(
        'floor_number', cfm.floor_number,
        'quantityPd', cfm."quantityPd",
        'quantitySpec', cfm."quantitySpec",
        'quantityRd', cfm."quantityRd"
      )
    ) FILTER (WHERE cfm.chessboard_id IS NOT NULL),
    '[]'::json
  ) as floors_data,

  -- Расценки
  r.work_name,
  r.work_set,
  r.base_rate,
  ru.name as rate_unit_name

FROM chessboard c
LEFT JOIN materials m ON c.material_id = m.id
LEFT JOIN units u ON c.unit_id = u.id
LEFT JOIN chessboard_mapping cm ON c.id = cm.chessboard_id
LEFT JOIN cost_categories cc ON cm.cost_category_id = cc.id
LEFT JOIN detail_cost_categories dcc ON cm.cost_type_id = dcc.id
LEFT JOIN location l ON cm.location_id = l.id
LEFT JOIN blocks b ON cm.block_id = b.id
LEFT JOIN chessboard_nomenclature_mapping cnm ON c.id = cnm.chessboard_id
LEFT JOIN nomenclature n ON cnm.nomenclature_id = n.id
LEFT JOIN chessboard_documentation_mapping cdm ON c.id = cdm.chessboard_id
LEFT JOIN documentation_versions dv ON cdm.version_id = dv.id
LEFT JOIN documentations d ON dv.documentation_id = d.id
LEFT JOIN documentation_tags dt ON d.tag_id = dt.id
LEFT JOIN chessboard_floor_mapping cfm ON c.id = cfm.chessboard_id
LEFT JOIN chessboard_rates_mapping crm ON c.id = crm.chessboard_id
LEFT JOIN rates r ON crm.rate_id = r.id
LEFT JOIN units ru ON r.unit_id = ru.id

WHERE c.project_id = $1
  AND ($2::int[] IS NULL OR cm.cost_category_id = ANY($2))
  AND ($3::text[] IS NULL OR cm.block_id = ANY($3))
  AND ($4::int[] IS NULL OR cm.cost_type_id = ANY($4))
  AND ($5::text[] IS NULL OR d.id = ANY($5))
  AND ($6::int[] IS NULL OR dt.id = ANY($6))
  AND ($7::text IS NULL OR m.name ILIKE '%' || $7 || '%')

GROUP BY c.id, m.name, u.name, cm.cost_category_id, cm.cost_type_id,
         cm.location_id, cm.block_id, cc.name, cc.number, dcc.name,
         l.name, b.name, cnm.nomenclature_id, cnm.supplier_name, n.name,
         r.work_name, r.work_set, r.base_rate, ru.name

ORDER BY c.created_at DESC, c.id DESC
LIMIT $8 OFFSET $9;
```

#### 1.2 Серверная пагинация
```typescript
interface PaginationParams {
  page: number
  pageSize: number
  total?: number
}

// Добавить параметры пагинации к фильтрам
interface AppliedFilters {
  // ... существующие фильтры
  pagination: PaginationParams
}
```

#### 1.3 Cursor-based пагинация для больших данных
```typescript
interface CursorPagination {
  cursor?: string // ID последней записи
  limit: number
  hasMore: boolean
}

// Запрос с cursor
SELECT * FROM chessboard
WHERE project_id = $1
  AND (created_at, id) < ($2, $3) -- cursor условие
ORDER BY created_at DESC, id DESC
LIMIT $4;
```

### 2. ИНДЕКСАЦИЯ БД

#### 2.1 Критически важные композитные индексы
```sql
-- Основные фильтры
CREATE INDEX CONCURRENTLY idx_chessboard_project_filters
ON chessboard (project_id, created_at DESC, id DESC);

-- Маппинг индексы
CREATE INDEX CONCURRENTLY idx_chessboard_mapping_filters
ON chessboard_mapping (chessboard_id, cost_category_id, block_id, cost_type_id);

-- Документация фильтры
CREATE INDEX CONCURRENTLY idx_documentation_mapping_filters
ON chessboard_documentation_mapping (chessboard_id, version_id);

CREATE INDEX CONCURRENTLY idx_documentation_versions_lookup
ON documentation_versions (id, documentation_id, version_number);

CREATE INDEX CONCURRENTLY idx_documentations_filters
ON documentations (id, code, tag_id, project_name);

-- Этажи и расценки
CREATE INDEX CONCURRENTLY idx_floor_mapping_chessboard
ON chessboard_floor_mapping (chessboard_id, floor_number);

CREATE INDEX CONCURRENTLY idx_rates_mapping_chessboard
ON chessboard_rates_mapping (chessboard_id, rate_id);

-- Поиск по материалам
CREATE INDEX CONCURRENTLY idx_materials_name_gin
ON materials USING gin(name gin_trgm_ops);
```

#### 2.2 Частичные индексы для активных проектов
```sql
-- Индекс только для активных проектов (экономия места)
CREATE INDEX CONCURRENTLY idx_chessboard_active_projects
ON chessboard (project_id, created_at DESC)
WHERE project_id IN (SELECT id FROM projects WHERE is_active = true);
```

### 3. КЕШИРОВАНИЕ И ОПТИМИЗАЦИЯ ЗАПРОСОВ

#### 3.1 React Query оптимизация
```typescript
// Увеличить staleTime для стабильных данных
const staleTime = {
  chessboard: 5 * 60 * 1000, // 5 минут для основных данных
  references: 30 * 60 * 1000, // 30 минут для справочников
  statistics: 2 * 60 * 1000   // 2 минуты для статистики
}

// Prefetch следующей страницы
const { prefetchQuery } = useQueryClient()
useEffect(() => {
  if (hasNextPage) {
    prefetchQuery({
      queryKey: ['chessboard-data', filters, nextPage],
      queryFn: () => fetchChessboardData(filters, nextPage)
    })
  }
}, [currentPage, hasNextPage])
```

#### 3.2 Виртуализация UI для больших таблиц
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

// Виртуальная таблица для 20K+ строк
const tableVirtualizer = useVirtualizer({
  count: data.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50, // высота строки
  overscan: 10 // количество строк для предзагрузки
})
```

### 4. ОПТИМИЗАЦИЯ ПАМЯТИ

#### 4.1 Ленивая загрузка данных
```typescript
// Загружать детали только при необходимости
const useChessboardDetails = (id: string, enabled: boolean) => {
  return useQuery({
    queryKey: ['chessboard-details', id],
    queryFn: () => fetchChessboardDetails(id),
    enabled: enabled, // активировать только при открытии деталей
    staleTime: 10 * 60 * 1000
  })
}
```

#### 4.2 Мемоизация трансформации данных
```typescript
// Стабильная мемоизация без пересчета при фильтрации
const processedData = useMemo(() => {
  return rawData?.map(row => ({
    ...row,
    // Обработка только необходимых полей
    displayName: `${row.material} (${row.unit})`,
    totalQuantity: calculateTotal(row.quantities)
  }))
}, [rawData]) // Не зависит от фильтров - они применяются на сервере
```

## План реализации

### Этап 1: Критическая оптимизация (Неделя 1)
1. **Создать композитные индексы БД** - немедленное улучшение производительности
2. **Реализовать консолидированный SQL запрос** - устранить N+1 problem
3. **Добавить серверную пагинацию** - решить проблему лимита 1000 строк

### Этап 2: Архитектурные улучшения (Неделя 2)
1. **Внедрить cursor-based пагинацию** для больших наборов данных
2. **Оптимизировать React Query кеширование**
3. **Добавить префетчинг** следующих страниц

### Этап 3: UI оптимизация (Неделя 3)
1. **Внедрить виртуализацию таблицы** для плавной прокрутки 20K+ строк
2. **Реализовать ленивую загрузку деталей**
3. **Оптимизировать memory usage**

### Этап 4: Мониторинг и fine-tuning (Неделя 4)
1. **Добавить метрики производительности**
2. **Настроить алерты на медленные запросы**
3. **Провести нагрузочное тестирование**

## Ожидаемые результаты

### Производительность
- **Время загрузки**: с 10-15 сек до 2-3 сек для 20K строк
- **Memory usage**: снижение на 60-70%
- **Network requests**: с 4 запросов до 1
- **UI responsiveness**: плавная прокрутка любого количества строк

### Метрики
- **TTFB** (Time to First Byte): < 500ms
- **FCP** (First Contentful Paint): < 1s
- **LCP** (Largest Contentful Paint): < 2.5s
- **TBT** (Total Blocking Time): < 300ms

### Пользовательский опыт
- Мгновенная отзывчивость при фильтрации
- Плавная прокрутка без лагов
- Быстрое переключение между страницами
- Стабильная работа с проектами любого размера