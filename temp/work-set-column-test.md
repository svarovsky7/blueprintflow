# Тест добавления столбца "Рабочий набор"

## Выполненные изменения

### 1. Добавлен столбец WORK_SET в константы (✅ Уже было)
- В `constants.ts` уже присутствует `WORK_SET: 'workSet'`
- В `DEFAULT_COLUMN_ORDER` уже добавлен в правильном порядке

### 2. Добавлен в MULTILINE_COLUMNS (✅ Выполнено)
```typescript
const MULTILINE_COLUMNS = new Set([
  COLUMN_KEYS.ACTIONS,
  COLUMN_KEYS.DOCUMENTATION_SECTION,
  COLUMN_KEYS.DOCUMENTATION_CODE,
  COLUMN_KEYS.DOCUMENTATION_PROJECT_NAME,
  COLUMN_KEYS.DOCUMENTATION_VERSION,
  COLUMN_KEYS.BLOCK,
  COLUMN_KEYS.FLOORS,
  COLUMN_KEYS.COST_CATEGORY,
  COLUMN_KEYS.COST_TYPE,
  COLUMN_KEYS.WORK_SET, // ← Добавлено
  COLUMN_KEYS.WORK_NAME,
  // ...
])
```

### 3. Создан компонент WorkSetSelect (✅ Выполнено)
```typescript
interface WorkSetSelectProps {
  value: string
  costTypeId: string | undefined
  onChange: (value: string) => void
}

const WorkSetSelect: React.FC<WorkSetSelectProps> = ({ value, costTypeId, onChange }) => {
  const stableQueryKey = useMemo(() => {
    const key = ['work-sets-by-category']
    if (costTypeId) key.push(costTypeId)
    return key
  }, [costTypeId])

  const { data: workSetOptions = [] } = useQuery({
    queryKey: stableQueryKey,
    queryFn: () => ratesApi.getWorkSetsByCategory(costTypeId),
    enabled: !!costTypeId,
  })

  return (
    <Select
      value={value || undefined}
      placeholder="Выберите рабочий набор"
      onChange={onChange}
      allowClear={true}
      showSearch={true}
      size="small"
      style={STABLE_STYLES.fullWidth}
      dropdownStyle={getDynamicDropdownStyle(workSetOptions)}
      filterOption={(input, option) => {
        const text = option?.label?.toString() || ""
        return text.toLowerCase().includes(input.toLowerCase())
      }}
      options={workSetOptions}
      disabled={!costTypeId}
      notFoundContent={costTypeId ? 'Рабочие наборы не найдены' : 'Выберите вид затрат'}
    />
  )
}
```

### 4. Добавлен столбец в массив columns (✅ Выполнено)
```typescript
// Рабочий набор
{
  title: 'Рабочий\nнабор',
  key: COLUMN_KEYS.WORK_SET,
  dataIndex: 'workSet',
  width: 'auto',
  minWidth: 120,
  maxWidth: 180,
  filterMode: 'tree' as const,
  filterSearch: true,
  onFilter: (value, record) => record.workSet?.includes(value as string),
  onHeaderCell: () => ({
    className: 'chessboard-header-cell',
    style: {
      whiteSpace: 'pre-line',
      textAlign: 'center',
      verticalAlign: 'middle',
      lineHeight: '20px',
      padding: '4px 8px',
    },
  }),
  render: (value, record) => {
    const isEditing = (record as any).isEditing
    if (isEditing) {
      const costTypeId = (record as RowData).costTypeId

      return (
        <WorkSetSelect
          value={value || ''}
          costTypeId={costTypeId}
          onChange={(newValue) => {
            onRowUpdate(record.id, { workSet: newValue })
          }}
        />
      )
    }
    return <span>{value || ''}</span>
  },
},
```

### 5. Добавлена каскадная логика (✅ Выполнено)
При изменении вида затрат (costType) теперь очищается рабочий набор:
```typescript
onChange={(newValue) => {
  const selectedCostType = allCostTypesData.find(type => type.value === newValue)
  onRowUpdate(record.id, {
    costType: selectedCostType ? selectedCostType.label : '',
    costTypeId: newValue,
    workSet: '' // ← Очищаем рабочий набор при изменении вида затрат
  })
}}
```

### 6. Проверены типы (✅ Уже было)
В `types/index.ts` уже присутствуют поля:
```typescript
export interface RowData {
  // ...
  workSet: string // Рабочий набор
  workSetId: string // ID рабочего набора (rates.id)
  // ...
}
```

### 7. API метод уже существует (✅ Проверено)
В `rates-api.ts` уже реализован метод:
```typescript
async getWorkSetsByCategory(costTypeId?: string): Promise<{ value: string; label: string }[]>
```

## Результат
✅ Столбец "Рабочий набор" успешно добавлен в компонент Chessboard со всей необходимой функциональностью:

- Расположен между столбцами "Вид затрат" и "Наименование работ"
- Заголовок с переносом строки "Рабочий\nнабор"
- Ширина 120-180px (используется из COLUMN_WIDTH_CONFIG_BASE)
- Режим просмотра: отображает текстовое значение
- Режим редактирования: Select с выпадающим списком
- Данные получаются через API `ratesApi.getWorkSetsByCategory(record.costTypeId)`
- Поддерживает фильтрацию по столбцу
- Каскадная логика: очищается при изменении вида затрат
- Все необходимые props для Select (allowClear, showSearch, placeholder, filterOption)