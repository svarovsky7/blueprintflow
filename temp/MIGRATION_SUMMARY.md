# Резюме миграции: Тройная связь для detail_cost_categories

## Обзор проблемы

**Исходная структура (НЕПРАВИЛЬНО):**
```
detail_cost_categories:
- id, name, cost_category_id, location_id, ...
- 218 записей
- 172 уникальных имени
- 46 дубликатов по name (одно имя используется в разных категориях)
```

**Проблема:**
- Невозможно создать UNIQUE constraint на `name` из-за дубликатов
- Одно имя ("Отделка потолков") используется в **разных** категориях затрат

**Требование:**
- `name` должен быть глобально уникален
- Одно имя может использоваться в **разных** категориях через маппинг
- Связь: Категория затрат ↔ Вид затрат ↔ Локализация

---

## Решение: Тройная связь через маппинг

**Новая структура (ПРАВИЛЬНО):**

### Таблица `detail_cost_categories`:
```sql
id              SERIAL PRIMARY KEY
name            TEXT NOT NULL UNIQUE  ← ГЛОБАЛЬНО уникальное!
description     TEXT
unit_id         UUID
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

**БЕЗ** `cost_category_id` и `location_id`!

### Таблица `detail_cost_categories_mapping` (ТРОЙНАЯ СВЯЗЬ):
```sql
cost_category_id        BIGINT NOT NULL  ← FK → cost_categories
detail_cost_category_id INTEGER NOT NULL ← FK → detail_cost_categories
location_id             BIGINT NOT NULL  ← FK → location

PRIMARY KEY (cost_category_id, detail_cost_category_id, location_id)
```

---

## Пример данных

### Старая структура (218 записей):
```
id | name              | cost_category_id | location_id
1  | Отделка потолков  | 1 (Отделка)      | 1 (Квартира 1)
2  | Отделка потолков  | 1 (Отделка)      | 2 (Квартира 2)
3  | Отделка потолков  | 2 (Ремонт)       | 1 (Квартира 1)
4  | Отделка потолков  | 2 (Ремонт)       | 3 (Офис 1)
```
❌ 4 записи с дубликатами по name!

### Новая структура:

**detail_cost_categories (172 записи):**
```
id | name              | description      | unit_id
1  | Отделка потолков  | Финишная отделка | uuid-1
```
✅ ОДНА запись с уникальным name!

**detail_cost_categories_mapping (218 связей):**
```
cost_category_id | detail_cost_category_id | location_id | Описание
1 (Отделка)      | 1 (Отделка потолков)    | 1 (Кв. 1)  | Отделка → Отделка потолков → Квартира 1
1 (Отделка)      | 1 (Отделка потолков)    | 2 (Кв. 2)  | Отделка → Отделка потолков → Квартира 2
2 (Ремонт)       | 1 (Отделка потолков)    | 1 (Кв. 1)  | Ремонт → Отделка потолков → Квартира 1
2 (Ремонт)       | 1 (Отделка потолков)    | 3 (Офис 1) | Ремонт → Отделка потолков → Офис 1
```
✅ 218 тройных связей!

---

## Созданные файлы

### SQL миграции:
1. **`sql/refactor_detail_cost_categories_CORRECT_step1_create_structure.sql`**
   - Создание структуры БД с тройной связью
   - Удаление неправильных таблиц
   - Создание индексов

2. **`sql/refactor_detail_cost_categories_CORRECT_step2_migrate_data.sql`**
   - Миграция уникальных имён (172 записи)
   - Заполнение маппинга тройными связями (218 связей)
   - Проверка целостности данных

3. **`sql/refactor_detail_cost_categories_CORRECT_step3_replace_tables.sql`**
   - Активация новой структуры
   - Переименование таблиц
   - Обновление constraints и индексов

4. **`sql/rollback_CORRECT_migration.sql`**
   - Откат миграции при ошибках

### Документация:
5. **`temp/MIGRATION_INSTRUCTIONS_TRIPLE_MAPPING.md`**
   - Пошаговая инструкция по выполнению миграции
   - Команды для проверки результатов

6. **`temp/TYPESCRIPT_UPDATE_INSTRUCTIONS.md`**
   - Детальные инструкции по обновлению TypeScript кода
   - Изменения в типах, API запросах, логике

7. **`temp/MIGRATION_SUMMARY.md`** (этот файл)
   - Общее резюме миграции

---

## Порядок выполнения

### 1. База данных (SQL миграция):

```bash
# Шаг 1: Создать структуру
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_CORRECT_step1_create_structure.sql

# Шаг 2: Мигрировать данные
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_CORRECT_step2_migrate_data.sql

# Шаг 3: Активировать новую структуру
psql "$DATABASE_URL" -f sql/refactor_detail_cost_categories_CORRECT_step3_replace_tables.sql
```

**Ожидаемый результат:**
- ✅ `detail_cost_categories`: 172 записи (уникальные имена)
- ✅ `detail_cost_categories_mapping`: 218 тройных связей
- ✅ `detail_cost_categories_old`: сохранена для отката

### 2. TypeScript код:

**ВАЖНО:** Файл `CostCategories.tsx` содержит **1125 строк**, что превышает максимум (600 строк).

**Рекомендуется разбить на компоненты:**
- `CostCategories.tsx` - главный компонент
- `components/CategoryTable.tsx` - таблица
- `components/DetailCategoryForm.tsx` - форма
- `hooks/useCostCategories.tsx` - хук для данных
- `types/cost-categories.ts` - типы

**Изменения:**
1. Обновить типы (`DetailCategory`, `DetailCategoryRowDB`, `TableRow`)
2. Изменить API запросы (использовать `detail_cost_categories_mapping`)
3. Обновить логику добавления/редактирования (2 шага: создать detail + создать mapping)
4. Изменить отображение данных (flatMap по mappings)
5. Обновить Excel импорт

См. детали в `temp/TYPESCRIPT_UPDATE_INSTRUCTIONS.md`

### 3. Тестирование:

- [ ] Проверить уникальность имён в БД
- [ ] Проверить количество связей в маппинге
- [ ] Протестировать UI (добавление, редактирование, удаление)
- [ ] Протестировать фильтрацию
- [ ] Протестировать Excel импорт

---

## Откат миграции

Если возникли проблемы:

```bash
psql "$DATABASE_URL" -f sql/rollback_CORRECT_migration.sql
```

---

## Преимущества новой структуры

✅ **Глобально уникальные имена** - constraint `UNIQUE (name)` работает
✅ **Гибкость** - один вид затрат в разных категориях
✅ **Нормализация** - 3NF, нет дубликатов
✅ **Масштабируемость** - легко добавлять новые связи
✅ **Целостность** - FK constraints защищают данные

---

## Следующие шаги

1. ✅ Выполнить SQL миграцию (шаги 1-3)
2. ⏳ Разбить `CostCategories.tsx` на компоненты (опционально, но рекомендуется)
3. ⏳ Обновить TypeScript код по инструкциям
4. ⏳ Протестировать функционал
5. ⏳ Удалить старую таблицу `detail_cost_categories_old` после успешного тестирования

---

## Контакты для вопросов

При возникновении вопросов или проблем обращайтесь к:
- `temp/MIGRATION_INSTRUCTIONS_TRIPLE_MAPPING.md` - инструкции по SQL
- `temp/TYPESCRIPT_UPDATE_INSTRUCTIONS.md` - инструкции по TypeScript

---

## Дата создания
2025-10-05
