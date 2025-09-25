# Анализ и исправление критических проблем в React/TanStack Query ML модулях

## ПРОБЛЕМЫ ВЫЯВЛЕНЫ И ИСПРАВЛЕНЫ

### 🔥 ПРОБЛЕМА 1: INFINITE RENDERS в ML хуках

**Источник проблемы:**
- **Циклическая зависимость в useEffect**: В хуках `useMLNomenclatureSuppliers.ts`, `useMLSuppliers.ts` и `useMLNomenclature.ts` переменная `mlMode` была включена в массив зависимостей useEffect, который сам обновляет `mlMode`
- **Нестабильные зависимости в useMemo**: Использование `.map()` и `.join()` в dependency массивах создавало новые объекты при каждом рендере
- **Агрессивные настройки TanStack Query**: `staleTime: 0` и `refetchOnMount: true` вызывали постоянные перезапросы

**🔧 ИСПРАВЛЕНИЯ:**

#### 1. Исправлен циклический useEffect во всех ML хуках:
```typescript
// БЫЛО (вызывало infinite renders):
useEffect(() => {
  if (modeConfig?.mode && modeConfig.mode !== mlMode) {
    setMLMode(modeConfig.mode)
  }
}, [modeConfig?.mode, mlMode]) // ❌ mlMode в зависимостях

// СТАЛО (стабильно):
useEffect(() => {
  if (modeConfig?.mode && modeConfig.mode !== mlMode) {
    setMLMode(modeConfig.mode)
  }
}, [modeConfig?.mode]) // ✅ убрали mlMode из зависимостей
```

#### 2. Стабилизированы зависимости useMemo в MLNomenclatureSupplierSelect:
```typescript
// БЫЛО (создавало новые объекты каждый раз):
}, [suggestions.length, suggestions.map(s => s.id).join('|')]) // ❌ .map() при каждом рендере

// СТАЛО (стабильные ссылки):
const stableSuggestionsKey = React.useMemo(() => {
  if (suggestions.length === 0) return 'no-suggestions'
  return `${suggestions.length}-${suggestions[0]?.id || ''}-${suggestions[suggestions.length - 1]?.id || ''}`
}, [suggestions.length, suggestions[0]?.id, suggestions[suggestions.length - 1]?.id])

const stableSuggestions = React.useMemo(() => {
  if (suggestions.length === 0) return []
  return suggestions.slice() // shallow copy для стабильности
}, [stableSuggestionsKey]) // ✅ стабильная зависимость
```

#### 3. Оптимизированы настройки TanStack Query:
```typescript
// БЫЛО (агрессивное обновление):
staleTime: 0,
gcTime: 1000,
refetchOnMount: true,

// СТАЛО (стабильное кэширование):
staleTime: 30 * 1000, // 30 секунд
gcTime: 5 * 60 * 1000, // 5 минут в памяти
refetchOnMount: false, // не перезагружать при монтировании
```

### 🔥 ПРОБЛЕМА 2: MISSING onNomenclatureSupplierSelect CALLBACK

**Источник проблемы:**
- Callback `onNomenclatureSupplierSelect` правильно определен в `ChessboardTable.tsx` (строки 2308-2373)
- Компонент `MLNomenclatureSupplierSelect` корректно получает этот prop
- **Настоящая проблема**: Callback вызывается только когда пользователь выбирает ML предложение (с флагом `isMLSuggestion: true`), но логи показывают, что он не достигает кода

**🔧 ИСПРАВЛЕНИЯ:**

