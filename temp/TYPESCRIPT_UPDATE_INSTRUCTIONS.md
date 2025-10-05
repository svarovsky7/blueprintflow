# Инструкции по обновлению TypeScript кода для тройной связи

## ⚠️ ВАЖНО: Размер файла CostCategories.tsx

Файл `src/pages/references/CostCategories.tsx` содержит **1125 строк**, что превышает максимум (600 строк по правилам проекта).

**Рекомендация:** Разбить файл на компоненты перед внесением изменений:
- `CostCategories.tsx` - главный компонент
- `components/CategoryTable.tsx` - таблица категорий
- `components/DetailCategoryForm.tsx` - форма добавления/редактирования
- `hooks/useCostCategories.tsx` - хук для работы с данными
- `types/cost-categories.ts` - типы данных

---

## Изменения в типах данных

### 1. Обновить `DetailCategory` интерфейс

**Было:**
```typescript
interface DetailCategory {
  id: number
  name: string
  description: string | null
  unitId: string | null
  unitName: string | null
  costCategoryId: number  // ← УДАЛИТЬ!
  locations: Array<{      // ← ИЗМЕНИТЬ!
    id: number
    name: string
  }>
}
```

**Должно стать:**
```typescript
interface DetailCategory {
  id: number
  name: string                // Глобально уникальное имя
  description: string | null
  unitId: string | null
  unitName: string | null
  // БЕЗ costCategoryId - оно теперь в маппинге!
  mappings: Array<{           // ← НОВОЕ поле для тройных связей
    costCategoryId: number
    costCategoryName: string
    locationId: number
    locationName: string
  }>
}
```

### 2. Обновить `DetailCategoryRowDB` интерфейс

**Было:**
```typescript
interface DetailCategoryRowDB {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  cost_category_id: number  // ← УДАЛИТЬ!
  units: { name: string } | null
  detail_cost_categories_location_mapping: Array<{  // ← ИЗМЕНИТЬ!
    location: {
      id: number
      name: string
    }
  }>
}
```

**Должно стать:**
```typescript
interface DetailCategoryRowDB {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  // БЕЗ cost_category_id!
  units: { name: string } | null
  detail_cost_categories_mapping: Array<{  // ← НОВОЕ название таблицы
    cost_category_id: number
    location_id: number
    cost_categories: {
      id: number
      name: string
    }
    location: {
      id: number
      name: string
    }
  }>
}
```

### 3. Обновить `TableRow` интерфейс

**Было:**
```typescript
interface TableRow {
  key: string
  number: number | null
  categoryId: number | null
  categoryName: string | null
  categoryUnit: string | null
  detailId: number | null
  detailName: string | null
  detailUnit: string | null
  locations: string[] | null
  locationIds: number[] | null
}
```

**Должно стать** (альтернативный подход - одна строка на тройную связь):
```typescript
interface TableRow {
  key: string
  detailId: number | null
  detailName: string | null
  detailUnit: string | null
  categoryId: number | null
  categoryName: string | null
  locationId: number | null
  locationName: string | null
}
```

---

## Изменения в API запросах

### Запрос для получения detail categories

**Было:**
```typescript
const { data, error } = await supabase
  .from('detail_cost_categories')
  .select(`
    id,
    name,
    description,
    unit_id,
    cost_category_id,  // ← УДАЛИТЬ!
    units(name),
    detail_cost_categories_location_mapping(  // ← ИЗМЕНИТЬ!
      location(id, name)
    )
  `)
```

**Должно стать:**
```typescript
const { data, error } = await supabase
  .from('detail_cost_categories')
  .select(`
    id,
    name,
    description,
    unit_id,
    units(name),
    detail_cost_categories_mapping(       // ← НОВОЕ название таблицы!
      cost_category_id,
      location_id,
      cost_categories(id, name),
      location(id, name)
    )
  `)
```

### Трансформация данных

**Было:**
```typescript
return (data ?? []).map((d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  unitId: d.unit_id,
  unitName: d.units?.name ?? null,
  costCategoryId: d.cost_category_id,  // ← УДАЛИТЬ!
  locations: (d.detail_cost_categories_location_mapping ?? []).map((m) => ({
    id: m.location.id,
    name: m.location.name,
  })),
}))
```

**Должно стать:**
```typescript
return (data ?? []).map((d) => ({
  id: d.id,
  name: d.name,
  description: d.description,
  unitId: d.unit_id,
  unitName: d.units?.name ?? null,
  mappings: (d.detail_cost_categories_mapping ?? []).map((m) => ({
    costCategoryId: m.cost_category_id,
    costCategoryName: m.cost_categories?.name ?? '',
    locationId: m.location_id,
    locationName: m.location?.name ?? '',
  })),
}))
```

---

## Изменения в логике добавления/редактирования

### Создание нового вида затрат

**Было:**
```typescript
const { data, error } = await supabase
  .from('detail_cost_categories')
  .insert({
    name: values.name,
    description: values.description,
    unit_id: values.unitId,
    cost_category_id: values.costCategoryId,  // ← УДАЛИТЬ!
    location_id: values.locationId,           // ← УДАЛИТЬ!
  })
```

**Должно стать (ШАГ 1 - создать вид затрат):**
```typescript
// Шаг 1: Создать или найти вид затрат
const { data: detailCategory, error: detailError } = await supabase
  .from('detail_cost_categories')
  .insert({
    name: values.name,
    description: values.description,
    unit_id: values.unitId,
    // БЕЗ cost_category_id и location_id!
  })
  .select()
  .single()

if (detailError) throw detailError
```

