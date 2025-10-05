# Исправление SQL миграции Шаг 3 - Идемпотентность

## Проблема
При повторном выполнении `refactor_detail_cost_categories_step3_replace_tables.sql` возникала ошибка:
```
ERROR: 42P07: relation "detail_cost_categories_id_seq" already exists
```

Это означало, что миграция была частично выполнена, и попытка повторного выполнения приводила к конфликту.

## Решение
Сделал миграцию **идемпотентной** - теперь её можно безопасно выполнять повторно без ошибок.

### Изменения в шаге 3:

#### 1. Переименование sequence (строки 28-39)
**Было:**
```sql
ALTER SEQUENCE detail_cost_categories_new_id_seq RENAME TO detail_cost_categories_id_seq;
```

**Стало:**
```sql
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class WHERE relname = 'detail_cost_categories_new_id_seq' AND relkind = 'S'
    ) THEN
        ALTER SEQUENCE detail_cost_categories_new_id_seq RENAME TO detail_cost_categories_id_seq;
        RAISE NOTICE 'Sequence переименован в detail_cost_categories_id_seq';
    ELSE
        RAISE NOTICE 'Sequence уже переименован, пропускаем';
    END IF;
END $$;
```

#### 2. Добавление FK constraint на cost_category_id (строки 41-58)
**Добавлена проверка:**
```sql
IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_detail_cost_categories_cost_category'
    AND table_name = 'detail_cost_categories'
) THEN
    ALTER TABLE ... ADD CONSTRAINT ...
ELSE
    RAISE NOTICE 'FK constraint на cost_category_id уже существует, пропускаем';
END IF;
```

#### 3. Добавление FK constraint на unit_id (строки 60-81)
**Добавлена вложенная проверка:**
```sql
IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'units') THEN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_detail_cost_categories_unit'
        AND table_name = 'detail_cost_categories'
    ) THEN
        ALTER TABLE ... ADD CONSTRAINT ...
    ELSE
        RAISE NOTICE 'FK constraint на unit_id уже существует, пропускаем';
    END IF;
END IF;
```

#### 4. Добавление UNIQUE constraint (строки 83-98)
**Добавлена проверка:**
```sql
IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'unique_detail_cost_category_name'
    AND table_name = 'detail_cost_categories'
) THEN
    ALTER TABLE ... ADD CONSTRAINT ... UNIQUE ...
ELSE
    RAISE NOTICE 'UNIQUE constraint на name уже существует, пропускаем';
END IF;
```

#### 5. FK constraints для маппинг-таблицы (строки 100-135)
**Добавлены проверки для обоих constraints:**
- `fk_dcc_loc_mapping_detail_cost_category`
- `fk_dcc_loc_mapping_location`

#### 6. Создание индекса (строки 137-153)
**Добавлена проверка:**
```sql
IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_detail_cost_categories_cost_category'
) THEN
    CREATE INDEX ...
ELSE
    RAISE NOTICE 'Индекс ... уже существует, пропускаем';
END IF;
```

## Результат
✅ Миграцию теперь можно безопасно запускать повторно
✅ При повторном выполнении будут выведены сообщения о пропуске существующих объектов
✅ Нет ошибок при попытке создать уже существующие constraints или индексы

## Применение исправлений
Просто запустите шаг 3 снова:
```bash
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_step3_replace_tables.sql
```

Скрипт автоматически:
- Пропустит уже переименованный sequence
- Пропустит уже добавленные constraints
- Пропустит уже созданные индексы
- Выполнит только те операции, которые ещё не были выполнены

## Дата исправления
2025-10-05
