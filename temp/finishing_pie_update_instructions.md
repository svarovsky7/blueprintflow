# Инструкция: Добавление столбцов в страницу "Типы пирога отделки"

## Выполненные изменения

### 1. База данных
**Файл:** `sql/add_detail_cost_category_id_to_finishing_pie_mapping.sql`
- ✅ Добавлено поле `detail_cost_category_id` (integer) в таблицу `finishing_pie_mapping`
- ✅ Создан FK на `detail_cost_categories(id)` с ON DELETE SET NULL
- ✅ Удалено поле `detail_cost_category_name` (текстовое поле)

### 2. TypeScript типы
**Файл:** `src/entities/finishing/model/types.ts`
- ✅ Обновлен тип `FinishingPieRow`:
  - Заменено `detail_cost_category_name: string | null` на `detail_cost_category_id: number | null`
  - Добавлено `detail_cost_category_name?: string` для отображения (загружается через join)
- ✅ Обновлены DTO: `CreateFinishingPieRowDto`, `UpdateFinishingPieRowDto`

### 3. API
**Файл:** `src/entities/finishing/api/finishing-pie-api.ts`
- ✅ Обновлена функция `getFinishingPieRows()` - добавлен join для `detail_cost_categories(id, name)`
- ✅ Создана новая функция `getDetailCostCategoriesByCostCategory(costCategoryId)` - получение видов затрат по категории затрат

### 4. Компонент FinishingPieType.tsx
**Добавлено:**
- ✅ Загрузка видов затрат через `getDetailCostCategoriesByCostCategory()`
- ✅ Три новых столбца после "Расход":
  1. **"Вид затрат"** - Select с вариантами из `detail_cost_categories`
  2. **"Рабочий набор"** - Select зависит от вида затрат
  3. **"Наименование работ"** - Select зависит от рабочего набора
- ✅ Каскадная логика:
  - При изменении вида затрат → сброс рабочего набора и наименования работ
  - При изменении рабочего набора → сброс наименования работ + автозаполнение единицы измерения
  - При изменении наименования работ → автозаполнение единицы измерения
- ✅ Вспомогательные компоненты `WorkSetSelect` и `WorkNameSelect` для правильного использования React hooks

## Применение изменений

### Шаг 1: Применить SQL миграцию
```bash
psql "$DATABASE_URL" -f sql/add_detail_cost_category_id_to_finishing_pie_mapping.sql
```

### Шаг 2: Запустить dev-сервер
```bash
npm run dev
# или
npm run dev:local
```

### Шаг 3: Протестировать функциональность
1. Открыть страницу "Типы пирога отделки"
2. Создать новую строку или отредактировать существующую
3. Проверить:
   - ✅ Выбор вида затрат из списка (зависит от категории затрат документа)
   - ✅ Выбор рабочего набора (появляется после выбора вида затрат)
   - ✅ Выбор наименования работ (появляется после выбора рабочего набора)
   - ✅ Автозаполнение единицы измерения при выборе работы
   - ✅ Сброс зависимых полей при изменении родительских
   - ✅ Сохранение всех данных в БД

## Используемые API

### Существующие API (из rates-api.ts)
- `ratesApi.getWorkSetsByCategory(costTypeId, costCategoryId)` - получение рабочих наборов по виду затрат
- `ratesApi.getWorksByWorkSet(workSetRateId)` - получение работ по рабочему набору

### Новые API (из finishing-pie-api.ts)
- `getDetailCostCategoriesByCostCategory(costCategoryId)` - получение видов затрат по категории затрат
- `getRateUnitId(rateId)` - получение единицы измерения по ID расценки (уже существовала)

## Структура данных

### Таблица finishing_pie_mapping
```
detail_cost_category_id: integer (FK на detail_cost_categories)
work_set_id: string (FK на rates)
rate_id: string (FK на rates)
rate_unit_id: string (FK на units)
```

### Каскадные зависимости
```
document.cost_category_id
    ↓
detail_cost_category_id (Вид затрат)
    ↓
work_set_id (Рабочий набор) → автозаполнение rate_unit_id
    ↓
rate_id (Наименование работ) → автозаполнение rate_unit_id
```

## Особенности реализации

1. **Вспомогательные компоненты:** `WorkSetSelect` и `WorkNameSelect` используются для правильной работы React hooks внутри render функций таблицы

2. **Динамическая загрузка данных:** Списки рабочих наборов и работ загружаются динамически через `useQuery` на основе выбранных значений в родительских полях

3. **Автозаполнение единицы измерения:** При выборе рабочего набора или наименования работ автоматически заполняется поле `rate_unit_id` через API `getRateUnitId()`

4. **Фильтрация видов затрат:** Виды затрат фильтруются по категории затрат документа через таблицу `detail_cost_categories_mapping`

## Rollback

Если нужно откатить изменения:

```sql
-- Удалить новое поле
ALTER TABLE finishing_pie_mapping DROP COLUMN IF EXISTS detail_cost_category_id;

-- Вернуть старое текстовое поле (опционально)
ALTER TABLE finishing_pie_mapping ADD COLUMN detail_cost_category_name text;
```
