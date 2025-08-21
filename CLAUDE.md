# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Requirements

**ВАЖНО**: Все ответы, комментарии, сообщения об ошибках, диалоги и любое другое общение с пользователем должно быть на русском языке. Код и технические термины остаются на английском.

## Project Overview

BlueprintFlow is a React-based construction management portal for analyzing work documentation and cost estimation department of a construction general contractor. The system supports OAuth 2.0 authentication, Excel import capabilities, and real-time collaboration features for a team of 200+ employees.

## Tech Stack
- **Frontend**: React 19.1, TypeScript 5.8 (strict mode), Vite 7.0
- **UI Library**: Ant Design 5.21 with Vibe design approach
- **State Management**: TanStack Query 5.59+ (server state), Zustand 5.0+ (auth state)
- **Backend**: Supabase 2.47+ (PostgreSQL 17, Auth, Storage, Edge Functions, Realtime WebSocket)
- **Authentication**: Supabase Auth with OAuth 2.0 (Google, Microsoft) and MFA support
- **Observability**: Sentry, Grafana Cloud, OpenTelemetry
- **Excel Processing**: xlsx 0.18 library for import/export
- **Utilities**: Day.js 1.11 for dates
- **Routing**: React Router DOM 6.27
- **Editor**: WebStorm

## Commands

```bash
# Development
npm install           # Install dependencies
npm run dev          # Start dev server (http://localhost:5173)
npm run preview      # Preview production build

# Build & Quality
npm run build        # TypeScript check + Vite build (MUST pass before commit)
npm run lint         # ESLint check (MUST pass before commit)
npm run format       # Prettier formatting
npm run format:check # Check formatting without changes
npx tsc --noEmit    # Type checking only (standalone)

# Database Operations
node -e "import('@supabase/supabase-js').then(m => {const c = m.createClient('https://hfqgcaxmufzitdfafdlp.supabase.co', process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc'); c.from('TABLE_NAME').select('*', {count: 'exact', head: true}).then(r => console.log('Count:', r.count)).catch(console.error)})"  # Quick table count
```

## Pre-commit Checklist
1. Run `npm run lint` and fix all warnings
2. Run `npm run format` to ensure consistent formatting
3. Run `npm run build` and ensure project builds successfully
4. Follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

## Architecture

### Feature-Sliced Design (FSD) Structure
```
src/
├── app/          # App-level providers, routing
├── pages/        # Route pages  
├── widgets/      # Complex reusable UI blocks
├── features/     # User interactions, business features
├── entities/     # Business entities and their APIs
├── shared/       # Shared utilities, UI components, types
├── lib/          # External library configurations (Supabase, etc.)
└── components/   # Legacy UI components (migrate to FSD gradually)
```

### Key Patterns
- **Public API**: Each slice exposes through `index.ts`
- **Imports**: Use path aliases configured in `vite.config.ts` and `tsconfig.app.json`:
  - `@/` → `./src`
  - `@/app/` → `./src/app`
  - `@/pages/` → `./src/pages`
  - `@/widgets/` → `./src/widgets`
  - `@/features/` → `./src/features`
  - `@/entities/` → `./src/entities`
  - `@/shared/` → `./src/shared`
- **State**: TanStack Query for server state, Zustand for auth state only
- **API Files**: Named as `entity-name-api.ts` in `entities/*/api/`
- **Error Handling**: All Supabase queries must include error handling

## Database

**CRITICAL**: Always reference `supabase/schemas/prod.sql` for current database structure.


## Database Integration

### Supabase Configuration
Environment variables required:
```env
VITE_SUPABASE_URL=https://hfqgcaxmufzitdfafdlp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc
VITE_STORAGE_BUCKET=<storage_url>
```

Configuration: `src/lib/supabase.ts`

### MCP Server Setup
The project includes `.mcp.json` configuration for Claude Code to automatically connect to Supabase:

