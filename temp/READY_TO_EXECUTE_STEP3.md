# Готовность к выполнению шага 3 миграции

## Текущее состояние БД ✅

Проверка подтвердила:
- ✅ Шаг 1 выполнен - таблицы созданы
- ✅ Шаг 2 выполнен - данные мигрированы (218 записей в маппинге)
- ⏳ Шаг 3 НЕ выполнен - таблицы не переключены

**Доказательство:** В текущей `detail_cost_categories` есть столбец `location_id` (старая структура)

## Что сделает шаг 3

```sql
-- 1. Переименует старую таблицу
detail_cost_categories → detail_cost_categories_old

-- 2. Активирует новую таблицу
detail_cost_categories_new → detail_cost_categories

-- 3. Добавит constraints
- UNIQUE constraint на name (больше не будет дубликатов!)
- FK на cost_categories
- FK на units
- FK для маппинг-таблицы

-- 4. Пересоздаст индексы
```

## Команда для выполнения

```bash
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step3_replace_tables.sql
```

## Ожидаемый результат

```
NOTICE: Старая таблица переименована в detail_cost_categories_old
NOTICE: Новая таблица активирована как detail_cost_categories
NOTICE: Sequence переименован в detail_cost_categories_id_seq
NOTICE: Добавлен FK constraint: detail_cost_categories.cost_category_id -> cost_categories.id
NOTICE: Добавлен FK constraint: detail_cost_categories.unit_id -> units.id
NOTICE: Добавлен UNIQUE constraint на detail_cost_categories.name
NOTICE: Добавлен FK constraint: detail_cost_categories_location_mapping.detail_cost_category_id -> detail_cost_categories.id
NOTICE: Добавлен FK constraint: detail_cost_categories_location_mapping.location_id -> location.id
NOTICE: Создан индекс idx_detail_cost_categories_cost_category
NOTICE: =================================================================
NOTICE: Миграция завершена успешно!
NOTICE: Записей в detail_cost_categories: 181 (было: 218)
NOTICE: Связей в маппинг-таблице: 218
NOTICE: Старая таблица сохранена как: detail_cost_categories_old
NOTICE: =================================================================
```

## Проверка после выполнения

```bash
# 1. Проверить отсутствие дубликатов
psql "$DATABASE_URL" -c "
SELECT name, COUNT(*) as count
FROM detail_cost_categories
GROUP BY name
HAVING COUNT(*) > 1;
"
# Должен вернуть пустой результат (0 rows)

# 2. Проверить количество записей
psql "$DATABASE_URL" -c "
SELECT
    (SELECT COUNT(*) FROM detail_cost_categories) AS new_count,
    (SELECT COUNT(*) FROM detail_cost_categories_old) AS old_count,
    (SELECT COUNT(*) FROM detail_cost_categories_location_mapping) AS mapping_count;
"
# Ожидается: new_count=181, old_count=218, mapping_count=218

# 3. Проверить структуру таблицы (location_id должен исчезнуть)
psql "$DATABASE_URL" -f sql/check_table_structure.sql
```

## Если возникнут ошибки

Шаг 3 теперь **полностью идемпотентен** - его можно запускать повторно без последствий.

Если всё равно возникла ошибка:
1. Изучите текст ошибки
2. Выполните откат: `psql "$DATABASE_URL" -f sql/rollback_step3.sql`
3. Исправьте проблему
4. Повторите шаг 3

## После успешного выполнения

1. ✅ Протестируйте приложение
2. ✅ Проверьте работу Excel импорта
3. ✅ Убедитесь, что фильтры работают
4. ✅ Если всё работает - удалите старую таблицу:

```bash
psql "$DATABASE_URL" -c "DROP TABLE IF EXISTS detail_cost_categories_old CASCADE;"
```

## Дата создания
2025-10-05
