# Изменения в src/pages/references/CostCategories.tsx

## Обзор изменений
После миграции БД необходимо обновить код компонента `CostCategories.tsx` для работы с новой структурой:
- Типы данных
- API запросы
- Логика импорта Excel
- Логика сохранения/редактирования

---

## 1. Обновление TypeScript типов

### УДАЛИТЬ интерфейс `DetailCategoryGroup`
Больше не нужен, так как данные приходят уже с массивом локализаций.

### ИЗМЕНИТЬ интерфейс `DetailCategory`
```typescript
// БЫЛО:
interface DetailCategory {
  id: number
  name: string
  description: string | null
  unitId: string | null
  unitName: string | null
  costCategoryId: number
  locationId: number          // ❌ Удалить
  locationName: string | null // ❌ Удалить
}

// СТАЛО:
interface DetailCategory {
  id: number
  name: string
  description: string | null
  unitId: string | null
  unitName: string | null
  costCategoryId: number
  locations: Array<{          // ✅ Добавить
    id: number
    name: string
  }>
}
```

### ИЗМЕНИТЬ интерфейс `DetailCategoryRowDB`
```typescript
// БЫЛО:
interface DetailCategoryRowDB {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  cost_category_id: number
  location_id: number    // ❌ Удалить
  units: { name: string } | null
  location: { name: string } | null  // ❌ Удалить
}

// СТАЛО:
interface DetailCategoryRowDB {
  id: number
  name: string
  description: string | null
  unit_id: string | null
  cost_category_id: number
  units: { name: string } | null
  detail_cost_categories_location_mapping: Array<{  // ✅ Добавить
    location: {
      id: number
      name: string
    }
  }>
}
```

---

## 2. Обновление API запроса для загрузки видов затрат

### Изменить `useQuery` для detail_cost_categories

```typescript
// БЫЛО (строки 138-163):
const {
  data: details,
  isLoading: detailsLoading,
  refetch: refetchDetails,
} = useQuery<DetailCategory[]>({
  queryKey: ['detail_cost_categories'],
  queryFn: async () => {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('detail_cost_categories')
      .select(
        'id, name, description, unit_id, cost_category_id, location_id, units(name), location(name)',
      )
      .returns<DetailCategoryRowDB[]>()
    if (error) {
      message.error('Не удалось загрузить виды')
      throw error
    }
    return (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      unitId: d.unit_id,
      unitName: d.units?.name ?? null,
      costCategoryId: d.cost_category_id,
      locationId: d.location_id,
      locationName: d.location?.name ?? null,
    }))
  },
})

// СТАЛО:
const {
  data: details,
  isLoading: detailsLoading,
  refetch: refetchDetails,
} = useQuery<DetailCategory[]>({
  queryKey: ['detail_cost_categories'],
  queryFn: async () => {
    if (!supabase) return []
    const { data, error } = await supabase
      .from('detail_cost_categories')
      .select(`
        id,
        name,
        description,
        unit_id,
        cost_category_id,
        units(name),
        detail_cost_categories_location_mapping(
          location:location(id, name)
        )
      `)
      .returns<DetailCategoryRowDB[]>()
    if (error) {
      message.error('Не удалось загрузить виды')
      throw error
    }
    return (data ?? []).map((d) => ({
      id: d.id,
      name: d.name,
      description: d.description,
      unitId: d.unit_id,
      unitName: d.units?.name ?? null,
      costCategoryId: d.cost_category_id,
      locations: (d.detail_cost_categories_location_mapping ?? []).map((m) => ({
        id: m.location.id,
        name: m.location.name,
      })),
    }))
  },
})
```

---

## 3. Упрощение логики группировки данных

### УДАЛИТЬ группировку в `useMemo` (строки 186-262)

Данные уже приходят с массивом локализаций, поэтому группировка не нужна!

