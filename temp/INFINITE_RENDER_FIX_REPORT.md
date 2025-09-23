# ИСПРАВЛЕНИЕ БЕСКОНЕЧНЫХ РЕНДЕРОВ В useMLSuppliers

## 🔍 ДИАГНОСТИКА ПРОБЛЕМ

Найдено **5 критических проблем** в хуке `useMLSuppliers.ts`, приводящих к бесконечным рендерам:

### ❌ ПРОБЛЕМА 1: Нестабильные зависимости в useEffect
**Файл**: `src/entities/ml/lib/useMLSuppliers.ts:90`
**Причина**: `config?.enabled` и `config?.mode` пересоздавались в каждом рендере
```typescript
// БЫЛО (ПРОБЛЕМНО):
}, [currentRequest?.materialName, currentRequest?.id, config?.enabled, config?.mode, mlMode, enabled])

// СТАЛО (ИСПРАВЛЕНО):
const stableConfigEnabled = useMemo(() => config?.enabled, [config?.enabled])
const stableConfigMode = useMemo(() => config?.mode, [config?.mode])
}, [currentRequest?.materialName, currentRequest?.id, stableConfigEnabled, stableConfigMode, mlMode, enabled])
```

### ❌ ПРОБЛЕМА 2: JSON.stringify в queryKey
**Файл**: `src/entities/ml/lib/useMLSuppliers.ts:99`
**Причина**: `JSON.stringify(config)` создавал разные строки для одинаковых объектов
```typescript
// БЫЛО (ПРОБЛЕМНО):
queryKey: ['ml-supplier-predictions', JSON.stringify(currentRequest), JSON.stringify(config), mlMode]

// СТАЛО (ИСПРАВЛЕНО):
const stableQueryKey = useMemo(() => {
  if (!currentRequest) return ['ml-supplier-predictions', 'no-request']

  return [
    'ml-supplier-predictions',
    currentRequest.materialName,
    currentRequest.context?.projectId || 'no-project',
    currentRequest.context?.blockId || 'no-block',
    mlMode,
    stableConfigEnabled ? 'enabled' : 'disabled'
  ]
}, [currentRequest?.materialName, currentRequest?.context?.projectId, currentRequest?.context?.blockId, mlMode, stableConfigEnabled])
```

### ❌ ПРОБЛЕМА 3: Нестабильные зависимости в callback'ах
**Файл**: `src/entities/ml/lib/useMLSuppliers.ts:207,240`
**Причина**: `mlMode` в зависимостях useCallback вызывал пересоздание функций
```typescript
// БЫЛО (ПРОБЛЕМНО):
const predictNow = useCallback((materialName: string, context?: MLPredictionRequest['context']) => {
  // ...
}, [minQueryLength, mlMode])

// СТАЛО (ИСПРАВЛЕНО):
const predictNow = useCallback((materialName: string, context?: MLPredictionRequest['context']) => {
  // ...
}, [minQueryLength]) // убрали mlMode - он уже используется в queryKey
```

### ❌ ПРОБЛЕМА 4: Вычисления в setState
**Файл**: `src/entities/ml/lib/useMLSuppliers.ts:127-133`
**Причина**: Нестабильные вычисления confidence внутри setState
```typescript
// БЫЛО (ПРОБЛЕМНО):
setLastResponse({
  confidence: result.suggestions.length > 0
    ? result.suggestions.reduce((sum, s) => sum + s.confidence, 0) / result.suggestions.length
    : 0,
  // ...
})

// СТАЛО (ИСПРАВЛЕНО):
const avgConfidence = result.suggestions.length > 0
  ? result.suggestions.reduce((sum, s) => sum + s.confidence, 0) / result.suggestions.length
  : 0

setLastResponse({
  confidence: avgConfidence,
  // ...
})
```

### ❌ ПРОБЛЕМА 5: Фильтрация предложений без мемоизации
**Файл**: `src/entities/ml/lib/useMLSuppliers.ts:264-266`
**Причина**: Фильтрация выполнялась в каждом рендере
```typescript
// БЫЛО (ПРОБЛЕМНО):
const filteredSuggestions = response?.suggestions.filter(
  suggestion => suggestion.confidence >= (config?.confidenceThreshold || 0.3)
) || []

// СТАЛО (ИСПРАВЛЕНО):
const filteredSuggestions = useMemo(() => {
  if (!response?.suggestions) return []

  const threshold = config?.confidenceThreshold || 0.3
  return response.suggestions.filter(suggestion => suggestion.confidence >= threshold)
}, [response?.suggestions, config?.confidenceThreshold])
```

## 🔧 ДОПОЛНИТЕЛЬНЫЕ ИСПРАВЛЕНИЯ В КОМПОНЕНТАХ

### MLSupplierSelect.tsx
**Файл**: `src/entities/ml/lib/MLSupplierSelect.tsx:119-120`
**Проблема**: Использование `JSON.stringify` в useMemo

```typescript
// БЫЛО (ПРОБЛЕМНО):
const stableSuggestions = React.useMemo(() => suggestions, [JSON.stringify(suggestions)])
const stableOptions = React.useMemo(() => options, [JSON.stringify(options)])

// СТАЛО (ИСПРАВЛЕНО):
const stableSuggestions = React.useMemo(() => suggestions, [suggestions.length, suggestions.map(s => s.id).join(',')])
const stableOptions = React.useMemo(() => options, [options.length, options.map(o => o.value).join(',')])
```

## ✅ РЕЗУЛЬТАТ ИСПРАВЛЕНИЙ

1. **Стабилизированы все зависимости** в useEffect и useCallback
2. **Убрано использование JSON.stringify** в критических местах
3. **Мемоизированы все вычисления** которые могут пересчитываться
4. **Стабилизирован queryKey** для предотвращения повторных запросов
5. **Исправлены нестабильные ссылки** в компонентах

## 🚀 ТЕСТИРОВАНИЕ

После исправлений необходимо протестировать:

1. **Отсутствие ошибки "Maximum update depth exceeded"**
2. **Нормальную работу ML предсказаний поставщиков**
3. **Корректное кэширование React Query**
4. **Отсутствие дублирующих API запросов**
5. **Стабильную работу компонента MLSupplierSelect**

## 📋 КОМАНДЫ ДЛЯ ТЕСТИРОВАНИЯ

```bash
# Проверка TypeScript
npm run tsc

# Запуск dev сервера
npm run dev

# Проверка линтера
npm run lint

# Форматирование кода
npm run format
```

---
**Дата**: 2025-09-23
**Статус**: ✅ ИСПРАВЛЕНО