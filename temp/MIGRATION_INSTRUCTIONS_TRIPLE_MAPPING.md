# Инструкция по миграции БД с тройной связью

## Обзор миграции

**Старая структура:**
```
detail_cost_categories:
- id, name, cost_category_id, location_id, ...
- 218 записей с дубликатами по name
```

**Новая структура:**
```
detail_cost_categories:
- id, name, description, unit_id, ...
- 172 записи (уникальные имена)
- БЕЗ cost_category_id и location_id!

detail_cost_categories_mapping:
- cost_category_id, detail_cost_category_id, location_id
- 218 тройных связей (category - detail - location)
```

---

## Шаги миграции

### Шаг 1: Создать структуру БД

```bash
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_CORRECT_step1_create_structure.sql
```

**Что делает:**
- Удаляет неправильно созданные таблицы (если есть)
- Создаёт `detail_cost_categories_new` БЕЗ `cost_category_id`
- Создаёт `detail_cost_categories_mapping` с тройной связью (cost_category_id, detail_cost_category_id, location_id)
- Добавляет индексы

**Ожидаемый результат:**
```
NOTICE: Удалена неправильная таблица detail_cost_categories_new (если была)
NOTICE: Удалена неправильная таблица detail_cost_categories_location_mapping (если была)
NOTICE: =================================================================
NOTICE: Шаг 1 завершён: Структура БД создана
NOTICE: Создана таблица: detail_cost_categories_new (БЕЗ cost_category_id)
NOTICE: Создана таблица: detail_cost_categories_mapping (тройная связь)
NOTICE: =================================================================
```

---

### Шаг 2: Мигрировать данные

```bash
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_CORRECT_step2_migrate_data.sql
```

**Что делает:**
- Заполняет `detail_cost_categories_new` уникальными именами (DISTINCT ON name)
- Заполняет `detail_cost_categories_mapping` тройными связями

**Ожидаемый результат:**
```
NOTICE: Перенесено уникальных видов затрат: 172 (было 218 записей, 172 уникальных имён)
NOTICE: Создано тройных связей в маппинге: 218 (было 218 записей с локализацией)
NOTICE: Проверка целостности пройдена: все записи перенесены успешно
NOTICE: =================================================================
NOTICE: Миграция данных завершена!
NOTICE: -----------------------------------------------------------------
NOTICE: Видов затрат в detail_cost_categories_new: 172
NOTICE: Тройных связей в маппинге: 218
NOTICE:   - Уникальных видов затрат в маппинге: 172
NOTICE:   - Уникальных категорий в маппинге: X
NOTICE:   - Уникальных локализаций в маппинге: X
NOTICE: Устранено дубликатов: 46 записей
NOTICE: =================================================================
```

---

### Шаг 3: Активировать новую структуру

```bash
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_CORRECT_step3_replace_tables.sql
```

**Что делает:**
- Переименовывает `detail_cost_categories` → `detail_cost_categories_old`
- Переименовывает `detail_cost_categories_new` → `detail_cost_categories`
- Обновляет FK constraints в маппинге
- Добавляет индексы

**Ожидаемый результат:**
```
NOTICE: Старая таблица переименована в detail_cost_categories_old
NOTICE: Новая таблица активирована как detail_cost_categories
NOTICE: Sequence переименован в detail_cost_categories_id_seq
NOTICE: Добавлен FK constraint: detail_cost_categories.unit_id -> units.id
NOTICE: Добавлен FK constraint: detail_cost_categories_mapping.detail_cost_category_id -> detail_cost_categories.id
NOTICE: =================================================================
NOTICE: Миграция завершена успешно!
NOTICE: -----------------------------------------------------------------
NOTICE: Записей в detail_cost_categories: 172 (было: 218)
NOTICE: Тройных связей в маппинге: 218
NOTICE: Старая таблица сохранена как: detail_cost_categories_old
NOTICE: ВАЖНО: Теперь необходимо обновить код приложения для работы с новой структурой!
NOTICE: =================================================================
```

---

## Проверка результатов

### 1. Проверить уникальность имён:
```sql
SELECT COUNT(*) as total, COUNT(DISTINCT name) as unique_names
FROM detail_cost_categories;
-- Должно быть: total = unique_names = 172
```

### 2. Проверить маппинг:
```sql
SELECT COUNT(*) as mapping_count,
       COUNT(DISTINCT detail_cost_category_id) as unique_details,
       COUNT(DISTINCT cost_category_id) as unique_categories,
       COUNT(DISTINCT location_id) as unique_locations
FROM detail_cost_categories_mapping;
-- Должно быть: mapping_count = 218
```

### 3. Примеры тройных связей:
```sql
SELECT
    cc.name AS category_name,
    dc.name AS detail_name,
    l.name AS location_name
FROM detail_cost_categories_mapping m
JOIN cost_categories cc ON m.cost_category_id = cc.id
JOIN detail_cost_categories dc ON m.detail_cost_category_id = dc.id
JOIN location l ON m.location_id = l.id
ORDER BY cc.name, dc.name, l.name
LIMIT 10;
```

---

## Откат миграции

Если что-то пошло не так:

```bash
psql "$DATABASE_URL" -f sql/rollback_CORRECT_migration.sql
```

Это вернёт старую структуру БД.

---

## Следующие шаги

После успешной миграции БД необходимо обновить TypeScript код:

1. ✅ Обновить типы данных в `src/pages/references/CostCategories.tsx`
2. ✅ Обновить API запросы для работы с маппингом
3. ✅ Обновить UI компонент
4. ✅ Протестировать функционал

Инструкции по обновлению кода будут в следующих файлах.

---

## Дата создания
2025-10-05
