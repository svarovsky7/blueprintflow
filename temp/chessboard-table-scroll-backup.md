# Backup: Настройки скролла и отображения таблицы Chessboard

**Дата:** 2025-09-30
**Файл:** `src/pages/documents/Chessboard/components/ChessboardTable.tsx`
**Статус:** ИСПРАВЛЕНО ✅

## ИСТОРИЯ ИЗМЕНЕНИЙ

### ❌ Старая реализация (НЕ РАБОТАЛА)

**Проблема:** Использовалась фиксированная формула `calc(100vh - ${verticalOffset}px)`, которая НЕ учитывала реальную высоту элементов выше таблицы (заголовок + фильтры).

```typescript
// СТАРАЯ ФУНКЦИЯ (УДАЛЕНА)
const getTableVerticalOffset = (scale: number): number => {
  const BASE_OFFSET = 300 // для scale=1.0
  return Math.round(BASE_OFFSET * scale)
}

// СТАРАЯ КОНФИГУРАЦИЯ (ИСПРАВЛЕНА)
const scrollConfig = useMemo(() => {
  const minWidth = getTableMinWidth(scale)
  const verticalOffset = getTableVerticalOffset(scale)
  return {
    x: minWidth,
    y: `calc(100vh - ${verticalOffset}px)`, // ❌ Фиксированный расчет
  }
}, [scale])
```

**Результаты старой формулы:**
- Scale 0.7: y = calc(100vh - 210px) → Большой зазор до пагинации
- Scale 0.8: y = calc(100vh - 240px) → Большой зазор до пагинации
- Scale 0.9: y = calc(100vh - 270px) → Большой зазор до пагинации
- Scale 1.0: y = calc(100vh - 300px) → Правильный зазор (~60px)

### ✅ Новая реализация (РАБОТАЕТ)

**Решение:** Использовать динамическую высоту через `100%`, так как контейнер таблицы имеет `flex: 1` в `index.tsx`.

```typescript
// НОВАЯ КОНФИГУРАЦИЯ
const scrollConfig = useMemo(() => {
  const minWidth = getTableMinWidth(scale)
  return {
    x: minWidth,
    y: '100%', // ✅ Динамическая высота через flex контейнер
  }
}, [scale])
```

**CSS изменения:**
```css
/* БЫЛО */
.chessboard-table .ant-table-container {
  height: calc(100vh - 300px) !important; /* ❌ Фиксированная высота */
}

/* СТАЛО */
.chessboard-table .ant-table-container {
  height: 100% !important; /* ✅ Динамическая высота */
}
```

## Текущие настройки масштабирования

### Функции расчета масштабов (без изменений)

```typescript
// Функция для расчета масштабированной ширины
const BASE_SCALE = 0.7
const getScaledWidth = (widthAt0_7: number, currentScale: number): number => {
  const baseWidth = widthAt0_7 / BASE_SCALE
  return Math.round(baseWidth * currentScale)
}

// Функция для расчета масштабированного размера шрифта
const BASE_FONT_SIZE = 14
const getScaledFontSize = (currentScale: number): number => {
  const baseFontSize = BASE_FONT_SIZE / BASE_SCALE
  return Math.round(baseFontSize * currentScale)
}
```

## Структура страницы (index.tsx)

```typescript
<div style={{ height: 'calc(100vh - 96px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
  {/* Заголовок */}
  <div style={{ flexShrink: 0, padding: '16px 24px 0 24px' }}>
    <Title level={2} style={{ margin: 0, fontSize: Math.round(24 * scale) }}>
      Шахматка
    </Title>
  </div>

  {/* Фильтры */}
  <div style={{ flexShrink: 0, padding: '16px 24px 0 24px' }}>
    <ChessboardFiltersComponent ... />
  </div>

  {/* Контейнер таблицы */}
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, padding: '0 24px 24px 24px' }}>
    <div style={{ flex: 1, overflow: 'hidden', minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>
      <ChessboardTable ... />
    </div>

    {/* Пагинация */}
    <div style={{ padding: '16px 0', textAlign: 'center', borderTop: '1px solid #f0f0f0' }}>
      <Pagination ... />
    </div>
  </div>
</div>
```

## Проблема

При масштабах 0.7, 0.8, 0.9 таблица оставляет слишком много пустого места снизу до пагинации, несмотря на масштабирование вертикального отступа.

## Цель

Таблица должна занимать максимум высоты с учетом того, чтобы блок пагинации был виден. Визуальный зазор между таблицей и пагинацией должен быть одинаковым на всех масштабах (как на scale=1.0).