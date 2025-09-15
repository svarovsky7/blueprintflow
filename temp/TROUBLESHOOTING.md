# Troubleshooting Guide

## Проблема: Пустой dropdown "Шифр проекта" при выборе раздела в Шахматке

### Описание проблемы
При добавлении или редактировании строки в Шахматке, после выбора значения в колонке "Раздел", dropdown "Шифр проекта" остается пустым.

### Корневая причина
Отсутствие или неправильное заполнение столбца `tag_id` в таблице `documentations_projects_mapping`. Этот столбец необходим для связи документов с разделами на уровне проекта.

### Решение

#### 1. Убедитесь что миграции применены
Убедитесь что выполнены следующие SQL миграции:

```sql
-- 001_add_tag_id_to_documentations_projects_mapping.sql
ALTER TABLE documentations_projects_mapping ADD COLUMN IF NOT EXISTS tag_id INTEGER;
CREATE INDEX IF NOT EXISTS idx_documentations_projects_mapping_tag_id ON documentations_projects_mapping(tag_id);
ALTER TABLE documentations_projects_mapping ADD CONSTRAINT IF NOT EXISTS fk_documentations_projects_mapping_tag_id
  FOREIGN KEY (tag_id) REFERENCES documentation_tags(id);

-- 002_populate_tag_id_in_mapping.sql
UPDATE documentations_projects_mapping dpm
SET tag_id = d.tag_id
FROM documentations d
WHERE dpm.documentation_id = d.id
  AND d.tag_id IS NOT NULL
  AND dpm.tag_id IS NULL;
```

#### 2. Проверьте данные в таблице
Выполните проверочный запрос:

```sql
SELECT
  COUNT(*) as total_mappings,
  COUNT(tag_id) as mappings_with_tag_id,
  COUNT(*) - COUNT(tag_id) as mappings_without_tag_id
FROM documentations_projects_mapping;
```

Все записи должны иметь заполненный `tag_id`.

#### 3. API использует правильный маппинг
API функция `getDocumentationList` в `src/entities/documentation/api/documentation-api.ts` использует:

```typescript
// Используем tag_id из маппинга (приоритет) или fallback из документации
const tagId = mapping.tag_id || doc.tag_id
```

#### 4. Компонент правильно фильтрует данные
В `src/pages/documents/Chessboard.tsx` фильтрация происходит по `tag_id`:

```typescript
const filteredDocs = documentations.filter((doc) => {
  const docTagId = doc.tag_id
  const selectedTagId = Number(record.tagId)
  const actualTagId = docTagId || (doc.tag ? doc.tag.id : null)
  return actualTagId === selectedTagId
})
```

### Отладка

Для проверки работы системы:

1. Откройте консоль браузера (F12)
2. Нажмите кнопку "Обновить" в Шахматке
3. Проверьте логи:
   - `🔧 API DEBUG - mappingData sample:` - должны показать `mapping_tag_id` для всех записей
   - `🔧 API DEBUG - Final result for doc:` - должны показать корректные `finalTagId`
   - При выборе раздела: `filteredDocsCount` должен быть > 0

### Проверка корректности
Логи должны показывать:
- `mappingTagId: 3, docTagId: 3, finalTagId: 3` для всех документов
- `filteredDocsCount: N` где N > 0 при выборе раздела
- Отсутствие сообщений `⚠️ API DEBUG - Document with null tag_id:`

### Дополнительная проблема: Кэширование TanStack Query

После исправления API и миграций БД dropdown по-прежнему был пустой из-за кэширования старых данных в TanStack Query.

#### Решение проблемы кэширования

1. **Создан state для принудительного обновления**:
```typescript
const [documentationRefreshKey, setDocumentationRefreshKey] = useState(0)
```

2. **Обновлены ключи запросов TanStack Query**:
```typescript
queryKey: ['documentations-v2', appliedFilters?.projectId, documentationRefreshKey]
```

3. **Автоматическое обновление при смене проекта**:
```typescript
useEffect(() => {
  if (appliedFilters?.projectId) {
    setDocumentationRefreshKey(prev => prev + 1)
  }
}, [appliedFilters?.projectId])
```

4. **Отключено кэширование**:
```typescript
staleTime: 0,
cacheTime: 0,
```

#### Принцип работы
- При смене проекта инкрементируется `documentationRefreshKey`
- Изменение ключа заставляет TanStack Query создать новый запрос
- Старые закэшированные данные игнорируются
- Всегда загружаются актуальные данные с правильной структурой

### Дата решения
13 сентября 2025

### Статус
✅ Полностью решено и протестировано

### Финальная проверка
- ✅ API возвращает данные с правильной структурой `{project_code, tag_id}`
- ✅ Столбец `tag_id` заполнен в таблице `documentations_projects_mapping`
- ✅ Кэш TanStack Query обновляется автоматически при смене проекта
- ✅ Dropdown "Шифр проекта" работает сразу после выбора раздела