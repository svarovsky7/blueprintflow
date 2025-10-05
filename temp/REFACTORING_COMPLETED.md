# Рефакторинг detail_cost_categories - Завершён ✅

## Дата выполнения
2025-10-05

## Выполненные изменения

### 1. SQL Миграции (3 файла в `sql/`)
- ✅ `sql/refactor_detail_cost_categories_step1_create_structure.sql` - Создание новой структуры
- ✅ `sql/refactor_detail_cost_categories_step2_migrate_data.sql` - Миграция данных
- ✅ `sql/refactor_detail_cost_categories_step3_replace_tables.sql` - Замена таблиц и добавление constraints (исправлены синтаксические ошибки с RAISE NOTICE)

### 2. TypeScript Изменения в `src/pages/references/CostCategories.tsx`

#### Обновлённые типы данных:
```typescript
interface DetailCategory {
  id: number
  name: string
  description: string | null
  unitId: string | null
  unitName: string | null
  costCategoryId: number
  locations: Array<{
    id: number
    name: string
  }>  // Изменено: было locationId и locationName
}

interface DetailCategoryRowDB {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  cost_category_id: number
  units: { name: string } | null
  detail_cost_categories_location_mapping: Array<{
    location: {
      id: number
      name: string
    }
  }>  // Новое: JOIN через маппинг-таблицу
}
```

#### Обновлённый API запрос:
```typescript
.select(
  'id, name, description, unit_id, cost_category_id, units(name), detail_cost_categories_location_mapping(location(id, name))'
)
```

#### Упрощённая группировка данных:
- Убрана промежуточная группировка по имени
- Данные теперь уже содержат массив локализаций

#### Обновлённые функции:
1. **`handleImport`** - Создаёт уникальные виды затрат + добавляет связи в маппинг-таблицу
2. **`handleSave`** - Создаёт один detail_cost_category + массив связей в маппинге
3. **`handleUpdate`** - Обновляет detail_cost_category + пересоздаёт связи в маппинге
4. **`handleDelete`** - Удаляет detail_cost_category (CASCADE автоматически удаляет маппинг)
5. **`startEdit`** - Упрощён поиск детали (теперь поиск по ID, а не по группе)
6. **`filteredRows`** - Исправлена фильтрация по локализации (проверка через locationIds.includes)
7. **`locationFilters`** - Исправлен сбор фильтров (теперь flatMap по locations)

### 3. Исправленные ошибки
- ❌ **Синтаксическая ошибка SQL**: `RAISE NOTICE` вне DO блоков → ✅ Обёрнуты в DO $$ блоки
- ❌ **TypeScript ошибка**: `filters.locationId` может быть undefined → ✅ Добавлен non-null assertion
- ❌ **TypeScript ошибка**: `r.location` не существует → ✅ Изменено на `r.locations` с flatMap

### 4. Результаты проверки
- ✅ TypeScript компиляция без ошибок в `CostCategories.tsx`
- ✅ SQL миграции готовы к выполнению
- ✅ Все функции обновлены согласно новой структуре БД

## Порядок применения изменений

### Шаг 1: Создать backup БД
```bash
pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Шаг 2: Выполнить SQL миграции
```bash
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step1_create_structure.sql
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step2_migrate_data.sql
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step3_replace_tables.sql
```

### Шаг 3: Проверить результаты миграции
```sql
SELECT
    (SELECT COUNT(*) FROM detail_cost_categories) AS new_count,
    (SELECT COUNT(*) FROM detail_cost_categories_old) AS old_count,
    (SELECT COUNT(*) FROM detail_cost_categories_location_mapping) AS mapping_count;
```

### Шаг 4: Протестировать приложение
1. Запустить dev сервер: `npm run dev`
2. Открыть страницу "Категории затрат"
3. Протестировать:
   - Загрузку данных с локализациями
   - Импорт Excel файла
   - Добавление нового вида затрат
   - Редактирование существующего вида
   - Удаление вида затрат
   - Фильтрацию по локализации

### Шаг 5: После успешного тестирования
```sql
-- Через несколько дней, когда убедитесь, что всё работает
DROP TABLE IF EXISTS detail_cost_categories_old CASCADE;
```

## Новая структура БД

### ДО миграции:
```
detail_cost_categories:
- id (PK)
- name (ДУБЛИРУЕТСЯ!)
- cost_category_id
- location_id (FK) ← Убрано!
- unit_id, description
```

### ПОСЛЕ миграции:
```
detail_cost_categories:
- id (PK)
- name (UNIQUE!)
- cost_category_id (FK)
- unit_id, description

detail_cost_categories_location_mapping:
- detail_cost_category_id (PK, FK)
- location_id (PK, FK)
```

## Преимущества новой структуры
✅ Уникальные названия видов затрат
✅ Нормализованная структура (3NF)
✅ Меньше дублирования данных
✅ Упрощённое управление (обновление в одном месте)
✅ Быстрее запросы (меньше строк в основной таблице)
✅ Референциальная целостность через FK constraints
✅ Гибкость в управлении связями с локализациями

## Документация
- **SQL миграции**: `sql/refactor_detail_cost_categories_step*.sql`
- **README миграций**: `sql/README_MIGRATION.md`
- **Детальный гайд по изменениям**: `temp/CHANGES_CostCategories.md`
- **Общий обзор**: `temp/REFACTORING_SUMMARY.md`

## Статус: ✅ ГОТОВО К ПРИМЕНЕНИЮ