**IMPORTANT**: To enable MCP server functionality, you need to:
1. Set `SUPABASE_ACCESS_TOKEN` in your environment or update `.mcp.json`
2. Claude Code will automatically initialize the MCP server on startup
3. Use MCP tools for database operations instead of manual queries

Quick database inspection:
```bash
# Count records in any table (replace TABLE_NAME)
node -e "import('@supabase/supabase-js').then(m => {const c = m.createClient('https://hfqgcaxmufzitdfafdlp.supabase.co', process.env.VITE_SUPABASE_ANON_KEY); c.from('TABLE_NAME').select('*', {count: 'exact', head: true}).then(r => console.log('Count:', r.count)).catch(console.error)})"

# Or use MCP server tools when available (preferred)
```

### Database Deployment
Deploy database schema:
```bash
psql "$DATABASE_URL" -f supabase.sql
for file in sql/*.sql; do psql "$DATABASE_URL" -f "$file"; done
```

### Core Tables
- `chessboard` - Main data table for material tracking
- `chessboard_mapping` - Mapping relationships
- `entity_comments_mapping` - Universal mapping table for comments to entities
- `units` - Units of measurement
- `cost_categories`, `detail_cost_categories` - Cost categorization
- `location` - Location/localization data
- `projects`, `blocks` - Project structure
- **Migration files**: `supabase.sql` and `sql/` directory

### Database Rules
- All tables MUST include `created_at` and `updated_at` fields
  - **EXCEPTION**: Mapping/junction tables (many-to-many relationships) should NOT have `created_at` and `updated_at` fields
- **Primary keys**: All tables should use UUID for primary keys (id field)
  - **EXCEPTION**: Legacy tables may use integer IDs during migration phase
- **Mapping table naming**: All mapping/junction tables MUST have `_mapping` suffix (e.g., `chessboard_mapping`, `entity_comments_mapping`)
- **NEVER use RLS (Row Level Security)** - handle auth in application layer
- Use optimistic locking via `updated_at` timestamp for concurrent edits

### API Pattern
Standard Supabase query pattern:
```typescript
const { data, error } = await supabase
  .from('table')
  .select('*, relation:table(*)')
  .order('created_at', { ascending: false });

if (error) {
  console.error('Operation failed:', error);
  throw error;
}
```

## Core Features

### Chessboard Component (`src/pages/documents/Chessboard.tsx`)
- Complex material tracking with Excel import
- Hierarchical filtering: Project → Block → Cost Category → Cost Type
- Real-time inline editing with optimistic locking
- Row coloring system for visual categorization
- Cascading dropdowns with automatic location assignment
- Column settings persistence in localStorage

### Excel Import Requirements
- Headers use fuzzy matching for: "материал", "кол", "ед" columns
- Support drag-and-drop upload up to 250 MB
- Store original files in Supabase Storage
- Import 5,000 rows ≤ 30 seconds (performance target)

### Real-time Collaboration
- Supabase Realtime WebSocket channels
- Optimistic locking for concurrent editing
- Conflict resolver: Merge/Overwrite/Rollback options
- Latency < 300ms for real-time sync

## Performance Requirements

From technical specification (`tech_task.md`):
- Import 5,000 Excel rows ≤ 30 seconds
- Render 10,000 rows ≤ 100ms
- Support 100 concurrent users
- Latency < 300ms for real-time sync
- 99.9% uptime target
- MTTR ≤ 5 minutes

## Critical Guidelines

### MUST DO
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

## UI/UX Guidelines
- **Mobile-first** design approach
- **WCAG 2.1 AA** accessibility compliance
- Modern, responsive UI with Ant Design 5/Vibe design system
- All tables MUST have sorting and filters in column headers
- Control elements in table rows should be icon-only (no text)
- Display page title in header on all new portal pages
- **Multi-language**: UI is in Russian, maintain Russian labels for user-facing elements

## Code Standards
- Component names: `PascalCase`
- Variables and functions: `camelCase`
- Use functional React components with hooks
- Data fetching via TanStack Query
- Auth state via Zustand store
- Follow existing patterns in codebase

