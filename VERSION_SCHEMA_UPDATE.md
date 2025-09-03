# Обновление кода для новой схемы версий

После применения миграции БД (`sql/add_version_to_chessboard_documentation_mapping.sql`) необходимо обновить код для работы с новой схемой.

## Что нужно изменить в Chessboard.tsx:

### 1. Обновить интерфейс DbRow (строка ~261):

```typescript
chessboard_documentation_mapping?: {
  version_id: string | null
  documentation_versions?: {
    id: string
    version_number: number
    documentation_id: string | null
    documentations?: {
      id: string
      code: string
      tag_id: number | null
      stage: string | null
      tag?: {
        id: number
        name: string
        tag_number: number | null
      } | null
    } | null
  } | null
} | null
```

### 2. Обновить запрос данных (строка ~905):

```typescript
${docRelation}(version_id, documentation_versions(id, version_number, documentation_id, documentations(id, code, tag_id, stage, tag:documentation_tags(id, name, tag_number))))
```

### 3. Обновить фильтрацию (строки ~917-924):

```typescript
// Фильтрация по документации через версии
if (appliedFilters.documentationId && appliedFilters.documentationId.length > 0) {
  query.in(
    'chessboard_documentation_mapping.documentation_versions.documentation_id',
    appliedFilters.documentationId,
  )
} else if (appliedFilters.tagId && appliedFilters.tagId.length > 0) {
  query.in(
    'chessboard_documentation_mapping.documentation_versions.documentations.tag_id',
    appliedFilters.tagId.map(Number),
  )
}
```

### 4. Обновить извлечение данных (строки ~1068-1069):

```typescript
const version = item.chessboard_documentation_mapping?.documentation_versions
const documentation = version?.documentations
```

### 5. Обновить логику сохранения (строки ~1906-1912):

```typescript
// Сохраняем прямую ссылку на версию документа (новая схема)
await supabase!.from('chessboard_documentation_mapping').upsert(
  {
    chessboard_id: r.key,
    version_id: selectedVersionId,
  },
  { onConflict: 'chessboard_id' },
)
```

## Порядок действий:

1. Применить миграцию БД: `sql/add_version_to_chessboard_documentation_mapping.sql`
2. Заменить код в файле `src/pages/documents/Chessboard.tsx` согласно инструкциям выше
3. Протестировать функциональность версий

После этого каждая запись в шахматке будет привязана к конкретной версии документа.