**ШАГ 2 - создать тройную связь:**
```typescript
// Шаг 2: Создать тройную связь в маппинге
const { error: mappingError } = await supabase
  .from('detail_cost_categories_mapping')
  .insert({
    cost_category_id: values.costCategoryId,
    detail_cost_category_id: detailCategory.id,
    location_id: values.locationId,
  })

if (mappingError) throw mappingError
```

### Обновление вида затрат

**Было:**
```typescript
const { error } = await supabase
  .from('detail_cost_categories')
  .update({
    name: values.name,
    description: values.description,
    unit_id: values.unitId,
    cost_category_id: values.costCategoryId,  // ← УДАЛИТЬ!
    location_id: values.locationId,           // ← УДАЛИТЬ!
  })
  .eq('id', detailId)
```

**Должно стать:**
```typescript
// Обновить только базовые поля
const { error } = await supabase
  .from('detail_cost_categories')
  .update({
    name: values.name,
    description: values.description,
    unit_id: values.unitId,
    // БЕЗ cost_category_id и location_id!
  })
  .eq('id', detailId)
```

### Добавление/удаление связей

**Добавить связь:**
```typescript
// Добавить новую тройную связь
const { error } = await supabase
  .from('detail_cost_categories_mapping')
  .insert({
    cost_category_id: categoryId,
    detail_cost_category_id: detailId,
    location_id: locationId,
  })
```

**Удалить связь:**
```typescript
// Удалить тройную связь
const { error } = await supabase
  .from('detail_cost_categories_mapping')
  .delete()
  .eq('cost_category_id', categoryId)
  .eq('detail_cost_category_id', detailId)
  .eq('location_id', locationId)
```

---

## Изменения в отображении данных

### Отображение в таблице

**Вариант 1: Одна строка на вид затрат (с массивом связей)**
```typescript
{
  detailId: 1,
  detailName: "Отделка потолков",
  mappings: [
    { categoryId: 1, categoryName: "Отделка", locationId: 1, locationName: "Квартира 1" },
    { categoryId: 1, categoryName: "Отделка", locationId: 2, locationName: "Квартира 2" },
    { categoryId: 2, categoryName: "Ремонт", locationId: 1, locationName: "Квартира 1" },
  ]
}
```

**Вариант 2: Одна строка на тройную связь (рекомендуется)**
```typescript
[
  { detailId: 1, detailName: "Отделка потолков", categoryId: 1, categoryName: "Отделка", locationId: 1, locationName: "Квартира 1" },
  { detailId: 1, detailName: "Отделка потолков", categoryId: 1, categoryName: "Отделка", locationId: 2, locationName: "Квартира 2" },
  { detailId: 1, detailName: "Отделка потолков", categoryId: 2, categoryName: "Ремонт", locationId: 1, locationName: "Квартира 1" },
]
```

### Преобразование данных для таблицы

```typescript
const tableData: TableRow[] = useMemo(() => {
  if (!detailCategories) return []

  // Создать одну строку для каждой тройной связи
  return detailCategories.flatMap((detail) =>
    detail.mappings.map((mapping) => ({
      key: `${detail.id}-${mapping.costCategoryId}-${mapping.locationId}`,
      detailId: detail.id,
      detailName: detail.name,
      detailUnit: detail.unitName,
      categoryId: mapping.costCategoryId,
      categoryName: mapping.costCategoryName,
      locationId: mapping.locationId,
      locationName: mapping.locationName,
    }))
  )
}, [detailCategories])
```

---

## Фильтрация данных

**Фильтр по категории:**
```typescript
const filteredData = tableData.filter((row) => {
  if (filters.categoryId && row.categoryId !== filters.categoryId) return false
  if (filters.detailId && row.detailId !== filters.detailId) return false
  if (filters.locationId && row.locationId !== filters.locationId) return false
  return true
})
```

---

## Импорт из Excel

**Было:**
```typescript
await supabase.from('detail_cost_categories').insert({
  name: row.name,
  cost_category_id: categoryId,
  location_id: locationId,
})
```

**Должно стать:**
```typescript
// Шаг 1: Найти или создать вид затрат
let detailCategory = await supabase
  .from('detail_cost_categories')
  .select('id')
  .eq('name', row.name)
  .single()

if (!detailCategory.data) {
  const { data } = await supabase
    .from('detail_cost_categories')
    .insert({ name: row.name, description: row.description, unit_id: row.unitId })
    .select()
    .single()
  detailCategory.data = data
}

// Шаг 2: Создать тройную связь
await supabase.from('detail_cost_categories_mapping').insert({
  cost_category_id: categoryId,
  detail_cost_category_id: detailCategory.data.id,
  location_id: locationId,
})
```

---

## Проверочный список изменений

- [ ] Обновить интерфейс `DetailCategory` (убрать `costCategoryId`, добавить `mappings`)
- [ ] Обновить интерфейс `DetailCategoryRowDB` (убрать `cost_category_id`, изменить маппинг)
- [ ] Обновить интерфейс `TableRow` (одна строка на тройную связь)
- [ ] Изменить API запрос на `detail_cost_categories_mapping`
- [ ] Обновить трансформацию данных (`mappings` вместо `locations`)
- [ ] Изменить логику создания (2 шага: создать detail + создать mapping)
- [ ] Изменить логику обновления (только базовые поля)
- [ ] Обновить преобразование данных для таблицы (`flatMap` по mappings)
- [ ] Обновить фильтрацию (по categoryId, detailId, locationId)
- [ ] Изменить Excel импорт (найти/создать detail + создать mapping)

---

## Дата создания
2025-10-05