## TypeScript Configuration
- Composite project with separate `tsconfig.app.json` and `tsconfig.node.json`
- Strict mode enabled with all strict checks
- Path aliases configured in both `tsconfig.app.json` and `vite.config.ts`
- Build info cached in `node_modules/.tmp/`
- Module resolution: bundler mode with ESNext modules

## Current Pages Structure

### Documents (`/documents/*`)
- Chessboard (`src/pages/documents/Chessboard.tsx`) - Complex material tracking with Excel import, filtering, and inline editing
- VOR (`src/pages/documents/Vor.tsx`) - Volume of work documentation
- Documentation (`src/pages/references/Documentation.tsx`) - Project documentation management with template "Document"

### References (`/references/*`)
- Units of measurement
- Cost categories
- Projects
- Locations

### Dashboard
- Analytics widgets for completed work

## Git Workflow
- Work in feature branches
- Submit changes via Pull Request
- Use Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)
- Update documentation as needed

## Deployment
- Frontend: GitHub Actions → Vercel
- Backend: Supabase Cloud
- Configure Sentry and Grafana Cloud for monitoring

## Additional Features
- Onboarding wizard for new users
- AI-powered suggestions (Codex integration)
- Analytics dashboard (win-rate, cost dynamics)
- Full action history logging

## Important Files
- `tech_task.md` - Technical specification with performance requirements
- `supabase.sql` - Database schema
- `sql/` - Migration scripts
- `.env.local` - Environment variables (contains actual Supabase credentials)
- `.mcp.json` - MCP server configuration for Claude Code database access

## UI Templates

### Шаблон "Документ" (Document Template)

Применяется для страниц категории справочников и документов. При указании использовать "шаблон Документ", применяются следующие требования:

#### 1. Структура страницы
- **Заголовок страницы** отображается в верхней части
- **Два блока фильтров** под шапкой:
  - **Статичный блок** - основные фильтры (проект, корпус и т.д.), всегда видимый
  - **Скрываемый блок** - дополнительные фильтры с кнопкой свернуть/развернуть
- **Таблица данных** - основное содержимое страницы

#### 2. Режимы работы таблицы
- **Режим просмотра** (view) - отображение данных
- **Режим добавления** (add) - добавление новых строк
- **Режим редактирования** (edit) - inline редактирование существующих строк
- **Режим удаления** (delete) - массовое удаление с чекбоксами в первом столбце
- **Массовое редактирование** - одновременное редактирование нескольких строк

#### 3. Функциональность строк
- **Добавление строки** - кнопка "+" или "Добавить строку"
- **Копирование строки** - иконка копирования в столбце действий (только иконка, без текста)
- **Редактирование** - inline редактирование по клику на кнопку редактирования (только иконка, без текста)
- **Удаление** - единичное через иконку или массовое в режиме удаления (только иконка, без текста)
- **Цветовая маркировка** - выбор цвета строки через color picker в левой части

#### 4. Сохранение изменений
- **Кнопка "Сохранить"** - сохранение всех изменений разом (появляется вместо кнопок Добавить/Удалить)
- **Кнопка "Отмена"** - отмена всех несохраненных изменений
- **Режимная логика кнопок**:
  - В режиме добавления: Сохранить/Отмена
  - В режиме редактирования: Сохранить/Отмена (вместо Добавить/Удалить)
  - В режиме удаления: Удалить(N)/Отмена
- **Условия отображения кнопок**:
  - **Кнопка "Удалить"** показывается только после выбора проекта и применения фильтров (`appliedFilters.project_id`)
  - **Кнопка "Отмена"** в режиме удаления также требует выбранного проекта
- **Обработка конфликтов** - диалог при конфликте уникальных полей