```typescript
// УДАЛИТЬ ВСЁ ЭТО:
const rows = useMemo(() => {
  const result: TableRow[] = []

  // Группируем детали по категории и имени
  const detailsGrouped = new Map<string, DetailCategoryGroup>()

  ;(details ?? []).forEach((d) => {
    const groupKey = `${d.costCategoryId}-${d.name}`

    if (detailsGrouped.has(groupKey)) {
      // Добавляем локализацию к существующей группе
      const group = detailsGrouped.get(groupKey)!
      group.locations.push({
        id: d.locationId,
        name: d.locationName || ''
      })
    } else {
      // Создаем новую группу
      detailsGrouped.set(groupKey, {
        id: d.id,
        name: d.name,
        description: d.description,
        unitId: d.unitId,
        unitName: d.unitName,
        costCategoryId: d.costCategoryId,
        locations: [{
          id: d.locationId,
          name: d.locationName || ''
        }]
      })
    }
  })

  // Организуем по категориям
  const detailsByCategory = new Map<number, DetailCategoryGroup[]>()
  for (const group of detailsGrouped.values()) {
    if (!detailsByCategory.has(group.costCategoryId)) {
      detailsByCategory.set(group.costCategoryId, [])
    }
    detailsByCategory.get(group.costCategoryId)!.push(group)
  }

  // Создаем строки таблицы
  ;(categories ?? []).forEach((c) => {
    const groups = detailsByCategory.get(c.id)
    if (groups && groups.length > 0) {
      groups.forEach((group) => {
        result.push({
          key: `detail-group-${group.id}`,
          number: c.number,
          categoryId: c.id,
          categoryName: c.name,
          categoryUnit: c.unitName,
          detailId: group.id,
          detailName: group.name,
          detailUnit: group.unitName,
          locations: group.locations.map(l => l.name),
          locationIds: group.locations.map(l => l.id),
        })
      })
    } else {
      result.push({
        key: `category-${c.id}`,
        number: c.number,
        categoryId: c.id,
        categoryName: c.name,
        categoryUnit: c.unitName,
        detailId: null,
        detailName: null,
        detailUnit: null,
        locations: null,
        locationIds: null,
      })
    }
  })
  return result
}, [categories, details])

// ЗАМЕНИТЬ НА:
const rows = useMemo(() => {
  const result: TableRow[] = []
  const detailsByCategory = new Map<number, DetailCategory[]>()

  // Организуем детали по категориям
  ;(details ?? []).forEach((d) => {
    if (!detailsByCategory.has(d.costCategoryId)) {
      detailsByCategory.set(d.costCategoryId, [])
    }
    detailsByCategory.get(d.costCategoryId)!.push(d)
  })

  // Создаем строки таблицы
  ;(categories ?? []).forEach((c) => {
    const categoryDetails = detailsByCategory.get(c.id)
    if (categoryDetails && categoryDetails.length > 0) {
      categoryDetails.forEach((detail) => {
        result.push({
          key: `detail-${detail.id}`,
          number: c.number,
          categoryId: c.id,
          categoryName: c.name,
          categoryUnit: c.unitName,
          detailId: detail.id,
          detailName: detail.name,
          detailUnit: detail.unitName,
          locations: detail.locations.map((l) => l.name),
          locationIds: detail.locations.map((l) => l.id),
        })
      })
    } else {
      result.push({
        key: `category-${c.id}`,
        number: c.number,
        categoryId: c.id,
        categoryName: c.name,
        categoryUnit: c.unitName,
        detailId: null,
        detailName: null,
        detailUnit: null,
        locations: null,
        locationIds: null,
      })
    }
  })
  return result
}, [categories, details])
```

---

## 4. Обновление логики импорта Excel

### Изменить функцию `handleImport` (строки 343-476)

**Ключевые изменения:**
1. Проверять существование вида затрат по `cost_category_id` + `name` (без `location_id`)
2. Создавать только одну запись вида затрат
3. Добавлять связи с локализациями в маппинг-таблицу

