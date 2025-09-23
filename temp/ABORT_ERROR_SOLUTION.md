# Исправление проблемы AbortError в Deepseek запросах

## Анализ проблемы

### Источник проблемы
Обнаружен **двойной AbortSignal** в архитектуре ML запросов:

1. **React Query передает свой AbortSignal** в `queryFn: async ({ signal })`
2. **Deepseek API создает независимый AbortSignal.timeout(30000)**

Когда React Query отменяет запрос (смена зависимостей, размонтирование компонента, навигация), его signal НЕ передается в fetch запрос к Deepseek API.

### Последовательность событий
1. Focus triggered prediction → срабатывает triggerPrediction('Focus')
2. Click prediction ignored → защита от дублирования работает
3. Умный поиск находит 60 поставщиков → buildUserPrompt выполняется
4. Отправляется запрос к Deepseek API → fetch с независимым AbortSignal.timeout()
5. **AbortError во время fetch** → React Query отменил запрос, но Deepseek API не знает об этом

## Детальное решение

### 1. Исправления в deepseek-api.ts

#### Добавлен параметр externalSignal
```typescript
async analyzeMaterial(request: DeepseekMaterialRequest, externalSignal?: AbortSignal)
async testConnection(apiKey: string, baseUrl?: string, externalSignal?: AbortSignal)
```

#### Создана функция createCombinedSignal()
```typescript
createCombinedSignal(externalSignal?: AbortSignal, timeoutMs?: number): AbortSignal {
  // Объединяет React Query signal с timeout signal
  // Если любой из них отменяется - отменяется весь запрос
}
```

#### Улучшена диагностика AbortError
```typescript
console.log('🔍 DEEPSEEK AbortError ДЕТАЛИ:', {
  errorName: error.name,
  errorMessage: error.message,
  externalSignalAborted: externalSignal?.aborted || false,
  combinedSignalAborted: combinedSignal.aborted,
  reason: externalSignal?.aborted ? 'React Query cancellation' : 'Timeout (30s)'
})
```

### 2. Исправления в ml-api.ts

#### Передача signal в Deepseek API
```typescript
export const predictNomenclature = async (
  request: MLPredictionRequest,
  signal?: AbortSignal // НОВЫЙ параметр
)

const aiResult = await predictWithDeepseek(request, signal) // Передаем signal
const deepseekResponse = await deepseekApi.analyzeMaterial(deepseekRequest, externalSignal)
```

#### Детальная диагностика AbortSignal
```typescript
console.log('🔍 ML Suppliers DEBUG: AbortSignal status:', {
  hasSignal: !!signal,
  aborted: signal?.aborted || false,
  materialName: request.materialName
})
```

### 3. Исправления в useMLSuppliers.ts

#### Передача React Query signal в ML API
```typescript
const result = await predictSuppliers(currentRequest, signal) // ИСПРАВЛЕНИЕ
```

#### Детальная диагностика React Query
```typescript
// Отслеживание изменений ключа запроса
React.useEffect(() => {
  const queryKey = ['ml-supplier-predictions', currentRequest, config, mlMode]
  console.log('🔍 useMLSuppliers Query Key Changed:', {
    queryKey: JSON.stringify(queryKey),
    enabled: enabled && config?.enabled && !!currentRequest,
    currentRequestMaterial: currentRequest?.materialName || 'none',
    mlMode
  })
}, [currentRequest, config, mlMode, enabled])

// Отслеживание состояния React Query
React.useEffect(() => {
  console.log('🔍 useMLSuppliers React Query State:', {
    isLoading,
    hasError: !!error,
    hasData: !!response,
    errorType: error?.name,
    suggestionsCount: response?.suggestions?.length || 0
  })
}, [isLoading, error, response])
```

#### Улучшенная обработка AbortError
```typescript
if (error instanceof Error && error.name === 'AbortError') {
  console.log('🔍 ML Suppliers AbortError ДЕТАЛИ:', {
    errorName: error.name,
    errorMessage: error.message,
    signalAborted: signal?.aborted || false,
    signalReason: signal?.reason,
    source: 'useMLSuppliers.queryFn'
  })
  throw error
}
```

### 4. Добавлена диагностика в MLSupplierSelect.tsx

#### Отслеживание состояния компонента
```typescript
React.useEffect(() => {
  console.log('🔍 MLSupplierSelect Component State:', {
    materialName,
    hasOptions: options.length,
    hasContext: !!context,
    disabled,
    isOpen,
    isLoading,
    suggestionsCount: suggestions.length
  })
}, [materialName, options.length, context, disabled, isOpen, isLoading, suggestions.length])
```

## Результат исправлений

### До исправления:
- React Query signal НЕ передавался в Deepseek API
- AbortError происходил без детальной диагностики
- Невозможно было отследить источник отмены запроса

### После исправления:
- ✅ React Query signal корректно передается в Deepseek API
- ✅ Детальная диагностика всех AbortError с указанием источника
- ✅ Возможность отследить весь путь signal от React Query до fetch
- ✅ Правильная обработка как timeout, так и React Query cancellation

## Логи для диагностики

Теперь в консоли будут видны детальные логи:

```
🔍 MLSupplierSelect Component State: {...}
🔍 useMLSuppliers Query Key Changed: {...}
🔍 ML Suppliers React Query signal: {...}
🔍 ML Suppliers DEBUG: AbortSignal status: {...}
🔍 DEEPSEEK AbortSignal DEBUG: {...}
🔍 DEEPSEEK AbortError ДЕТАЛИ: {...}
```

## Типы AbortError и их диагностика

1. **React Query cancellation** - `reason: 'React Query cancellation'`
2. **Timeout (30s)** - `reason: 'Timeout (30s)'`
3. **Component unmounting** - signal.aborted = true
4. **Navigation changes** - signal.aborted = true
5. **Query key changes** - новый запрос отменяет предыдущий

Все эти случаи теперь корректно диагностируются и обрабатываются.