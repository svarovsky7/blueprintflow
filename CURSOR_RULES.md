# BlueprintFlow - Cursor AI Development Rules

## 🎯 Project Overview

**BlueprintFlow** — портал для анализа рабочей документации и сметного отдела строительного генподрядчика. Современное React-приложение с акцентом на производительность и масштабируемость.

## 🚀 Quick Start

### Development Commands
```bash
# Development
npm run dev          # http://192.168.8.75:5173 (network accessible)
npm run dev:local    # http://localhost:5173 (localhost only)
npm run build        # TypeScript check + Vite build (MUST pass before commit)
npm run lint         # ESLint check (MUST pass before commit)
npm run format       # Prettier formatting
npx playwright test  # E2E tests

# Multiple Dev Servers
npm run dev          # Terminal 1: Network accessible
npm run dev:local    # Terminal 2: Localhost only
```

### Pre-commit Checklist
1. Run `npm run lint` and fix all warnings
2. Run `npm run format` to ensure consistent formatting  
3. Run `npm run build` and ensure project builds successfully
4. Run `npx playwright test` if changes affect UI
5. Follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18.3, TypeScript ~5.8.3 (strict mode), Vite 7.0
- **UI Library**: Ant Design 5.20+ with Ant Design Charts 2.6+
- **State Management**: TanStack Query 5.59+ (server state), Zustand 5.0+ (auth state)
- **Backend**: Supabase 2.47+ (PostgreSQL, Auth, Storage, Edge Functions, Realtime)
- **Authentication**: Supabase Auth with OAuth 2.0 (Google, Microsoft) and MFA support
- **Excel Processing**: xlsx 0.18+ library for import/export
- **Virtualization**: TanStack React Virtual 3.13+, React Window 1.8+ for large datasets
- **Testing**: Playwright 1.55+ for end-to-end testing

### Feature-Sliced Design (FSD) Structure
```
src/
├── app/          # App-level providers, routing
├── pages/        # Route pages (main pages, admin/, documents/, references/)
├── widgets/      # Complex reusable UI blocks (empty - to be populated)
├── features/     # User interactions, business features (auth/)
├── entities/     # Business entities and their APIs (chessboard/, documentation/, rates/, etc.)
├── shared/       # Shared utilities, UI components, types (lib/, types/, ui/)
├── layout/       # Layout components (MainLayout.tsx)
├── lib/          # External library configurations (supabase.ts)
└── components/   # Legacy UI components (ConflictResolutionDialog, DataTable, FileUpload, etc.)
```

### Path Aliases
```typescript
// Use path aliases configured in vite.config.ts and tsconfig.app.json:
import { useAuthStore } from '@/features/auth'
import { ChessboardRow } from '@/entities/chessboard'
import { Button } from '@/shared/ui'
```

## 🗄️ Database Integration

### CRITICAL: Database Schema Check
**КРИТИЧЕСКИ ВАЖНО**: Перед любой работой с базой данных:
1. **СНАЧАЛА** используй MCP-сервер `mcp-supabase` для проверки актуальной схемы
2. **ЗАТЕМ** пиши SQL-запросы или API-вызовы на основе реальной структуры
3. **РЕЗЕРВНЫЙ ВАРИАНТ**: При недоступности MCP → используй `supabase/schemas/prod.sql`

### Core Tables
- `chessboard` - Main data table for material tracking
- `chessboard_sets` - Chessboard sets for documentation organization
- `work_sets` - Work sets (normalized structure, replaces string field in old rates)
- `work_set_rates` - Rates within work sets
- `finishing_pie_mapping` - Finishing pie types with color marking support
- `type_calculation_mapping` - Type calculations with color marking support
- `units` - Units of measurement
- `cost_categories`, `detail_cost_categories` - Cost categorization
- `location` - Location/localization data
- `projects`, `blocks` - Project structure with `projects_blocks` mapping
- `documentation` - Document management with versioning
- `materials` - Materials catalog
- `users`, `roles`, `permissions` - Authorization system

### Database Rules
- All tables MUST include `created_at` and `updated_at` fields
  - **EXCEPTION**: Mapping/junction tables (many-to-many relationships) should NOT have `created_at` and `updated_at` fields
- **Primary keys**: All tables should use UUID for primary keys (id field)
  - **EXCEPTION**: Legacy tables may use integer IDs during migration phase
- **Mapping table naming**: All mapping/junction tables MUST have `_mapping` suffix (e.g., `chessboard_mapping`, `entity_comments_mapping`)
- **NEVER use RLS (Row Level Security)** - handle auth in application layer
- Use optimistic locking via `updated_at` timestamp for concurrent edits

### Batching for Large ID Arrays (КРИТИЧЕСКИ ВАЖНО)

