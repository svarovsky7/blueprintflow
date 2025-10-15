# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick Start

BlueprintFlow — портал для анализа рабочей документации и сметного отдела строительного генподрядчика.

**Ключевые команды:**
```bash
npm run dev          # http://192.168.8.75:5173 (network accessible)
npm run dev:local    # http://localhost:5173 (localhost only)
npm run build        # Build + type check (MUST pass before commit)
npm run lint         # ESLint (MUST pass before commit)
npx playwright test  # E2E tests
```

## Language & Development Mode

**Язык общения:** Все ответы, комментарии и диалоги на русском языке. Код и технические термины на английском.

**Automated Mode:** Используй флаг `-dangerously-skip-permissions` для автоматического выполнения команд без запросов разрешений.

**Plan Mode:** В режиме планирования план должен выдаваться БЕЗ кода. Вместо примеров кода используй ТОЛЬКО общий алгоритм действий в виде текстового описания шагов. Примеры кода можно показывать ТОЛЬКО после подтверждения плана пользователем и выхода из режима планирования.

## Common Development Commands

```bash
# Development
npm install           # Install dependencies
npm run dev          # Start dev server (http://192.168.8.75:5173, доступен по локальной сети)
npm run dev:local    # Start local dev server (http://localhost:5173, только localhost)
npm run preview      # Preview production build

# Multiple Dev Servers (одновременно)
# Terminal 1:
npm run dev          # Network accessible: http://192.168.8.75:5173
# Terminal 2:
npm run dev:local    # Localhost only: http://localhost:5173

# Build & Quality
npm run build        # TypeScript check + Vite build (MUST pass before commit)
npm run lint         # ESLint check (MUST pass before commit)
npm run format       # Prettier formatting
npm run format:check # Check formatting without changes
npx tsc --noEmit     # Type checking only (standalone)

# Testing
npx playwright test  # Run end-to-end tests (base URL: http://localhost:5173)
npx playwright test --ui  # Run tests with UI mode
npx playwright show-report  # Open test results in browser

# Single test examples
npx playwright test tests/auth.spec.js  # Run specific test file
npx playwright test --grep "login"      # Run tests matching pattern
npx playwright test --debug             # Run in debug mode

# Override base URL for testing
BASE_URL=http://localhost:5180 npx playwright test  # Test against different port
```

## Pre-commit Checklist
1. Run `npm run lint` and fix all warnings
2. Run `npm run format` to ensure consistent formatting
3. Run `npm run build` and ensure project builds successfully
4. Run `npx playwright test` if changes affect UI (requires setup - optional but recommended)
5. Follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

## Architecture Overview

### Tech Stack
- **Frontend**: React 18.3, TypeScript ~5.8.3 (strict mode), Vite 7.0
- **UI Library**: Ant Design 5.20+ with Ant Design Charts 2.6+ for visualization
- **State Management**: TanStack Query 5.59+ (server state), Zustand 5.0+ (auth state)
- **Backend**: Supabase 2.47+ (PostgreSQL, Auth, Storage, Edge Functions, Realtime WebSocket)
- **Authentication**: Supabase Auth with OAuth 2.0 (Google, Microsoft) and MFA support
- **Excel Processing**: xlsx 0.18+ library for import/export
- **Utilities**: Day.js 1.11+ for dates
- **Routing**: React Router DOM 6.27+
- **Virtualization**: TanStack React Virtual 3.13+, React Window 1.8+ for large datasets
- **Testing**: Playwright 1.55+ for end-to-end testing
- **Development**: ESLint 9.30+, Prettier 3.6+, dotenv for environment management

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

**Note**: The project is in transition to FSD architecture. Current entities include: api-settings, calculation, chessboard, comments, disk, documentation, documentation-tags, finishing, materials, ml, permissions, portal-objects, projects, rates, roles, rooms, statuses, units, user-groups, users, and vor.

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

### Key Directories
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

## Core Features

### Chessboard Component (`src/pages/documents/Chessboard.tsx`)
- Complex material tracking with Excel import
- Hierarchical filtering: Project → Block → Cost Category → Cost Type
- Real-time inline editing with optimistic locking
- Row coloring system for visual categorization
- Cascading dropdowns with automatic location assignment
- Column settings persistence in localStorage

#### Изменение ширины столбцов

