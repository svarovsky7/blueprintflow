# Анализ и исправление проблемы Infinite Renders в Chessboard

## Выявленные проблемы

### 1. useChessboardData.ts
- **Бесконечное логирование**: В transformedData useMemo было активное логирование, которое срабатывало постоянно
- **Дублирование поля floors**: В объекте результата поле `floors` определялось дважды (строки 474 и 494)
- **Нестабильные зависимости**: useMemo зависел от `rawData?.length` и других динамических значений вместо полных объектов

### 2. ChessboardTable.tsx
- **Нестабильные данные cascade hook**: `nomenclatureData` и `suppliersData` пересоздавались каждый рендер через map()
- **Избыточные invalidateQueries**: Широкие predicate функции invalidateQueries срабатывали слишком часто
- **Множественные вызовы**: Два места с одинаковой логикой инвалидации кэша

### 3. useMLNomenclatureSuppliers.ts
- **Полностью отключен**: TanStack Query отключен для предотвращения renders (хорошее временное решение)

## Примененные исправления

### useChessboardData.ts
1. **Удалено логирование** из transformedData и statistics useMemo
2. **Исправлено дублирование поля** `floors` в объекте результата
3. **Изменены зависимости useMemo**: Используем полные объекты `rawData`, `documentationData`, `floorsData`, `ratesData` вместо их длин для правильного отслеживания изменений
4. **Стабилизированы зависимости**: statistics useMemo теперь зависит от полного `transformedData`

### ChessboardTable.tsx
1. **Стабилизированы cascade данные**: Обернули `nomenclatureData` и `suppliersData` в useMemo с правильными зависимостями
2. **Оптимизированы invalidateQueries**: Заменили широкие predicate функции на точечные вызовы:
   ```typescript
   // Было:
   queryClient.invalidateQueries({
     predicate: (query) => queryKey[0].startsWith('chessboard-')
   })

   // Стало:
   await Promise.all([
     queryClient.invalidateQueries({ queryKey: ['chessboard-data'] }),
     queryClient.invalidateQueries({ queryKey: ['nomenclature-supplier-cascade'] })
   ])
   ```

## Ожидаемые результаты

1. **Устранение infinite renders**: Стабилизированные зависимости в useMemo предотвратят бесконечные пересчеты
2. **Корректное отображение данных**: Правильные зависимости в useMemo позволят TanStack Query корректно отслеживать изменения в данных
3. **Улучшенная производительность**: Оптимизированные invalidateQueries будут срабатывать реже и точнее
4. **Стабильная работа каскадов**: useMemo для cascade данных предотвратит их пересоздание на каждом рендере

## Критические изменения

**ВАЖНО**: Изменена логика зависимостей useMemo с использования длин массивов на полные объекты. Это необходимо для правильного отслеживания изменений в данных после сохранения номенклатуры-поставщика.

**До**: `[rawData?.length, documentationData?.length, ...]` - не отслеживало изменения содержимого
**После**: `[rawData, documentationData, ...]` - отслеживает все изменения в данных

Это ключевое исправление для решения проблемы отображения данных после сохранения.