#### 5. Настройка столбцов
- **Кнопка "Настройка столбцов"** в правой части скрываемого блока фильтров
- **Стиль кнопки**: Обычная кнопка с иконкой (без `type="primary"` и `title`)
- **Расположение**: В правой части блока с помощью `justify-content: space-between`
- **Drawer справа** с шириной 350px, точно как в Шахматке
- **Функции настройки**:
  - **Чекбокс "Выделить все"** - массовое включение/отключение всех столбцов
  - **Кнопка "По умолчанию"** - сброс к исходным настройкам
  - **Список столбцов** с чекбоксами для включения/отключения видимости
  - **Стрелки вверх/вниз** для изменения порядка столбцов
  - Служебные столбцы (checkbox, actions) не управляются через настройки
- **Сохранение в localStorage**:
  - `{page-name}-column-visibility` - видимость столбцов
  - `{page-name}-column-order` - порядок столбцов
  - Автоматическое восстановление при следующем посещении страницы

#### 6. Пагинация
- **По умолчанию**: 100 строк на странице
- **Варианты выбора**: 10, 20, 50, 100, 200, 500 строк
- **Сохранение выбора** в localStorage

#### 7. Закрепление элементов
- **Sticky заголовок таблицы** - не уезжает при вертикальном скролле
- **Блок фильтров** остается видимым при прокрутке
- **Меню и шапка сайта** закреплены
- **Горизонтальный и вертикальный скролл** таблицы с высотой calc(100vh - 300px)

#### 8. Импорт/Экспорт
- **Импорт из Excel** через drag-and-drop или выбор файла
- **Обработка конфликтов** при импорте
- **Экспорт в Excel** текущих отфильтрованных данных

#### 9. Технические требования
```typescript
// Структура компонента
interface DocumentTemplateProps {
  // Основные данные
  data: any[]
  loading: boolean
  
  // Фильтры
  filters: Record<string, any>
  onFiltersChange: (filters: Record<string, any>) => void
  
  // Режимы
  mode: 'view' | 'add' | 'edit' | 'delete'
  
  // Колбэки
  onSave: (rows: any[]) => Promise<void>
  onDelete: (ids: string[]) => Promise<void>
  onImport: (data: any[]) => Promise<void>
}

// Состояния для управления столбцами
const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({})
const [columnOrder, setColumnOrder] = useState<string[]>([])

// Функции управления столбцами  
const toggleColumnVisibility = (key: string) => void
const selectAllColumns = (select: boolean, allColumns: Array<{key: string, title: string}>) => void
const resetToDefaults = (allColumns: Array<{key: string, title: string}>) => void
const moveColumn = (key: string, direction: 'up' | 'down') => void

// Сохранение настроек в localStorage
localStorage.setItem('{page-name}-column-visibility', JSON.stringify(columnVisibility))
localStorage.setItem('{page-name}-column-order', JSON.stringify(columnOrder))
```

#### 10. Стили и верстка
- **Ant Design компоненты** для единообразия
- **Responsive дизайн** с адаптацией под разные экраны
- **Минимальная высота таблицы**: calc(100vh - 300px)
- **Размер кнопок**: Стандартный размер (без указания size="large") для всех кнопок включая "Добавить", для соответствия странице Шахматка
- **Кнопки в столбце "Действия"**: Только иконки без текста (title/tooltip разрешен)
- **Цветовая схема строк**:
  - green: #d9f7be
  - yellow: #fff1b8
  - blue: #e6f7ff
  - red: #ffa39e

#### Пример использования шаблона

При создании новой страницы с применением шаблона "Документ":

1. Копировать структуру из `src/pages/documents/Chessboard.tsx`
2. Адаптировать под конкретную сущность
3. Сохранять все принципы работы с данными
4. Использовать единые паттерны для фильтров и действий

## Important Notes
- Excel import headers are flexible - use fuzzy matching
- Cascading logic: When cost category changes, reset cost type and location
- Row operations: Support add, copy, edit, delete with proper state management
- Filtering: Applied filters persist through mode changes (view/add/edit)
- Column settings saved in localStorage for persistence across sessions
- При применении шаблона "Документ" все компоненты страницы должны следовать описанным выше принципам