```typescript
const handleImport = async (file: File) => {
  if (!supabase || !units || !locations) return false
  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json<(string | number)[]>(sheet, { header: 1 })

    let imported = 0
    const errors: string[] = []

    const categoriesMap = new Map<string, Category>()
    ;(categories ?? []).forEach((c) => categoriesMap.set(c.name, c))

    // Изменить ключ маппинга: убрать location_id
    const detailsMap = new Map<string, DetailCategory>()
    ;(details ?? []).forEach((d) =>
      detailsMap.set(`${d.costCategoryId}-${d.name}`, d),
    )

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      const number = row[0] as number | undefined
      const categoryName = (row[1] as string | undefined)?.trim()
      const categoryUnitName = (row[2] as string | undefined)?.trim()
      const detailName = (row[3] as string | undefined)?.trim()
      const detailUnitName = (row[4] as string | undefined)?.trim()
      const locationName = (row[5] as string | undefined)?.trim()

      if (!categoryName || !detailName) {
        errors.push(`Строка ${i + 1}: отсутствует категория или вид`)
        continue
      }

      const categoryUnit = units.find((u) => u.name === categoryUnitName)
      const detailUnit = units.find((u) => u.name === detailUnitName)
      const location = locations.find((l) => l.name === locationName)

      if (!categoryUnit || !detailUnit || !location) {
        errors.push(`Строка ${i + 1}: неизвестные единицы измерения или локализация`)
        continue
      }

      // Создать или найти категорию
      let category = categoriesMap.get(categoryName)
      if (!category) {
        const { data: catData, error: catError } = await supabase
          .from('cost_categories')
          .insert({
            number: number ?? null,
            name: categoryName,
            unit_id: categoryUnit.id,
          })
          .select()
          .single()
        if (catError || !catData) {
          errors.push(`Строка ${i + 1}: не удалось добавить категорию`)
          continue
        }
        category = {
          id: catData.id,
          number: catData.number,
          name: catData.name,
          description: catData.description,
          unitId: catData.unit_id,
          unitName: categoryUnit.name,
        }
        categoriesMap.set(categoryName, category)
      }

      // ✅ НОВАЯ ЛОГИКА: проверить существование вида затрат (БЕЗ location_id)
      const detailKey = `${category.id}-${detailName}`
      let existingDetail = detailsMap.get(detailKey)

      let detailId: number

      if (existingDetail) {
        // Вид затрат уже существует - используем его ID
        detailId = existingDetail.id
      } else {
        // Создать новый вид затрат (ОДИН РАЗ, БЕЗ location_id)
        const { data: detData, error: detError } = await supabase
          .from('detail_cost_categories')
          .insert({
            cost_category_id: category.id,
            name: detailName,
            unit_id: detailUnit.id,
          })
          .select()
          .single()

        if (detError || !detData) {
          errors.push(`Строка ${i + 1}: не удалось добавить вид`)
          continue
        }

        detailId = detData.id

        // Сохранить в кэш
        existingDetail = {
          id: detData.id,
          name: detData.name,
          description: detData.description,
          unitId: detData.unit_id,
          unitName: detailUnit.name,
          costCategoryId: detData.cost_category_id,
          locations: [],
        }
        detailsMap.set(detailKey, existingDetail)
      }

      // ✅ Добавить связь с локализацией в маппинг-таблицу
      const { error: mappingError } = await supabase
        .from('detail_cost_categories_location_mapping')
        .insert({
          detail_cost_category_id: detailId,
          location_id: location.id,
        })
        // Игнорировать дубликаты (если связь уже существует)
        .select()
        .maybeSingle()

      if (mappingError && !mappingError.message.includes('duplicate')) {
        errors.push(`Строка ${i + 1}: не удалось добавить связь с локализацией`)
        continue
      }

      imported++
    }

    message.success(`Импортировано строк: ${imported}`)
    if (errors.length) {
      message.warning(`Ошибок: ${errors.length}. Проверьте консоль.`)
      console.log('Ошибки импорта:', errors)
    }

    await Promise.all([refetchCategories(), refetchDetails()])
  } catch (err) {
    console.error('Ошибка импорта:', err)
    message.error('Не удалось импортировать файл')
  }
  return false
}
```

---

## 5. Обновление логики сохранения (добавление)

### Изменить функцию `handleSave` (строки 521-556)

```typescript
const handleSave = async () => {
  try {
    const values = await form.validateFields()
    if (!supabase) return

    if (addMode === 'category') {
      const { error } = await supabase.from('cost_categories').insert({
        number: values.number,
        name: values.categoryName,
        description: values.categoryDescription,
        unit_id: values.categoryUnitId,
      })
      if (error) throw error
    }

    if (addMode === 'detail') {
      // ✅ НОВАЯ ЛОГИКА: создать ОДИН вид затрат
      const { data: newDetail, error: detailError } = await supabase
        .from('detail_cost_categories')
        .insert({
          cost_category_id: values.costCategoryId,
          name: values.detailName,
          description: values.detailDescription,
          unit_id: values.detailUnitId,
        })
        .select('id')
        .single()

      if (detailError || !newDetail) throw detailError

      // ✅ Создать связи с локализациями в маппинг-таблице
      if (values.locationIds && values.locationIds.length > 0) {
        const mappingRecords = values.locationIds.map((locationId: number) => ({
          detail_cost_category_id: newDetail.id,
          location_id: locationId,
        }))

        const { error: mappingError } = await supabase
          .from('detail_cost_categories_location_mapping')
          .insert(mappingRecords)

        if (mappingError) throw mappingError
      }
    }

    message.success('Запись добавлена')
    setAddMode(null)
    form.resetFields()
    await Promise.all([refetchCategories(), refetchDetails()])
  } catch (err) {
    console.error('Ошибка сохранения:', err)
    message.error('Не удалось сохранить')
  }
}
```

---

## 6. Обновление логики редактирования

### Изменить функцию `handleUpdate` (строки 558-613)