Ширина столбцов автоматически масштабируется для разных scale (0.7, 0.8, 0.9, 1.0). Используйте `COLUMN_WIDTH_CONFIG_BASE` в `ChessboardTable.tsx` и функцию `increaseColumnWidth(baseWidth, percentage)` для правильного расчёта.

**Детальная инструкция:** См. [docs/CODE_PATTERNS.md#изменение-ширины-столбцов-в-chessboard](docs/CODE_PATTERNS.md#изменение-ширины-столбцов-в-chessboard)

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

## Database Integration

**КРИТИЧЕСКИ ВАЖНО**: Перед любой работой с базой данных:
1. **СНАЧАЛА** используй MCP-сервер `mcp-supabase` для проверки актуальной схемы
2. **ЗАТЕМ** пиши SQL-запросы или API-вызовы на основе реальной структуры
3. **РЕЗЕРВНЫЙ ВАРИАНТ**: При недоступности MCP → используй `supabase/schemas/prod.sql`

**Почему это критически важно:**
- Схема БД может измениться с момента последнего обновления файла
- MCP даёт актуальную структуру таблиц, полей, связей и индексов
- Избежание ошибок из-за несуществующих полей или неправильных типов данных

**Доступные MCP-серверы:**
- `mcp-supabase` — основной сервер для работы со схемой Supabase БД
- `supabase-mcp` — дополнительный сервер для CRUD операций
- `context7` — управление контекстом в многоагентных процессах
- `brightdata` — веб-скрапинг и получение данных из интернета

**Проверка доступности MCP-серверов:**
```bash
# Список всех доступных MCP-инструментов
mcp list-tools

# Проверка конкретного сервера (если настроен)
npx @modelcontextprotocol/cli list-servers
```

### Supabase Configuration
Environment variables required in `.env`:
```env
VITE_SUPABASE_URL=<your_supabase_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<fallback_key>  # Optional fallback key
VITE_STORAGE_BUCKET=<storage_url>
```

**ВАЖНО**: Реальные credentials хранятся в `.env` файле (не в git). Для получения актуальных значений обратитесь к владельцу проекта.

Configuration: `src/lib/supabase.ts`

### MCP Tools Usage

**Рабочий процесс с БД**:
1. **Проверка схемы таблицы** через MCP-инструмент `mcp-supabase`
   - Получить список всех таблиц
   - Получить структуру конкретной таблицы (поля, типы данных)
   - Проверить связи между таблицами (foreign keys)
   - Получить информацию о индексах и ограничениях
2. **Анализ структуры** перед написанием кода
3. **Написание кода** с учетом актуальной структуры БД

**Практический пример:**
```typescript
// СЦЕНАРИЙ: Нужно написать запрос к таблице chessboard
// ШАГ 1: Используй MCP-инструмент для получения структуры таблицы chessboard
// ШАГ 2: Проверь наличие полей: project_id, material, quantity, unit_id
// ШАГ 3: Проверь связи: foreign key к таблицам projects, materials, units
// ШАГ 4: Пиши запрос на основе актуальной структуры

const { data, error } = await supabase
  .from('chessboard')
  .select(`
    *,
    projects(name),
    materials(name),
    units(name)
  `)
  .eq('project_id', projectId);
```

### Database Deployment
Deploy database schema:
```bash
# For production-like setup (full schema with all features):
psql "$DATABASE_URL" -f supabase/schemas/prod.sql

# For development (simplified schema):
psql "$DATABASE_URL" -f supabase.sql

# Note: sql/ directory contains additional migration files if present
for file in sql/*.sql; do psql "$DATABASE_URL" -f "$file"; done
```

### Core Tables
- `chessboard` - Main data table for material tracking
- `chessboard_mapping` - Mapping relationships between chessboard and categories/locations
- `chessboard_sets` - Chessboard sets for documentation organization
- `chessboard_sets_documents_mapping` - Mapping between chessboard sets and documents
- `work_sets` - Work sets (normalized structure, replaces string field in old rates)
- `work_set_rates` - Rates within work sets
- `work_set_rates_categories_mapping` - Mapping between rates and cost categories
- `finishing_pie_mapping` - Finishing pie types with color marking support
- `type_calculation_mapping` - Type calculations with color marking support
- `units` - Units of measurement
- `cost_categories`, `detail_cost_categories` - Cost categorization
- `location` - Location/localization data
- `projects`, `blocks` - Project structure with `projects_blocks` mapping
- `documentation` - Document management with versioning
- `materials` - Materials catalog
- `rates` (deprecated, use work_set_rates) - Old rate management structure
- **Schema files**: `supabase/schemas/prod.sql` (production) and `supabase.sql` (development)

### Key Architectural Decisions

#### 1. Database Normalization: rates → work_sets (October 2025)

**Проблема:** Таблица `rates` хранила `work_set` как строковое поле, что приводило к:
- Дублированию названий наборов работ
- Невозможности управлять наборами централизованно
- Сложности при фильтрации и группировке

**Решение:** Нормализация структуры
- Создана таблица `work_sets` (id, name, active)
- Таблица `work_set_rates` использует FK на work_sets
- Маппинг категорий затрат перенесен в `work_set_rates_categories_mapping`

**Миграция:**
- Старые типы помечены @deprecated в `src/entities/rates/model/types.ts`
- Обратная совместимость сохранена на уровне типов
- Новые API файлы: `work-sets-api.ts`, `work-set-rates-api.ts`, `work-set-rates-form-api.ts`

**SQL миграция:** См. `sql/` директорию для миграционных скриптов

#### 2. Row Color Marking System (October 2025)

**Задача:** Расширить систему цветовой маркировки строк с Chessboard на другие документы.

**Реализованные страницы:**
- `FinishingPieType.tsx` - Типы пирога отделки
- `FinishingCalculation.tsx` - Расчет по типам
- `Chessboard.tsx` - Шахматка (reference implementation)

**Техническое решение:**
- Добавлен столбец `color` в таблицы `finishing_pie_mapping` и `type_calculation_mapping`
- Тип данных: `text` с допустимыми значениями: '', 'green', 'yellow', 'blue', 'red'
- SQL миграция: `sql/add_color_column_to_finishing_tables.sql`

**Цветовая схема:**

| Цвет | Базовый HEX | Hover HEX | Назначение |
|------|-------------|-----------|------------|
| green | #d9f7be | #b7eb8f | Обычно: завершенные/проверенные |
| yellow | #fff1b8 | #ffe58f | Обычно: в работе/требует внимания |
| blue | #e6f7ff | #bae7ff | Обычно: информационные |
| red | #ffa39e | #ff7875 | Обычно: проблемные/критичные |

**UI Implementation Pattern:**
```typescript
// rowClassName в Table компоненте
rowClassName={(record) => {
  const classes: string[] = []
  if (record.color) {
    classes.push(`row-color-${record.color}`)
  }
  if (isEditing(record)) {
    classes.push('editing-row')
  }
  return classes.join(' ')
}}
```

**CSS Location:** `src/index.css` (строки 252-284)

**КРИТИЧЕСКИ ВАЖНО:**
- НЕ используйте inline styles через `onRow`/`onCell` для цветов
- Inline styles блокируют CSS hover псевдо-селекторы
- Всегда используйте CSS классы `row-color-{color}`

#### 3. Chessboard Mapping Tables Structure

**Актуальные маппинг таблицы:**
- `chessboard_sets_documents_mapping` - Связь наборов с документами (многие-ко-многим)

**Устаревшие/неиспользуемые:**
- `chessboard_documentation_mapping` - упоминается в старом коде
- `chessboard_floor_mapping` - упоминается в старом коде
- `chessboard_rates_mapping` - упоминается в старом коде

**Примечание:** Проверить наличие этих таблиц через MCP перед использованием в новом коде.

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

### Complex Entity Relations
Entities may have multiple API files for different concerns:
- `entity-api.ts` - Main CRUD operations
- `entity-sets-api.ts` - Set/collection management
- `entity-mapping-api.ts` - Relationship management
- `entity-status-api.ts` - Status-specific operations
- `entity-cascade-api.ts` - Cascading updates and hierarchical operations
- `entity-multi-docs-api.ts` - Multi-document operations
- `vor-materials-api.ts`, `vor-works-api.ts` - VOR sub-entities management
- `work-sets-api.ts` - Work sets management (rates entity, post-refactoring)
- `work-set-rates-api.ts` - Work set rates CRUD operations (rates entity, post-refactoring)
- `work-set-rates-form-api.ts` - Form-specific operations for rates (rates entity, post-refactoring)

## Performance Requirements

From technical specification (`tech_task.md`):
- Import 5,000 Excel rows ≤ 30 seconds
- Render 10,000 rows ≤ 100ms
- Support 100 concurrent users
- Latency < 300ms for real-time sync
- 99.9% uptime target
- MTTR ≤ 5 minutes
- File upload support up to 250 MB with drag-and-drop

## Critical Guidelines

### MUST DO
- **КРИТИЧЕСКИ ВАЖНО**: Перед любой работой с БД используй MCP сервер для проверки актуальной схемы
- **КРИТИЧЕСКИ ВАЖНО**: При добавлении кода для логирования ОБЯЗАТЕЛЬНО указывать в комментариях, что строки относятся к логгированию (например: `// LOG: отладочная информация`, `// DEBUG LOG: проверка состояния`, `console.log('🔍 Loading data...') // LOG`). Это необходимо для безопасного удаления логов без случайного удаления рабочего кода
- **КРИТИЧЕСКИ ВАЖНО**: Максимальный размер файла 600 строк - разбивай большие файлы на компоненты, хуки, утилиты и модули
- **КРИТИЧЕСКИ ВАЖНО**: Все SQL файлы ОБЯЗАТЕЛЬНО сохранять в папку `sql/` - НИКОГДА не размещай SQL файлы в корневой папке или других директориях
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

### Filter Components Requirements

**All Select components in filters MUST include:**
- `allowClear` - кнопка X для очистки
- `showSearch` - поиск по вводу
- `filterOption` - кастомная функция фильтрации для русского языка

**Детальные примеры и паттерны:** См. [docs/CODE_PATTERNS.md#компоненты-фильтров](docs/CODE_PATTERNS.md#компоненты-фильтров)

## Code Standards
- Component names: `PascalCase`
- Variables and functions: `camelCase`
- Use functional React components with hooks
- Data fetching via TanStack Query
- Auth state via Zustand store
- Follow existing patterns in codebase
- **Maximum file size**: 600 lines per file - break large files into smaller components and modules

### File Size Management
- **600 lines maximum** per file for optimal maintainability and performance
- **Decomposition strategies**:
  - Split large components into smaller sub-components
  - Extract custom hooks for complex logic
  - Move utility functions to separate modules
  - Create dedicated types files for complex interfaces
  - Use composition pattern instead of inheritance
  - Extract constants and configuration to separate files

### Code Style Configuration
- **Print width**: 100 characters
- **Semicolons**: Disabled (semi: false)
- **Trailing commas**: All (es5, es2017, es2020)
- **Quotes**: Single quotes, double quotes for JSX
- **Indentation**: 2 spaces, no tabs
- **Line endings**: LF for cross-platform compatibility
- **Bracket spacing**: Enabled
- **Arrow parens**: Always

## TypeScript Configuration
- Composite project with separate `tsconfig.app.json` and `tsconfig.node.json`
- Strict mode enabled with all strict checks
- Path aliases configured in both `tsconfig.app.json` and `vite.config.ts`
- Build info cached in `node_modules/.tmp/`
- Module resolution: bundler mode with ESNext modules

## Error Handling Pattern

**Стандартный подход к обработке ошибок:**
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

**Ключевые принципы:**
- Всегда проверяй `error` в Supabase response
- Логируй ошибки в консоль для отладки
- Показывай пользователю понятное сообщение через `message.error()`
- Пробрасывай ошибку дальше для обработки в TanStack Query

## UI Templates

### Шаблон "Документ" (Document Template)

Стандартизированный шаблон для страниц справочников и документов (Шахматка, ВОР, Расценки).

**Основные компоненты:**
- Заголовок страницы
- Два блока фильтров (статичный + скрываемый)
- Таблица с режимами: view/add/edit/delete
- Функциональность строк: добавление, копирование, редактирование, удаление, цветовая маркировка
- Настройка столбцов с сохранением в localStorage
- Пагинация (по умолчанию 100 строк)
- Импорт/Экспорт Excel

**Цветовая схема:** green (#d9f7be), yellow (#fff1b8), blue (#e6f7ff), red (#ffa39e)

**Hover эффекты для цветных строк:**
- green: #d9f7be → #b7eb8f (при наведении)
- yellow: #fff1b8 → #ffe58f (при наведении)
- blue: #e6f7ff → #bae7ff (при наведении)
- red: #ffa39e → #ff7875 (при наведении)

**Реализация:** CSS классы в `src/index.css` (строки 252-284).
**Важно:** НЕ использовать inline styles - они блокируют hover эффекты.

**Полное описание и примеры кода:** См. [docs/CODE_PATTERNS.md#шаблон-страницы-документ](docs/CODE_PATTERNS.md#шаблон-страницы-документ)

**Референс:** `src/pages/documents/Chessboard.tsx`

## Table Scroll Configuration

**КРИТИЧЕСКИ ВАЖНО:** Правильная настройка прокрутки для предотвращения двойного скролла.

**Ключевые правила:**
1. Главный контейнер: `height: calc(100vh - 96px)`, `overflow: hidden`
2. Контейнер таблицы: `flex: 1`, `overflow: hidden` (НЕ auto!), `minHeight: 0`
3. Table: `sticky`, `scroll.y: calc(100vh - 300px)` (фиксированная высота)

**Адаптивный расчёт высоты:** Обязательно учитывать ВСЕ элементы страницы - header приложения, заголовки таблицы, Summary строку, borders и padding.

**Полное руководство с примерами:** См. [docs/CODE_PATTERNS.md#настройка-прокрутки-предотвращение-двойного-скролла](docs/CODE_PATTERNS.md#настройка-прокрутки-предотвращение-двойного-скролла) и [docs/CODE_PATTERNS.md#адаптивный-расчёт-высоты-таблицы](docs/CODE_PATTERNS.md#адаптивный-расчёт-высоты-таблицы)

## Specialized Agents

Проект включает специализированных агентов для решения сложных задач. Агенты находятся в папке `agents/`:

### Доступные агенты и когда их использовать:

**Frontend:**
- **frontend-developer.md** — Разработка React компонентов, создание новых страниц
  - *Используй когда:* Создание новой страницы с таблицей и фильтрами, сложный UI компонент
- **ui-ux-designer.md** — Проектирование интерфейсов, UX-решения
  - *Используй когда:* Разработка нового шаблона страницы, улучшение UX существующих компонентов

**Backend & Database:**
- **backend-architect.md** — Проектирование API endpoints, схем БД, архитектурные решения
  - *Используй когда:* Проектирование новой таблицы с множественными связями, дизайн API
- **sql-pro.md** — Сложные SQL-запросы, JOIN, подзапросы, агрегация
  - *Используй когда:* Написание запроса с 3+ JOIN, оконные функции, сложные фильтры
- **database-optimizer.md** — Оптимизация производительности БД, индексы, query tuning
  - *Используй когда:* Анализ медленных запросов, создание индексов, оптимизация N+1

**Development:**
- **typescript-pro.md** — Сложные типы TypeScript, дженерики, utility types
  - *Используй когда:* Создание типобезопасного API клиента, сложные conditional types
- **debugger.md** — Отладка сложных ошибок, анализ багов, тестирование
  - *Используй когда:* Поиск причины race condition, memory leak, непонятная ошибка

**Other:**
- **docs-architect.md** — Создание технической документации
- **context-manager.md** — Управление контекстом в многоагентных процессах

### Правила использования агентов:
1. **При сложных задачах** — используй специализированных агентов (новая страница → frontend-developer, сложный SQL → sql-pro)
2. **После двух неудачных попыток** — ОБЯЗАТЕЛЬНО используй подходящего агента
3. **По запросу пользователя** — всегда используй агентов, если пользователь явно просит
4. **Проактивно** — используй агентов помеченных как "Use PROACTIVELY" без явного запроса

## Структура папок и временные файлы

### Папка temp/ - ТОЛЬКО временные файлы
- **КРИТИЧЕСКИ ВАЖНО**: В папке `temp/` должны находиться ТОЛЬКО временные файлы, которые можно безопасно удалить в конце рабочего дня
- **Типы файлов для temp/**:
  - Файлы с описаниями изменений (DEVELOPMENT_NOTES.md, CHANGELOG.md и т.д.)
  - Технические заметки и черновики
  - Файлы с временными данными для анализа
  - Экспериментальные скрипты и тестовые файлы
  - Отладочные файлы

### Папка tests/ - постоянные тесты
- **Все постоянные тесты** должны размещаться в папке `tests/`
- **НИКОГДА** не сохраняйте тесты в папку `temp/`
- Примеры: `tests/chessboard-simple.spec.ts`, `tests/auth.spec.js`

### Папка sql/ - SQL-запросы и миграции
- **Все SQL-запросы для изменения БД** должны сохраняться в папку `sql/`
- **НИКОГДА** не размещайте SQL файлы в корневой папке или `temp/`
- Миграции, создание таблиц, изменения схемы БД - всё в `sql/`

### Что НЕ относится к временным файлам (НЕ в temp/)
- **SQL-запросы и миграции** (`sql/*.sql`) - постоянные файлы в папке `sql/`
- **Тесты** (`tests/*.spec.*`) - постоянные файлы в папке `tests/`
- **Конфигурации** (`.eslintrc`, `tsconfig.json` и т.д.) - постоянные файлы
- **Основной код** (`src/**/*`) - постоянные файлы
- **Документация проекта** (README.md, CLAUDE.md) - постоянные файлы

### Очистка временных файлов
- Папка `temp/` может быть полностью очищена в конце рабочего дня
- Перед удалением любых файлов ВСЕГДА согласовывайте список с пользователем
- **ПРАВИЛО**: Если файл нужен на следующий день - он НЕ должен быть в `temp/`

## Testing Configuration

### Playwright E2E Testing
Configuration file: `playwright.config.js`

**Key settings:**
- **Base URL**: http://localhost:5173 (auto-configured, can override with BASE_URL env var)
- **Test directory**: `./tests`
- **Browsers**: Chromium, Firefox, WebKit (configurable in playwright.config.js)
- **Auto-start dev server**: Uses `npm run dev:local` command with 120s timeout
- **Web server URL**: http://localhost:5173 (auto-configured in playwright.config.js)
- **Reporters**: HTML report with screenshots and videos on failure
- **Parallel execution**: Enabled for faster test runs (`fullyParallel: true`)
- **Retry logic**: 2 retries on CI, 0 retries locally
- **Workers**: 1 worker on CI, unlimited locally

**Writing tests:**
- Place all test files in `tests/` directory with `.spec.ts` or `.spec.js` extension
- Use descriptive test names that explain what is being tested
- Include authentication tests before testing protected routes
- Use `page.goto()` with relative paths (base URL is auto-configured)

## Application Structure Notes

### Multi-Select Filter Support
In the Chessboard component, all filters except "Проект" (Project) support multiple selection. The project filter remains single-select as it's the primary filter that determines data scope. All other filters (Корпус, Категория затрат, Вид затрат, Раздел, Шифр документа) should allow users to select multiple values for more flexible data filtering.

### Entity Pattern
All entities follow the same structure:
- `api/entity-name-api.ts` - API functions for server communication
- `model/types.ts` - TypeScript types and interfaces
- `index.ts` - Public API exports

### Context Providers
- `LogoContext` - Manages light and dark theme logos with localStorage persistence
- `ScaleContext` - Handles UI scaling for responsive design

## Important Notes
- Excel import headers are flexible - use fuzzy matching
- Cascading logic: When cost category changes, reset cost type and location
- Row operations: Support add, copy, edit, delete with proper state management
- Filtering: Applied filters persist through mode changes (view/add/edit)
- Column settings saved in localStorage for persistence across sessions
- При применении шаблона "Документ" все компоненты страницы должны следовать описанным выше принципам
- НИКОГДА не используйте `scroll.y` в Table компоненте для управления высотой - используйте CSS контейнеры
- Цветовая маркировка строк: используй CSS классы `row-color-{color}`, НЕ inline styles
- Таблицы с поддержкой цветов: chessboard, finishing_pie_mapping, type_calculation_mapping
- При добавлении цветовой маркировки на новые страницы: добавь столбец `color text` в таблицу БД

## Dropdown Best Practices (КРИТИЧЕСКИ ВАЖНО)

**Проблема:** Dropdown в ячейках таблицы обрезаются нижними строками.

**Главная причина:** Использование `getPopupContainer` в Select компонентах внутри таблиц.

**Ключевые правила:**
1. НИКОГДА не используйте `getPopupContainer` в Select внутри таблиц
2. Всегда используйте высокий z-index (9999)
3. Применяйте динамическое расширение через `getDynamicDropdownStyle`
4. Максимальная ширина dropdown: 500px, минимальная: 150px

**Полное руководство с примерами кода:** См. [docs/CODE_PATTERNS.md#dropdown-в-таблицах](docs/CODE_PATTERNS.md#dropdown-в-таблицах)