# CODE_PATTERNS.md

Детальные примеры кода и паттерны разработки для BlueprintFlow. Этот файл содержит аннотированные решения специфических задач, которые часто встречаются в проекте.

> **Примечание:** Этот файл является дополнением к `CLAUDE.md` и содержит подробные примеры кода с детальными пояснениями.

## Содержание

1. [Работа с таблицами Ant Design](#работа-с-таблицами-ant-design)
   - [Изменение ширины столбцов в Chessboard](#изменение-ширины-столбцов-в-chessboard)
   - [Настройка прокрутки (предотвращение двойного скролла)](#настройка-прокрутки-предотвращение-двойного-скролла)
   - [Адаптивный расчёт высоты таблицы](#адаптивный-расчёт-высоты-таблицы)
2. [Компоненты фильтров](#компоненты-фильтров)
3. [Dropdown в таблицах](#dropdown-в-таблицах)
4. [Шаблон страницы "Документ"](#шаблон-страницы-документ)

---

## Работа с таблицами Ant Design

### Изменение ширины столбцов в Chessboard

**Проблема:** Как правильно изменить ширину столбцов в Chessboard, учитывая автоматическое масштабирование?

**Решение:** Ширина столбцов автоматически масштабируется для разных scale (0.7, 0.8, 0.9, 1.0).

#### Пошаговая инструкция:

1. Найдите `COLUMN_WIDTH_CONFIG_BASE` в `src/pages/documents/Chessboard/components/ChessboardTable.tsx` (строка ~94)
2. Используйте **ТОЛЬКО** `{ width: number }` для изменения ширины (НЕ minWidth/maxWidth!)
3. Для расчета используйте функцию `increaseColumnWidth(baseWidth, percentage)`

#### Примеры использования:

```typescript
// ❌ НЕПРАВИЛЬНО - не использовать minWidth/maxWidth
[COLUMN_KEYS.COST_TYPE]: { minWidth: 120, maxWidth: 200 }

// ✅ ПРАВИЛЬНО - используем width с функцией increaseColumnWidth
// Увеличить "Вид затрат" на 30% от базовых 120px
[COLUMN_KEYS.COST_TYPE]: { width: increaseColumnWidth(120, 30) } // = 156px

// Увеличить "Наименование работ" на 20% от базовых 200px
[COLUMN_KEYS.WORK_NAME]: { width: increaseColumnWidth(200, 20) } // = 240px
```

#### Почему это работает:

1. **Базовые значения для `scale = 0.7`**
   - Все значения в `COLUMN_WIDTH_CONFIG_BASE` настроены для минимального масштаба

2. **Автоматический пересчёт при других scale**
   - При `scale = 1.0`: ширина автоматически станет `width / 0.7 * 1.0`
   - Пример: 156px → 223px при scale = 1.0

3. **Функция `getScaledWidth()`**
   - Пересчитывает все размеры для текущего масштаба
   - Обеспечивает консистентность при изменении scale

#### Дополнительные примеры:

```typescript
// Базовая ширина 150px, увеличение на 25%
[COLUMN_KEYS.MATERIAL]: { width: increaseColumnWidth(150, 25) } // = 187.5px

// Базовая ширина 100px, увеличение на 50%
[COLUMN_KEYS.QUANTITY]: { width: increaseColumnWidth(100, 50) } // = 150px
```

**Связанные файлы:**
- `src/pages/documents/Chessboard/components/ChessboardTable.tsx` - конфигурация столбцов
- `src/shared/contexts/ScaleContext.tsx` - управление масштабом

---

### Настройка прокрутки (предотвращение двойного скролла)

**Проблема:** При создании страниц с таблицами появляется двойной вертикальный скролл - один на странице, другой в таблице.

**Решение:** Использовать правильную структуру контейнеров с фиксированной высотой.

#### ✅ Правильная структура (ИСПОЛЬЗОВАТЬ ВСЕГДА):

```tsx
// Главный контейнер страницы - фиксированная высота
<div style={{
  height: 'calc(100vh - 96px)', // 96px = высота header + отступы
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'  // ВАЖНО: предотвращает скролл страницы
}}>
  {/* Секция фильтров - не сжимается */}
  <div style={{ flexShrink: 0, paddingBottom: 16 }}>
    {/* Фильтры и управляющие элементы */}
    <FilterPanel />
    <ActionButtons />
  </div>

  {/* Контейнер таблицы - занимает оставшееся пространство */}
  <div style={{
    flex: 1,              // Занимает всё свободное место
    overflow: 'hidden',   // НЕ используйте overflow: auto!
    minHeight: 0          // Важно для правильной работы flexbox
  }}>
    <Table
      sticky              // Закрепление заголовков
      scroll={{
        x: 'max-content',
        y: 'calc(100vh - 300px)'  // Фиксированная высота для скролла таблицы
        // Если есть пагинация: y: 'calc(100vh - 350px)'
      }}
      dataSource={data}
      columns={columns}
      // ... остальные props
    />
  </div>
</div>
```

#### ❌ Неправильная структура (НЕ ИСПОЛЬЗОВАТЬ):

```tsx
// ПРОБЛЕМА: overflow: auto создаёт второй скролл
<div style={{ overflow: 'auto' }}>  // ❌ Будет двойной скролл!
  <Table scroll={{ y: '100%' }} />  // ❌ Не работает корректно
</div>

// ПРОБЛЕМА: отсутствие фиксированной высоты
<div>  // ❌ Контейнер растягивается на всю высоту контента
  <Table scroll={{ y: 'auto' }} />  // ❌ Скролл ломается
</div>
```

#### Ключевые правила для предотвращения двойного скролла:

1. **Главный контейнер:**
   ```tsx
   height: calc(100vh - 96px)  // Фиксированная высота
   overflow: hidden            // Блокирует скролл страницы
   display: flex               // Flexbox для управления дочерними элементами
   flexDirection: column       // Вертикальная компоновка
   ```

2. **Контейнер таблицы:**
   ```tsx
   flex: 1                    // Занимает оставшееся пространство
   overflow: hidden           // НЕ auto! Это создаст второй скролл
   minHeight: 0               // Важно для правильной работы flexbox
   ```

3. **Настройки Table:**
   ```tsx
   sticky                              // Для закрепления заголовков
   scroll.y: calc(100vh - 300px)       // Фиксированная высота, НЕ 100% или auto
   scroll.y: calc(100vh - 350px)       // Для страниц с пагинацией
   ```

#### Расчёт высоты для разных сценариев:

```tsx
// Без пагинации, без Summary строки
scroll={{ y: 'calc(100vh - 300px)' }}

// С пагинацией
scroll={{ y: 'calc(100vh - 350px)' }}

// С Summary строкой
scroll={{ y: 'calc(100vh - 340px)' }}

// С пагинацией и Summary
scroll={{ y: 'calc(100vh - 390px)' }}
```

**Связанные файлы:**
- `src/pages/documents/Chessboard.tsx` - пример правильной реализации
- `src/pages/references/*` - другие примеры использования

---

### Адаптивный расчёт высоты таблицы

**Проблема:** При фиксированной высоте таблицы последние строки и Summary строка могут обрезаться или быть недоступны.

**Решение:** Динамический расчёт высоты таблицы с учётом всех элементов страницы и размера экрана.

#### ✅ Правильный расчёт всех элементов:

```tsx
import { useState, useEffect } from 'react'

function MyPage() {
  // Состояние для адаптивной высоты
  const [tableScrollHeight, setTableScrollHeight] = useState('calc(100vh - 350px)')

  // Адаптивный расчёт высоты таблицы
  useEffect(() => {
    const calculateTableHeight = () => {
      const viewportHeight = window.innerHeight

      // Подробный расчёт ВСЕХ элементов:
      const headerHeight = 96          // header приложения
      const pageHeaderHeight = 160     // заголовок ВОР + описание + название
      const legendHeight = 60          // легенда цветов
      const tableHeaderHeight = 45     // заголовки столбцов таблицы ⭐ КРИТИЧНО
      const summaryRowHeight = 40      // итоговая строка ⭐ КРИТИЧНО
      const paddingAndMargins = 40     // отступы контейнера + borders

      const totalOffset = headerHeight + pageHeaderHeight + legendHeight +
                         tableHeaderHeight + summaryRowHeight + paddingAndMargins

      // Адаптивный расчёт с учётом размера экрана
      if (viewportHeight <= 768) {
        // Маленькие экраны - минимальные отступы
        setTableScrollHeight(`calc(100vh - ${totalOffset - 40}px)`)
      } else if (viewportHeight <= 1080) {
        // Средние экраны - стандартные отступы
        setTableScrollHeight(`calc(100vh - ${totalOffset}px)`)
      } else {
        // Большие экраны - дополнительный запас
        setTableScrollHeight(`calc(100vh - ${totalOffset + 20}px)`)
      }
    }

    calculateTableHeight()
    window.addEventListener('resize', calculateTableHeight)
    return () => window.removeEventListener('resize', calculateTableHeight)
  }, [])

  return (
    <Table
      scroll={{
        x: 'max-content',
        y: tableScrollHeight,  // Динамическое значение
      }}
      // ... другие props
    />
  )
}
```

#### Элементы, которые ОБЯЗАТЕЛЬНО учитывать:

**1. Внешние элементы страницы:**
```typescript
const headerHeight = 96          // Header приложения
const pageHeaderHeight = 160     // Заголовок секции/ВОР
const legendHeight = 60          // Легенда/описание
```

**2. Внутренние элементы таблицы (часто забывают!):**
```typescript
const tableHeaderHeight = 45     // Заголовки столбцов (thead) ⚠️
const summaryRowHeight = 40      // Summary строка ⚠️
const tableBorders = 20          // Borders и padding таблицы ⚠️
```

**3. Отступы контейнера:**
```typescript
const paddingAndMargins = 40     // Padding контейнера + margins
```

#### ❌ Типичные ошибки:

```tsx
// ❌ НЕ учитывать заголовки таблицы
const totalOffset = headerHeight + pageHeaderHeight  // Забыли tableHeaderHeight!

// ❌ НЕ учитывать Summary строку
scroll={{ y: 'calc(100vh - 300px)' }}  // Summary обрезается!

// ❌ Фиксированные значения без учёта размера экрана
const tableHeight = 'calc(100vh - 350px)'  // Не работает на маленьких экранах

// ❌ Использовать 100% или auto
scroll={{ y: '100%' }}  // ❌ Ломает прокрутку Ant Design Table
scroll={{ y: 'auto' }}  // ❌ Не работает корректно
```

#### ✅ Правильный подход:

```tsx
// Учитываем ВСЕ элементы
const totalOffset =
  headerHeight +           // 96px
  pageHeaderHeight +       // 160px
  legendHeight +           // 60px
  tableHeaderHeight +      // 45px (КРИТИЧНО!)
  summaryRowHeight +       // 40px (КРИТИЧНО!)
  paddingAndMargins        // 40px

// Адаптивный расчёт для разных экранов
if (viewportHeight <= 768) {
  setTableScrollHeight(`calc(100vh - ${totalOffset - 40}px)`)  // Маленькие экраны
} else if (viewportHeight <= 1080) {
  setTableScrollHeight(`calc(100vh - ${totalOffset}px)`)       // Средние экраны
} else {
  setTableScrollHeight(`calc(100vh - ${totalOffset + 20}px)`)  // Большие экраны
}
```

#### Практический пример для разных сценариев:

```tsx
// Сценарий 1: Страница с легендой и Summary
const calculateHeightWithLegendAndSummary = () => {
  const total = 96 + 160 + 60 + 45 + 40 + 40 // = 441px
  return `calc(100vh - ${total}px)`
}

// Сценарий 2: Простая страница без легенды, но с пагинацией
const calculateHeightWithPagination = () => {
  const total = 96 + 160 + 45 + 50 + 40 // = 391px (50px для пагинации)
  return `calc(100vh - ${total}px)`
}

// Сценарий 3: Минимальная страница (только header и таблица)
const calculateMinimalHeight = () => {
  const total = 96 + 45 + 40 // = 181px
  return `calc(100vh - ${total}px)`
}
```

**Связанные файлы:**
- `src/pages/documents/VOR.tsx` - пример с адаптивным расчётом
- `src/pages/documents/Chessboard.tsx` - сложный пример с множеством элементов

---

## Компоненты фильтров

**Проблема:** Select компоненты в фильтрах должны поддерживать поиск по русскому тексту и очистку значения.

**Решение:** Стандартный паттерн для всех Select компонентов в фильтрах.

### ✅ Правильный паттерн для Select в фильтрах:

```typescript
<Select
  placeholder="Выберите значение"
  allowClear              // Включает кнопку X для очистки
  showSearch              // Включает поиск по вводу
  filterOption={(input, option) => {
    // Поддержка поиска по русскому тексту
    const text = (option?.children || option?.label)?.toString() || ""
    return text.toLowerCase().includes(input.toLowerCase())
  }}
  value={selectedValue}
  onChange={handleChange}
  style={{ width: '100%' }}
>
  {options.map(item => (
    <Select.Option key={item.id} value={item.id}>
      {item.name}
    </Select.Option>
  ))}
</Select>
```

### Обязательные свойства для всех Select в фильтрах:

1. **`allowClear`** - Включает кнопку X для очистки выбранного значения
   ```tsx
   allowClear  // Пользователь может сбросить выбор
   ```

2. **`showSearch`** - Включает поиск по вводу
   ```tsx
   showSearch  // Пользователь может искать нужное значение
   ```

3. **`filterOption`** - Кастомная функция фильтрации для поддержки русского языка
   ```tsx
   filterOption={(input, option) => {
     const text = (option?.children || option?.label)?.toString() || ""
     return text.toLowerCase().includes(input.toLowerCase())
   }}
   ```

### Варианты использования:

#### Вариант 1: Select с children (Select.Option)

```tsx
<Select
  placeholder="Выберите проект"
  allowClear
  showSearch
  filterOption={(input, option) => {
    const text = option?.children?.toString() || ""  // Используем children
    return text.toLowerCase().includes(input.toLowerCase())
  }}
>
  {projects.map(project => (
    <Select.Option key={project.id} value={project.id}>
      {project.name}
    </Select.Option>
  ))}
</Select>
```

#### Вариант 2: Select с options prop

```tsx
const projectOptions = projects.map(p => ({
  label: p.name,
  value: p.id,
}))

<Select
  placeholder="Выберите проект"
  allowClear
  showSearch
  filterOption={(input, option) => {
    const text = option?.label?.toString() || ""  // Используем label
    return text.toLowerCase().includes(input.toLowerCase())
  }}
  options={projectOptions}
/>
```

#### Вариант 3: Multiple Select (множественный выбор)

```tsx
<Select
  mode="multiple"
  placeholder="Выберите несколько значений"
  allowClear
  showSearch
  filterOption={(input, option) => {
    const text = (option?.children || option?.label)?.toString() || ""
    return text.toLowerCase().includes(input.toLowerCase())
  }}
  maxTagCount="responsive"  // Автоматически сворачивает теги
>
  {categories.map(cat => (
    <Select.Option key={cat.id} value={cat.id}>
      {cat.name}
    </Select.Option>
  ))}
</Select>
```

### Универсальная функция для filterOption:

```typescript
// Создайте утилиту для переиспользования
export const russianFilterOption = (input: string, option: any) => {
  const text = (option?.children || option?.label)?.toString() || ""
  return text.toLowerCase().includes(input.toLowerCase())
}

// Использование:
<Select
  allowClear
  showSearch
  filterOption={russianFilterOption}
  // ... другие props
/>
```

**Связанные файлы:**
- `src/pages/documents/Chessboard.tsx` - примеры фильтров
- `src/pages/references/*` - другие примеры использования

---

## Dropdown в таблицах

**Проблема:** Dropdown в ячейках таблицы обрезаются нижними строками или не видны полностью.

**Главная причина:** Использование `getPopupContainer` в Select компонентах внутри таблиц.

### ❌ НЕПРАВИЛЬНО - вызывает обрезание dropdown:

```typescript
<Select
  getPopupContainer={(triggerNode) => triggerNode.parentNode}  // ❌ Проблема!
  options={data}
  // ... другие свойства
/>
```

**Почему это не работает:**
- `getPopupContainer` привязывает dropdown к родительскому элементу ячейки
- Ячейка таблицы имеет `overflow: hidden`
- Dropdown обрезается границами ячейки

### ✅ ПРАВИЛЬНО - dropdown отображается поверх таблицы:

```typescript
// 1. Функция для динамических dropdown с расширением до 500px
const getDynamicDropdownStyle = (options: Array<{ label: string; value: any }>) => ({
  ...STABLE_STYLES.dropdownStyle,
  minWidth: calculateDropdownWidth(options),
  width: calculateDropdownWidth(options),
  maxWidth: '500px',
  zIndex: 9999,  // Высокий z-index для отображения поверх всех элементов
})

// 2. Использование в Select
<Select
  value={value}
  onChange={onChange}
  options={data}
  allowClear
  showSearch
  filterOption={(input, option) =>
    (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
  }
  placeholder="Выберите значение"
  size="small"
  style={{ width: '100%' }}
  dropdownStyle={getDynamicDropdownStyle(data)}
  // ❗ НЕ ДОБАВЛЯЙТЕ getPopupContainer!
/>
```

### Правила для dropdown в таблицах:

1. **НИКОГДА не используйте `getPopupContainer` в Select внутри таблиц**
   ```tsx
   // ❌ НЕ ДЕЛАЙТЕ ТАК:
   getPopupContainer={(trigger) => trigger.parentNode}
   getPopupContainer={() => document.body}
   ```

2. **Всегда используйте высокий z-index (9999)**
   ```tsx
   // ✅ ПРАВИЛЬНО:
   dropdownStyle={{ zIndex: 9999 }}
   ```

3. **Применяйте динамическое расширение через `getDynamicDropdownStyle`**
   ```tsx
   // Dropdown адаптируется к ширине контента
   dropdownStyle={getDynamicDropdownStyle(options)}
   ```

4. **Ограничения ширины dropdown: минимум 150px, максимум 500px**
   ```tsx
   dropdownStyle={{
     minWidth: '150px',
     maxWidth: '500px',
     zIndex: 9999,
   }}
   ```

### Полный пример реализации:

```typescript
import { Select } from 'antd'
import { useMemo } from 'react'

// Утилита для расчёта ширины dropdown
const calculateDropdownWidth = (options: Array<{ label: string }>) => {
  const maxLength = Math.max(...options.map(opt => opt.label.length))
  return Math.min(Math.max(maxLength * 8 + 50, 150), 500)
}

// Стабильные стили для переиспользования
const STABLE_STYLES = {
  dropdownStyle: {
    zIndex: 9999,
  },
}

// Функция для генерации стилей dropdown
const getDynamicDropdownStyle = (options: Array<{ label: string; value: any }>) => ({
  ...STABLE_STYLES.dropdownStyle,
  minWidth: calculateDropdownWidth(options),
  width: calculateDropdownWidth(options),
  maxWidth: '500px',
})

// Компонент таблицы с dropdown в ячейках
function MyTableWithDropdowns() {
  const columns = [
    {
      title: 'Категория',
      dataIndex: 'category',
      render: (value, record) => (
        <Select
          value={value}
          onChange={(newValue) => handleChange(record.id, newValue)}
          options={categoryOptions}
          allowClear
          showSearch
          filterOption={(input, option) =>
            (option?.label?.toString() || '').toLowerCase().includes(input.toLowerCase())
          }
          placeholder="Выберите категорию"
          size="small"
          style={{ width: '100%' }}
          dropdownStyle={getDynamicDropdownStyle(categoryOptions)}
          // ❗ НЕ ДОБАВЛЯЙТЕ getPopupContainer
        />
      ),
    },
  ]

  return <Table columns={columns} dataSource={data} />
}
```

### Дополнительные советы:

1. **Используйте `dropdownMatchSelectWidth={false}`** для свободного размера dropdown
   ```tsx
   <Select
     dropdownMatchSelectWidth={false}
     dropdownStyle={getDynamicDropdownStyle(options)}
   />
   ```

2. **Добавьте `virtual={false}`** для небольших списков (< 100 элементов)
   ```tsx
   <Select
     virtual={false}  // Отключает виртуализацию для лучшей производительности
     dropdownStyle={{ zIndex: 9999 }}
   />
   ```

3. **Используйте `popupClassName`** для дополнительной стилизации
   ```tsx
   <Select
     popupClassName="table-dropdown"
     dropdownStyle={{ zIndex: 9999 }}
   />
   ```

**Связанные файлы:**
- `src/pages/documents/Chessboard/components/ChessboardTable.tsx` - пример с dropdown в таблице
- `src/pages/documents/VOR.tsx` - другой пример использования

---

## Шаблон страницы "Документ"

**Применение:** Используется для страниц категории справочников и документов (например, Шахматка, ВОР, Расценки).

**Основные принципы:** Стандартизированная структура страницы с таблицей, фильтрами, режимами работы и настройками.

### 1. Структура страницы

```tsx
<div style={{ padding: '24px' }}>
  {/* Заголовок страницы */}
  <h1>Название документа</h1>

  {/* Статичный блок фильтров - всегда видимый */}
  <div style={{ marginBottom: 16 }}>
    <Space>
      <Select placeholder="Проект" /* основные фильтры */ />
      <Select placeholder="Корпус" />
      <Button onClick={handleApplyFilters}>Применить</Button>
    </Space>
  </div>

  {/* Скрываемый блок фильтров */}
  <Collapse>
    <Collapse.Panel header="Дополнительные фильтры">
      <Space wrap>
        <Select placeholder="Категория затрат" />
        <Select placeholder="Вид затрат" />
        {/* ... другие фильтры ... */}
        <Button icon={<SettingOutlined />}>Настройка столбцов</Button>
      </Space>
    </Collapse.Panel>
  </Collapse>

  {/* Таблица данных */}
  <Table /* ... */ />
</div>
```

### 2. Режимы работы таблицы

**Состояние режима:**
```typescript
type Mode = 'view' | 'add' | 'edit' | 'delete'
const [mode, setMode] = useState<Mode>('view')
```

**Режимы:**
- **view** - Просмотр данных (по умолчанию)
- **add** - Добавление новых строк
- **edit** - Inline редактирование существующих строк
- **delete** - Массовое удаление с чекбоксами

### 3. Функциональность строк

```tsx
const columns = [
  // Чекбокс для массового удаления (только в режиме delete)
  mode === 'delete' && {
    title: <Checkbox onChange={handleSelectAll} />,
    render: (_, record) => <Checkbox checked={selectedRows.includes(record.id)} />,
  },

  // Цветовая маркировка
  {
    title: '',
    width: 40,
    render: (_, record) => (
      <ColorPicker
        value={record.rowColor}
        onChange={(color) => handleColorChange(record.id, color)}
      />
    ),
  },

  // ... основные колонки данных ...

  // Столбец действий (только иконки, без текста!)
  {
    title: 'Действия',
    width: 120,
    render: (_, record) => (
      <Space>
        <Button
          icon={<CopyOutlined />}
          size="small"
          onClick={() => handleCopy(record)}
        />
        <Button
          icon={<EditOutlined />}
          size="small"
          onClick={() => handleEdit(record)}
        />
        <Button
          icon={<DeleteOutlined />}
          size="small"
          danger
          onClick={() => handleDelete(record)}
        />
      </Space>
    ),
  },
]
```

### 4. Сохранение изменений

**Режимная логика кнопок:**
```tsx
// В режиме просмотра
{mode === 'view' && (
  <>
    <Button onClick={() => setMode('add')}>Добавить</Button>
    {appliedFilters.project_id && (
      <Button onClick={() => setMode('delete')}>Удалить</Button>
    )}
  </>
)}

// В режиме добавления
{mode === 'add' && (
  <>
    <Button type="primary" onClick={handleSave}>Сохранить</Button>
    <Button onClick={() => setMode('view')}>Отмена</Button>
  </>
)}

// В режиме редактирования
{mode === 'edit' && (
  <>
    <Button type="primary" onClick={handleSave}>Сохранить</Button>
    <Button onClick={() => setMode('view')}>Отмена</Button>
  </>
)}

// В режиме удаления
{mode === 'delete' && appliedFilters.project_id && (
  <>
    <Button danger onClick={handleBulkDelete}>
      Удалить ({selectedRows.length})
    </Button>
    <Button onClick={() => setMode('view')}>Отмена</Button>
  </>
)}
```

**Обработка конфликтов:**
```tsx
// При сохранении проверяем уникальные поля
const handleSave = async () => {
  try {
    await saveData(changedRows)
  } catch (error) {
    if (error.code === 'UNIQUE_VIOLATION') {
      // Показываем диалог разрешения конфликта
      showConflictDialog({
        existingData,
        newData,
        onMerge: () => handleMerge(),
        onOverwrite: () => handleOverwrite(),
        onRollback: () => handleRollback(),
      })
    }
  }
}
```

### 5. Настройка столбцов

```tsx
// Drawer для настройки столбцов
<Drawer
  title="Настройка столбцов"
  placement="right"
  width={350}
  open={showColumnSettings}
  onClose={() => setShowColumnSettings(false)}
>
  {/* Чекбокс "Выделить все" */}
  <Checkbox
    checked={allColumnsVisible}
    onChange={handleToggleAllColumns}
  >
    Выделить все
  </Checkbox>

  {/* Кнопка "По умолчанию" */}
  <Button onClick={handleResetColumns}>По умолчанию</Button>

  {/* Список столбцов */}
  {columns.map((col, index) => (
    <div key={col.key}>
      <Checkbox
        checked={columnVisibility[col.key]}
        onChange={() => handleToggleColumn(col.key)}
      >
        {col.title}
      </Checkbox>
      <Button icon={<UpOutlined />} onClick={() => handleMoveUp(index)} />
      <Button icon={<DownOutlined />} onClick={() => handleMoveDown(index)} />
    </div>
  ))}
</Drawer>

// Сохранение в localStorage
useEffect(() => {
  localStorage.setItem(
    '{page-name}-column-visibility',
    JSON.stringify(columnVisibility)
  )
  localStorage.setItem(
    '{page-name}-column-order',
    JSON.stringify(columnOrder)
  )
}, [columnVisibility, columnOrder])

// Восстановление при загрузке
useEffect(() => {
  const savedVisibility = localStorage.getItem('{page-name}-column-visibility')
  const savedOrder = localStorage.getItem('{page-name}-column-order')
  if (savedVisibility) setColumnVisibility(JSON.parse(savedVisibility))
  if (savedOrder) setColumnOrder(JSON.parse(savedOrder))
}, [])
```

### 6. Пагинация

```tsx
const [pagination, setPagination] = useState({
  current: 1,
  pageSize: 100,  // По умолчанию
  total: 0,
  showSizeChanger: true,
  pageSizeOptions: ['10', '20', '50', '100', '200', '500'],
})

// Сохранение выбора в localStorage
useEffect(() => {
  localStorage.setItem('{page-name}-page-size', pagination.pageSize.toString())
}, [pagination.pageSize])

<Table
  pagination={pagination}
  onChange={(newPagination) => setPagination(newPagination)}
/>
```

### 7. Закрепление элементов

```tsx
// Структура с sticky элементами
<div style={{ height: 'calc(100vh - 96px)' }}>
  {/* Sticky фильтры */}
  <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff' }}>
    {/* Фильтры */}
  </div>

  {/* Таблица со sticky заголовками */}
  <Table
    sticky
    scroll={{
      x: 'max-content',
      y: 'calc(100vh - 300px)',
    }}
  />
</div>
```

### 8. Импорт/Экспорт

```tsx
// Импорт из Excel
<Upload
  accept=".xlsx,.xls"
  beforeUpload={handleImport}
  showUploadList={false}
>
  <Button icon={<UploadOutlined />}>Импорт из Excel</Button>
</Upload>

// Обработка импорта
const handleImport = async (file: File) => {
  const data = await parseExcelFile(file)
  const conflicts = await checkConflicts(data)

  if (conflicts.length > 0) {
    // Показываем диалог разрешения конфликтов
    showConflictDialog(conflicts)
  } else {
    await saveImportedData(data)
  }
}

// Экспорт в Excel
const handleExport = () => {
  const filteredData = applyFilters(data, appliedFilters)
  exportToExcel(filteredData, 'export.xlsx')
}
```

### 9. Цветовая схема строк

```typescript
const ROW_COLORS = {
  green: '#d9f7be',
  yellow: '#fff1b8',
  blue: '#e6f7ff',
  red: '#ffa39e',
} as const

// Применение цвета к строке
<Table
  rowClassName={(record) => record.rowColor}
  // ... другие props
/>

// CSS для цветов строк
.ant-table-row {
  &.green { background-color: #d9f7be !important; }
  &.yellow { background-color: #fff1b8 !important; }
  &.blue { background-color: #e6f7ff !important; }
  &.red { background-color: #ffa39e !important; }
}
```

### Пример использования шаблона

**При создании новой страницы:**

1. **Копировать структуру** из `src/pages/documents/Chessboard.tsx`
2. **Адаптировать** под конкретную сущность (изменить API endpoints, названия полей)
3. **Сохранять** все принципы работы с данными (режимы, фильтры, сохранение)
4. **Использовать** единые паттерны для фильтров и действий

**Референсные файлы:**
- `src/pages/documents/Chessboard.tsx` - основной пример реализации
- `src/pages/documents/VOR.tsx` - адаптация шаблона для ВОР
- `src/pages/references/Units.tsx` - пример для справочника

---

## Заключение

Этот файл содержит детальные решения наиболее частых задач в проекте BlueprintFlow. При возникновении вопросов по реализации конкретных паттернов обращайтесь к этому документу.

**Для быстрого доступа:**
- Общие принципы и архитектура → См. `CLAUDE.md`
- Детальные примеры кода → Этот файл (`docs/CODE_PATTERNS.md`)
- Оптимизация производительности → См. `docs/PERFORMANCE_OPTIMIZATION.md`