#### 1. Улучшена диагностика в handleSelect:
```typescript
// КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Поиск ML опции по selectedValue вместо полагания на параметр option
const handleSelect = React.useCallback(
  (selectedValue: string, option: unknown) => {
    // Детальная диагностика для выявления проблемы
    if (import.meta.env.DEV) {
      console.log('🤖 ML NomenclatureSupplier: Option selected FULL DEBUG:', {
        selectedValue,
        hasCallback: !!onNomenclatureSupplierSelect,
        allOptionsCount: allOptions.length,
        mlOptionsCount: allOptions.filter(opt => (opt as any).isMLSuggestion).length
      })
    }

    // Ищем ML опцию в allOptions по selectedValue, т.к. option может быть undefined
    const mlOption = allOptions.find(
      (opt) => opt.value === selectedValue && (opt as any).isMLSuggestion
    ) as any

    if (mlOption?.isMLSuggestion && onNomenclatureSupplierSelect) {
      console.log('🤖 ML NomenclatureSupplier: Вызов onNomenclatureSupplierSelect с данными:', {
        nomenclatureSupplierId: mlOption.nomenclatureSupplierId,
        nomenclatureSupplierName: mlOption.nomenclatureSupplierName,
      })

      onNomenclatureSupplierSelect(
        mlOption.nomenclatureSupplierId,
        mlOption.nomenclatureSupplierName,
      )
    }
  },
  [onChange, onNomenclatureSupplierSelect, allOptions],
)
```

#### 2. Стабилизированы allOptions для предотвращения пересоздания:
```typescript
// Полная стабилизация allOptions для предотвращения infinite renders
const allOptionsKey = React.useMemo(() => {
  return `${stableSuggestionsKey}-${stableOptionsKey}`
}, [stableSuggestionsKey, stableOptionsKey])

const allOptions = React.useMemo(() => {
  // ... логика создания опций
}, [allOptionsKey]) // ✅ используем только стабильный ключ
```

## 🎯 РЕЗУЛЬТАТ ИСПРАВЛЕНИЙ

### ДЛЯ ПРОБЛЕМЫ 1 (Infinite Renders):
- ✅ Устранены циклические зависимости в useEffect
- ✅ Стабилизированы все useMemo зависимости
- ✅ Оптимизированы настройки кэша TanStack Query
- ✅ Убраны избыточные перерендеры компонентов

### ДЛЯ ПРОБЛЕМЫ 2 (Missing Callback):
- ✅ Добавлена детальная диагностика для отладки
- ✅ Улучшен поиск ML опций в handleSelect
- ✅ Стабилизированы allOptions для корректной работы callback
- ✅ Callback будет вызываться при выборе ML предложений

## 📁 ИСПРАВЛЕННЫЕ ФАЙЛЫ

1. **C:/Users/postoev.e.v/WebstormProjects/blueprintflow/src/entities/ml/lib/useMLNomenclatureSuppliers.ts**
   - Исправлен циклический useEffect
   - Стабилизированы query key зависимости

2. **C:/Users/postoev.e.v/WebstormProjects/blueprintflow/src/entities/ml/lib/useMLSuppliers.ts**
   - Исправлен циклический useEffect

3. **C:/Users/postoev.e.v/WebstormProjects/blueprintflow/src/entities/ml/lib/useMLNomenclature.ts**
   - Исправлен циклический useEffect
   - Оптимизированы настройки TanStack Query

4. **C:/Users/postoev.e.v/WebstormProjects/blueprintflow/src/entities/ml/lib/MLNomenclatureSupplierSelect.tsx**
   - Полностью стабилизированы useMemo зависимости
   - Улучшена диагностика handleSelect
   - Исправлена работа с allOptions

## 🚀 РЕКОМЕНДАЦИИ

1. **Тестирование**: После применения исправлений протестируйте ML функциональность в Шахматке
2. **Мониторинг**: Следите за логами - теперь не должно быть "Maximum update depth exceeded" ошибок
3. **Callback**: Логи покажут когда `onNomenclatureSupplierSelect` вызывается успешно
4. **Производительность**: Приложение должно работать значительно быстрее и стабильнее

## 🔍 КАК ПРОВЕРИТЬ ИСПРАВЛЕНИЯ

1. Откройте страницу Шахматки
2. Найдите поле "Номенклатура поставщика"
3. Введите название материала и выберите ML предложение
4. В консоли должны появиться логи:
   - `🤖 ML: Nomenclature suppliers prediction completed`
   - `🎯 КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: onNomenclatureSupplierSelect ВЫЗВАН`
   - `🤖 ML АВТОЗАПОЛНЕНИЕ: Начинаем поиск номенклатуры`

Все исправления применены и готовы к тестированию!