```typescript
const handleUpdate = async () => {
  try {
    const values = await form.validateFields()
    if (!supabase || !editing) return

    if (editing.type === 'category') {
      const { error } = await supabase
        .from('cost_categories')
        .update({
          number: values.number,
          name: values.categoryName,
          description: values.categoryDescription,
          unit_id: values.categoryUnitId,
        })
        .eq('id', editing.id)
      if (error) throw error
    }

    if (editing.type === 'detail') {
      // ✅ НОВАЯ ЛОГИКА: обновить ОДИН вид затрат
      const { error: updateError } = await supabase
        .from('detail_cost_categories')
        .update({
          cost_category_id: values.costCategoryId,
          name: values.detailName,
          description: values.detailDescription,
          unit_id: values.detailUnitId,
        })
        .eq('id', editing.id)

      if (updateError) throw updateError

      // ✅ Обновить связи с локализациями:
      // 1. Удалить все старые связи
      const { error: deleteError } = await supabase
        .from('detail_cost_categories_location_mapping')
        .delete()
        .eq('detail_cost_category_id', editing.id)

      if (deleteError) throw deleteError

      // 2. Создать новые связи
      if (values.locationIds && values.locationIds.length > 0) {
        const mappingRecords = values.locationIds.map((locationId: number) => ({
          detail_cost_category_id: editing.id,
          location_id: locationId,
        }))

        const { error: insertError } = await supabase
          .from('detail_cost_categories_location_mapping')
          .insert(mappingRecords)

        if (insertError) throw insertError
      }
    }

    message.success('Запись обновлена')
    cancelEdit()
    await Promise.all([refetchCategories(), refetchDetails()])
  } catch (err) {
    console.error('Ошибка обновления:', err)
    message.error('Не удалось сохранить')
  }
}
```

---

## 7. Обновление логики удаления

### Изменить функцию `handleDelete` (строки 615-645)

```typescript
const handleDelete = async (record: TableRow) => {
  try {
    if (!supabase) return

    if (record.detailId) {
      // ✅ НОВАЯ ЛОГИКА: удалить ОДИН вид затрат
      // Маппинг-таблица удалится автоматически через ON DELETE CASCADE
      const { error } = await supabase
        .from('detail_cost_categories')
        .delete()
        .eq('id', record.detailId)

      if (error) throw error
    } else if (record.categoryId) {
      const { error } = await supabase
        .from('cost_categories')
        .delete()
        .eq('id', record.categoryId)

      if (error) throw error
    }

    message.success('Запись удалена')
    await Promise.all([refetchCategories(), refetchDetails()])
  } catch (err) {
    console.error('Ошибка удаления:', err)
    message.error('Не удалось удалить')
  }
}
```

---

## 8. Обновление функции `startEdit` (строки 483-514)

```typescript
const startEdit = (record: TableRow) => {
  if (addMode) return
  form.resetFields()

  if (record.detailId) {
    // ✅ НОВАЯ ЛОГИКА: найти вид затрат по ID (один вид!)
    const detail = details?.find((d) => d.id === record.detailId)

    if (detail) {
      form.setFieldsValue({
        costCategoryId: detail.costCategoryId,
        detailName: detail.name,
        detailDescription: detail.description,
        detailUnitId: detail.unitId,
        locationIds: detail.locations.map((l) => l.id), // Массив ID локализаций
      })
      setEditing({ type: 'detail', key: record.key, id: record.detailId })
    }
  } else if (record.categoryId) {
    const category = categories?.find((c) => c.id === record.categoryId)
    form.setFieldsValue({
      number: category?.number,
      categoryName: category?.name,
      categoryDescription: category?.description,
      categoryUnitId: category?.unitId,
    })
    setEditing({ type: 'category', key: record.key, id: record.categoryId })
  }
}
```

---

## Резюме изменений

### Удалено:
- ❌ Интерфейс `DetailCategoryGroup`
- ❌ Поля `locationId` и `locationName` из `DetailCategory`
- ❌ Сложная логика группировки в `useMemo`
- ❌ Логика удаления всей группы деталей при редактировании/удалении

### Добавлено:
- ✅ Поле `locations: Array<{id, name}>` в `DetailCategory`
- ✅ JOIN через `detail_cost_categories_location_mapping` в API запросе
- ✅ Упрощённая логика формирования строк таблицы
- ✅ Работа с маппинг-таблицей при импорте/сохранении/редактировании

### Изменено:
- 🔄 Импорт Excel: создаёт уникальные виды затрат + связи в маппинге
- 🔄 Сохранение: создаёт один вид затрат + связи с локализациями
- 🔄 Редактирование: обновляет один вид затрат + пересоздаёт связи
- 🔄 Удаление: удаляет один вид затрат (CASCADE удаляет связи автоматически)