**Проблема:** Запросы `.in('column', arrayOfIds)` с массивами 100+ элементов создают слишком длинные URL (>2048 символов), что приводит к ошибке 400 Bad Request.

**Решение:** ВСЕГДА используй батчинг для массивов больше 50 элементов.

```typescript
// Вспомогательная функция для разбиения массива на батчи
const batchArray = <T>(array: T[], batchSize: number): T[][] => {
  const batches: T[][] = []
  for (let i = 0; i < array.length; i += batchSize) {
    batches.push(array.slice(i, i + batchSize))
  }
  return batches
}

// Вспомогательная функция для выполнения запросов батчами
const fetchInBatches = async <T>(
  tableName: string,
  selectQuery: string,
  ids: string[],
  idColumnName: string,
  batchSize = 100
): Promise<T[]> => {
  if (!supabase) throw new Error('Supabase client not initialized')

  const batches = batchArray(ids, batchSize)
  const results: T[] = []

  for (const batch of batches) {
    const { data, error } = await supabase
      .from(tableName)
      .select(selectQuery)
      .in(idColumnName, batch)

    if (error) throw error
    if (data) results.push(...data)
  }

  return results
}

// Пример использования
const chessboardIds = chessboardData.map((item) => item.id) // 1000+ элементов

// ❌ НЕПРАВИЛЬНО: создаёт URL >40KB
const { data } = await supabase
  .from('chessboard_rates_mapping')
  .select('*')
  .in('chessboard_id', chessboardIds)

// ✅ ПРАВИЛЬНО: батчинг по 100 ID
const ratesData = await fetchInBatches(
  'chessboard_rates_mapping',
  'chessboard_id, work_set_rate_id, work_set_rate:work_set_rate_id(...)',
  chessboardIds,
  'chessboard_id',
  100
)
```

## ⚠️ Critical Guidelines

### MUST DO
- **КРИТИЧЕСКИ ВАЖНО**: Перед любой работой с БД используй MCP сервер для проверки актуальной схемы
- **КРИТИЧЕСКИ ВАЖНО**: При добавлении кода для логирования ОБЯЗАТЕЛЬНО указывать в комментариях, что строки относятся к логгированию (например: `// LOG: отладочная информация`, `// DEBUG LOG: проверка состояния`, `console.log('🔍 Loading data...') // LOG`)
- **КРИТИЧЕСКИ ВАЖНО**: Максимальный размер файла 600 строк - разбивай большие файлы на компоненты, хуки, утилиты и модули
- **КРИТИЧЕСКИ ВАЖНО**: Все SQL файлы ОБЯЗАТЕЛЬНО сохранять в папку `sql/` - НИКОГДА не размещай SQL файлы в корневой папке или других директориях
- **КРИТИЧЕСКИ ВАЖНО**: ВСЕГДА используй батчинг для массивов >50 элементов в `.in()` запросах - длинные URL (>2048 символов) вызывают 400 Bad Request
- Run `npm run lint` before committing
- Run `npm run format` for consistent code style
- Handle all TypeScript strict mode requirements
- Use absolute imports with path aliases (@/)
- Export public APIs through index.ts files
- Include error handling in all Supabase queries
- Write **TypeScript only** with strict typing
- Use functional React components and hooks
- Data fetching via TanStack Query
- All tables MUST have sorting and filters in column headers

### NEVER DO
- Create files unless absolutely necessary
- Add comments unless explicitly requested
- Use relative imports (../../../)
- Commit .env files or secrets
- Use `any` type in TypeScript
- Create documentation files proactively
- Use RLS (Row Level Security)
- Store secrets or generated artifacts in repository
- **НИКОГДА** не передавай массивы 100+ элементов напрямую в `.in()` без батчинга - это создаёт слишком длинные URL и вызывает ошибку 400 Bad Request

## 📝 Code Patterns

### Standard Supabase Query Pattern
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*, relation:table(*)')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Operation failed:', error);
  message.error('Не удалось загрузить данные');
  throw error;
}

