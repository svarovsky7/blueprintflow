# Ошибка миграции: Дубликаты в detail_cost_categories

## Проблема

При выполнении шага 3 миграции возникла ошибка:
```
ERROR: 23505: could not create unique index "unique_detail_cost_category_name"
DETAIL: Key (name)=(Отделка потолков) is duplicated.
```

**Причина:** В таблице `detail_cost_categories` остались дубликаты по полю `name`.

Это означает одно из двух:
1. **Шаг 2 не был выполнен** - миграция данных с устранением дубликатов не была запущена
2. **Шаг 2 выполнен некорректно** - дубликаты не были устранены в процессе миграции

## Диагностика

### Проверить текущее состояние БД:
```bash
psql "$DATABASE_URL" -f sql/check_duplicates.sql
```

Этот скрипт покажет:
- Какие таблицы существуют (detail_cost_categories, detail_cost_categories_new, detail_cost_categories_old)
- Список дубликатов по name
- Примеры дублирующихся записей
- Состояние маппинг-таблицы

## Решение 1: Откат шага 3 и повторное выполнение шага 2

Если шаг 2 не был выполнен или выполнен некорректно:

```bash
# 1. Откатить шаг 3
psql "$DATABASE_URL" -f sql/rollback_step3.sql

# 2. Проверить состояние
psql "$DATABASE_URL" -f sql/check_duplicates.sql

# 3. Выполнить шаг 2 заново (миграция данных с устранением дубликатов)
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step2_migrate_data.sql

# 4. Снова выполнить шаг 3
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step3_replace_tables.sql
```

## Решение 2: Ручное удаление дубликатов

Если шаги 1-2 были выполнены, но в текущей таблице `detail_cost_categories` всё равно есть дубликаты (например, из-за `location_id`), нужно их удалить вручную.

### Скрипт для удаления дубликатов (ОСТОРОЖНО!):

```sql
-- ВАЖНО: Этот скрипт удаляет дубликаты, оставляя только первую запись для каждого name
-- Перед выполнением создайте backup!

-- Создать временную таблицу с уникальными записями
CREATE TEMP TABLE temp_unique_details AS
SELECT DISTINCT ON (cost_category_id, name)
    id,
    name,
    description,
    unit_id,
    cost_category_id,
    created_at,
    updated_at
FROM detail_cost_categories
ORDER BY cost_category_id, name, id;

-- Проверить, сколько записей останется
SELECT
    (SELECT COUNT(*) FROM detail_cost_categories) as current_count,
    (SELECT COUNT(*) FROM temp_unique_details) as unique_count,
    (SELECT COUNT(*) FROM detail_cost_categories) - (SELECT COUNT(*) FROM temp_unique_details) as to_delete;

-- Если результат выглядит правильно, продолжаем:

-- Удалить все дубликаты
DELETE FROM detail_cost_categories
WHERE id NOT IN (SELECT id FROM temp_unique_details);

-- Проверить результат
SELECT name, COUNT(*) as count
FROM detail_cost_categories
GROUP BY name
HAVING COUNT(*) > 1;
-- Должна вернуть пустой результат
```

После удаления дубликатов можно снова запустить шаг 3:
```bash
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step3_replace_tables.sql
```

## Решение 3: Полный откат миграции

Если нужно вернуться к исходному состоянию:

```bash
# 1. Откатить шаг 3
psql "$DATABASE_URL" -f sql/rollback_step3.sql

# 2. Удалить созданные в шагах 1-2 таблицы
psql "$DATABASE_URL" -c "
    DROP TABLE IF EXISTS detail_cost_categories_new CASCADE;
    DROP TABLE IF EXISTS detail_cost_categories_location_mapping CASCADE;
"

# 3. Если есть detail_cost_categories_old, вернуть её
psql "$DATABASE_URL" -c "
    ALTER TABLE detail_cost_categories_old RENAME TO detail_cost_categories;
"
```

## Рекомендация

**Рекомендуется использовать Решение 1** - откат шага 3 и повторное выполнение шага 2, так как это гарантирует правильное устранение дубликатов и заполнение маппинг-таблицы.

## После успешного выполнения

1. Проверить результаты миграции:
```sql
SELECT
    (SELECT COUNT(*) FROM detail_cost_categories) AS new_count,
    (SELECT COUNT(*) FROM detail_cost_categories_old) AS old_count,
    (SELECT COUNT(*) FROM detail_cost_categories_location_mapping) AS mapping_count;
```

2. Проверить отсутствие дубликатов:
```sql
SELECT name, COUNT(*) as count
FROM detail_cost_categories
GROUP BY name
HAVING COUNT(*) > 1;
-- Должна вернуть пустой результат
```

3. Протестировать приложение

## Дата создания
2025-10-05
