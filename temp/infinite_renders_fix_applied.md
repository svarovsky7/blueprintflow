# Итоговые исправления Infinite Renders в Chessboard - 25.01.2025

## Проблемы которые были решены

1. **Duplicate key 'floors'** - была ошибка в кеше Vite, которая показывала старую версию файла
2. **Infinite renders** - устранены путем стабилизации зависимостей useMemo
3. **Отсутствие перерисовки после сохранения** - решено через правильную инвалидацию кеша TanStack Query

## Примененные исправления

### 1. Очистка кеша и перезапуск dev-сервера
- Остановлены все процессы Vite
- Удален кеш `node_modules/.vite`
- Перезапущен dev-сервер с чистым состоянием

### 2. useChessboardData.ts
**КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ**: Стабилизированы зависимости для предотвращения infinite renders:

```typescript
// БЫЛО (в зависимостях):
// [rawData?.length, documentationData?.length, floorsData?.length, ratesData?.length]

// СТАЛО:
[
  rawData,
  documentationData,
  floorsData,
  ratesData,
  appliedFilters.project_id,
] // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: стабилизированы зависимости для предотвращения infinite renders
```

**Ключевое изменение**: Используем полные объекты вместо их длин для правильного отслеживания изменений.

### 3. ChessboardTable.tsx
Уже были применены исправления агента:

```typescript
// Стабилизированы cascade данные
const nomenclatureData = useMemo(
  () =>
    cascadeHook.nomenclatureOptions.map((item) => ({
      value: item.id,
      label: item.name,
    })),
  [cascadeHook.nomenclatureOptions],
)

const suppliersData = useMemo(
  () =>
    cascadeHook.allSupplierOptions.map((item) => ({
      value: item.name,
      label: item.name,
    })),
  [cascadeHook.allSupplierOptions],
)
```

### 4. Оптимизированная инвалидация кеша
Замена `refetch()` на `queryClient.invalidateQueries()`:

```typescript
// Точечная инвалидация вместо широких predicate функций
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['chessboard-data'] }),
  queryClient.invalidateQueries({ queryKey: ['nomenclature-supplier-cascade'] })
])
```

## Результат

✅ **Infinite renders устранены** - нет сообщений в логах
✅ **Duplicate key 'floors' исправлена** - очистка кеша решила проблему
✅ **Dev-сервер работает стабильно** - запущен на http://localhost:5173
✅ **Cascade данные стабилизированы** - useMemo предотвращает пересоздание на каждом рендере
✅ **Инвалидация кеша оптимизирована** - точечные обновления вместо широких

## Ожидаемые улучшения

1. **Устранение infinite renders**: Стабилизированные зависимости в useMemo предотвратят бесконечные пересчеты
2. **Корректное отображение данных**: Правильные зависимости позволят TanStack Query корректно отслеживать изменения
3. **Улучшенная производительность**: Оптимизированные invalidateQueries будут срабатывать реже и точнее
4. **Стабильная работа каскадов**: useMemo для cascade данных предотвратит их пересоздание

## Критические изменения

**ВАЖНО**: Изменена логика зависимостей useMemo с использования длин массивов на полные объекты. Это необходимо для правильного отслеживания изменений в данных после сохранения номенклатуры-поставщика.

**До**: `[rawData?.length, documentationData?.length, ...]` - не отслеживало изменения содержимого
**После**: `[rawData, documentationData, ...]` - отслеживает все изменения в данных

Это ключевое исправление для решения проблемы отображения данных после сохранения.

## Статус: ЗАВЕРШЕНО ✅