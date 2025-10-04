# Инструкции по добавлению столбца "Рабочий набор"

## Выполнено:
1. ✅ Создана SQL миграция `sql/add_work_set_to_finishing_pie_mapping.sql`
2. ✅ Обновлены TypeScript типы в `types.ts` (добавлены `work_set_id` и `work_set_name`)
3. ✅ Обновлен API `getFinishingPieRows` для загрузки данных о рабочем наборе

## Необходимо доработать в FinishingPieType.tsx:

### 1. Добавить запросы для загрузки уникальных рабочих наборов

После запроса `rates` добавить:

```typescript
// Загрузка уникальных рабочих наборов по выбранному виду затрат
const getWorkSetsForRow = (detailCostCategoryId: number | null) => {
  if (!detailCostCategoryId) return []

  // Получаем все расценки, связанные с видом затрат
  const filteredRates = rates.filter((rate) => {
    // Проверяем через mapping таблицу rates_detail_cost_categories_mapping
    // Нужно будет загрузить эту связь отдельным запросом
  })

  // Получаем уникальные work_set
  const uniqueWorkSets = [...new Set(filteredRates.map(r => r.work_set).filter(Boolean))]
  return uniqueWorkSets.map(ws => ({ id: ws, name: ws }))
}
```

### 2. Добавить столбец "Рабочий набор" перед "Наименование работы"

```typescript
{
  title: 'Рабочий набор',
  dataIndex: 'work_set_id',
  key: 'work_set_id',
  width: 200,
  render: (value: string | null, record: EditableRow) => {
    if (isRowEditing(record as FinishingPieRow)) {
      const workSets = getWorkSetsForRow(record.detail_cost_category_id)
      return (
        <Select
          value={value}
          onChange={(val) => {
            handleUpdateEditingRow(record.id!, 'work_set_id', val)
            // Очистить выбранную работу при смене набора
            handleUpdateEditingRow(record.id!, 'rate_id', null)
          }}
          options={workSets.map((ws) => ({ value: ws.id, label: ws.name }))}
          placeholder="Выберите рабочий набор"
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
          }
          style={{ width: '100%' }}
        />
      )
    }
    return record.work_set_name || '-'
  },
},
```

### 3. Обновить столбец "Наименование работы" для фильтрации по рабочему набору

В render функции столбца "Наименование работы":

```typescript
if (isRowEditing(record as FinishingPieRow)) {
  // Фильтруем расценки по рабочему набору
  const filteredRates = record.work_set_id
    ? rates.filter((r) => r.work_set === record.work_set_id)
    : rates

  return (
    <Select
      value={value}
      onChange={(val) => handleRateChange(record.id!, val)}
      options={filteredRates.map((r) => ({ value: r.id, label: r.work_name }))}
      placeholder="Выберите работу"
      allowClear
      showSearch
      // ... rest of props
    />
  )
}
```

### 4. Добавить `work_set_id` в функции создания/обновления строк

В `handleAddRow`:
```typescript
work_set_id: null,
```

В `handleCopyRow`:
```typescript
work_set_id: record.work_set_id,
```

В `handleSaveDocument` при создании строки:
```typescript
await createFinishingPieRow({
  // ... existing fields
  work_set_id: row.work_set_id || null,
})
```

При обновлении строки:
```typescript
await updateFinishingPieRow(row.id!, {
  // ... existing fields
  work_set_id: row.work_set_id || null,
})
```

### 5. Добавить `work_set_id` в интерфейс EditableRow (если еще не добавлен)

```typescript
interface EditableRow extends Partial<FinishingPieRow> {
  // ... existing fields
  work_set_id?: string | null
}
```

## Примечание
Требуется также загрузить mapping между rates и detail_cost_categories для корректной фильтрации рабочих наборов по виду затрат.