return data;
```

### Error Handling Pattern
```typescript
try {
  const { data, error } = await supabase.from('table').select();

  if (error) {
    console.error('Database error:', error);
    message.error('Не удалось загрузить данные');
    throw error;
  }

  return data;
} catch (err) {
  console.error('Unexpected error:', err);
  message.error('Произошла непредвиденная ошибка');
  throw err;
}
```

### Entity Pattern
All entities follow the same structure:
```typescript
// src/entities/entity-name/
├── api/
│   └── entity-name-api.ts    # API functions for server communication
├── model/
│   └── types.ts              # TypeScript types and interfaces
└── index.ts                  # Public API exports
```

### Filter Components Requirements
**All Select components in filters MUST include:**
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

## 🎨 UI/UX Guidelines

### Table Scroll Configuration
**КРИТИЧЕСКИ ВАЖНО:** Правильная настройка прокрутки для предотвращения двойного скролла.

**Ключевые правила:**
1. Главный контейнер: `height: calc(100vh - 96px)`, `overflow: hidden`
2. Контейнер таблицы: `flex: 1`, `overflow: hidden` (НЕ auto!), `minHeight: 0`
3. Table: `sticky`, `scroll.y: calc(100vh - 300px)` (фиксированная высота)

### Dropdown Best Practices (КРИТИЧЕСКИ ВАЖНО)
**Проблема:** Dropdown в ячейках таблицы обрезаются нижними строками.

**Ключевые правила:**
1. НИКОГДА не используйте `getPopupContainer` в Select внутри таблиц
2. Всегда используйте высокий z-index (9999)
3. Применяйте динамическое расширение через `getDynamicDropdownStyle`
4. Максимальная ширина dropdown: 500px, минимальная: 150px

### Color Marking System
**Цветовая схема строк:**
- green: #d9f7be → #b7eb8f (при наведении)
- yellow: #fff1b8 → #ffe58f (при наведении)  
- blue: #e6f7ff → #bae7ff (при наведении)
- red: #ffa39e → #ff7875 (при наведении)

**КРИТИЧЕСКИ ВАЖНО:**
- НЕ используйте inline styles через `onRow`/`onCell` для цветов
- Inline styles блокируют CSS hover псевдо-селекторы
- Всегда используйте CSS классы `row-color-{color}`

## 🚀 Performance Optimization

### System Components
1. **PerformanceControls** - Панель управления производительностью
2. **SmartTableOptimizer** - Оптимизатор для малых и средних таблиц  
3. **VirtualizedTable** - Виртуализированная таблица
4. **ChessboardOptimized** - Главный координатор оптимизаций

### Performance Modes
- **Обычный режим** (50-500 строк) - полная функциональность
- **Виртуализированный режим** (500+ строк) - высокая производительность
- **Режим производительности** - упрощенные фильтры и сортировка

### Optimization Techniques
- **React.memo** с кастомными сравнениями
- **useMemo** и **useCallback** для мемоизации
- **DebouncedInput** для устранения лагов при вводе
- **React 18 оптимизации** (useDeferredValue, startTransition)

## 📁 File Organization

### File Size Management
- **600 lines maximum** per file for optimal maintainability and performance
- **Decomposition strategies**:
  - Split large components into smaller sub-components
  - Extract custom hooks for complex logic
  - Move utility functions to separate modules
  - Create dedicated types files for complex interfaces
  - Use composition pattern instead of inheritance
  - Extract constants and configuration to separate files

### Directory Structure
- `src/entities/` - Domain entities (api-settings, calculation, chessboard, comments, disk, documentation, documentation-tags, finishing, materials, ml, permissions, portal-objects, projects, rates, roles, rooms, statuses, units, user-groups, users, vor)
- `src/pages/` - Main application pages organized by sections (admin/, documents/, references/, reports/, experiments/)
- `src/features/auth/` - Authentication logic using Supabase
- `src/shared/contexts/` - React contexts for global state (LogoContext, ScaleContext)
- `src/lib/supabase.ts` - Supabase client configuration
- `src/components/` - Legacy UI components being migrated to FSD structure
- `docs/` - Technical documentation (CODE_PATTERNS.md, PERFORMANCE_OPTIMIZATION.md)
- `tests/` - Playwright E2E tests (auth.spec.js, chessboard-simple.spec.ts, etc.)
- `sql/` - SQL migrations and schema changes (MUST store all SQL files here)
- `temp/` - Temporary files that can be safely deleted at the end of the day

## 🔗 Additional Resources

- **Детальные примеры кода**: `docs/CODE_PATTERNS.md`
- **Оптимизация производительности**: `docs/PERFORMANCE_OPTIMIZATION.md`
- **Основная документация**: `CLAUDE.md`
- **Схема базы данных**: `supabase.sql`

## 🎯 Quick Reference

### Most Common Tasks
1. **Создание новой страницы**: Используй шаблон "Документ" из `docs/CODE_PATTERNS.md`
2. **Работа с БД**: Сначала проверь схему через MCP, затем используй батчинг для больших массивов
3. **Оптимизация таблиц**: Используй PerformanceControls для управления производительностью
4. **Фильтры**: Всегда добавляй `allowClear`, `showSearch`, `filterOption` для Select компонентов
5. **Цветовая маркировка**: Используй CSS классы `row-color-{color}`, НЕ inline styles

### Critical Commands
```bash
npm run dev          # Start development server
npm run build        # Build and type check
npm run lint         # ESLint check
npx playwright test  # Run E2E tests
```

Remember: **Всегда проверяй БД через MCP, используй батчинг для больших массивов, и ограничивай размер файлов 600 строками!**
