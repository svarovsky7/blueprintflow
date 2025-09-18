# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Language Requirements

**ВАЖНО**: Все ответы, комментарии, сообщения об ошибках, диалоги и любое другое общение с пользователем должно быть на русском языке. Код и технические термины остаются на английском.

## Automated Development Mode

**ВАЖНО**: Для максимально автоматической разработки всегда используй флаг `-dangerously-skip-permissions` при запуске обработки запросов. Это позволяет Claude Code автоматически выполнять команды без запроса разрешений пользователя, что значительно ускоряет процесс разработки.

## Common Development Commands

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
npx tsc --noEmit     # Type checking only (standalone)

# Testing
npx playwright test  # Run end-to-end tests (base URL: http://localhost:5174)
npx playwright test --ui  # Run tests with UI mode
npx playwright show-report  # Open test results in browser

# Single test examples
npx playwright test tests/auth.spec.js  # Run specific test file
npx playwright test --grep "login"      # Run tests matching pattern
npx playwright test --debug             # Run in debug mode
```

## Pre-commit Checklist
1. Run `npm run lint` and fix all warnings
2. Run `npm run format` to ensure consistent formatting
3. Run `npm run build` and ensure project builds successfully
4. Run `npx playwright test` if changes affect UI (requires setup - optional but recommended)
5. Follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

## Architecture Overview

### Tech Stack
- **Frontend**: React 18.3, TypeScript 5.8+ (strict mode), Vite 7.0
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

**Note**: The project is in transition to FSD architecture. Current entities include: chessboard, disk, documentation, documentation-tags, materials, rates, and statuses.

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
- `src/entities/` - Domain entities (chessboard, disk, documentation, documentation-tags, materials, rates, statuses)
- `src/pages/` - Main application pages organized by sections (admin/, documents/, references/, reports/)
- `src/features/auth/` - Authentication logic using Supabase
- `src/shared/contexts/` - React contexts for global state (LogoContext, ScaleContext)
- `src/lib/supabase.ts` - Supabase client configuration  
- `src/components/` - Legacy UI components being migrated to FSD structure

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

## Database Integration

**CRITICAL**: Перед любой работой с базой данных ОБЯЗАТЕЛЬНО используй MCP серверы для проверки актуальной схемы БД. Установлены MCP серверы:
- `mcp-supabase` - основной сервер для работы со схемой Supabase БД
- `supabase-mcp` - дополнительный сервер для CRUD операций
- `context7` - управление контекстом и состоянием в многоагентных процессах
- `brightdata` - веб-скрапинг и получение данных из интернета

**ПРАВИЛО**: Всегда сначала проверяй актуальную структуру таблиц через MCP инструменты, прежде чем писать SQL-запросы или API-вызовы.

**РЕЗЕРВНЫЙ ИСТОЧНИК**: При отсутствии доступа к MCP - reference `supabase/schemas/prod.sql` for current production database structure. The `supabase.sql` file contains a simplified development schema.

### Supabase Configuration
Environment variables required:
```env
VITE_SUPABASE_URL=https://hfqgcaxmufzitdfafdlp.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmcWdjYXhtdWZ6aXRkZmFmZGxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ4OTI5MjMsImV4cCI6MjA3MDQ2ODkyM30.XnOEKdwZdJM-DilhrjZ7PdzHU2rx3L72oQ1rJYo5pXc
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<fallback_key>  # Optional fallback key
VITE_STORAGE_BUCKET=<storage_url>
```

Configuration: `src/lib/supabase.ts`

### MCP Tools Usage

Перед работой с БД используй MCP инструменты для получения актуальной схемы:

```typescript
// Примеры использования MCP инструментов:
// 1. Получить список всех таблиц
// 2. Получить структуру конкретной таблицы
// 3. Проверить существование полей и связей
// 4. Получить информацию о индексах и ограничениях
```

**Рабочий процесс с БД**:
1. Используй MCP инструмент для проверки схемы таблицы
2. Анализируй структуру полей и типов данных
3. Проверяй связи между таблицами
4. Пиши код с учетом актуальной структуры БД

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
- `chessboard_documentation_mapping`, `chessboard_floor_mapping`, `chessboard_rates_mapping` - Additional mapping tables
- `units` - Units of measurement
- `cost_categories`, `detail_cost_categories` - Cost categorization
- `location` - Location/localization data
- `projects`, `blocks` - Project structure with `projects_blocks` mapping
- `documentation` - Document management with versioning
- `materials` - Materials catalog
- `rates` - Rate management with cost categories
- **Schema files**: `supabase/schemas/prod.sql` (production) and `supabase.sql` (development)

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
- **All Select components in filters MUST include:**
  - `allowClear` - enables X button to clear selection
  - `showSearch` - enables search by typing
  - `filterOption` - custom filter function for Russian text support

```typescript
// Standard filter Select component pattern
<Select
  placeholder="Выберите значение"
  allowClear
  showSearch
  filterOption={(input, option) => {
    const text = (option?.children || option?.label)?.toString() || ""
    return text.toLowerCase().includes(input.toLowerCase())
  }}
  // ... other props
>
  {options.map(item => (
    <Select.Option key={item.id} value={item.id}>
      {item.name}
    </Select.Option>
  ))}
</Select>
```

**Note:** For Select with `options` prop, use `option?.label`. For `Select.Option` children, use `option?.children`.

## Code Standards
- Component names: `PascalCase`
- Variables and functions: `camelCase`
- Use functional React components with hooks
- Data fetching via TanStack Query
- Auth state via Zustand store
- Follow existing patterns in codebase

### Code Style Configuration
- **Print width**: 100 characters
- **Semicolons**: Disabled (semi: false)
- **Trailing commas**: All (es5, es2017, es2020)
- **Quotes**: Single quotes, double quotes for JSX
- **Indentation**: 2 spaces, no tabs
- **Line endings**: LF for cross-platform compatibility

## TypeScript Configuration
- Composite project with separate `tsconfig.app.json` and `tsconfig.node.json`
- Strict mode enabled with all strict checks
- Path aliases configured in both `tsconfig.app.json` and `vite.config.ts`
- Build info cached in `node_modules/.tmp/`
- Module resolution: bundler mode with ESNext modules

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

#### 9. Цветовая схема строк:
- green: #d9f7be
- yellow: #fff1b8
- blue: #e6f7ff
- red: #ffa39e

### Пример использования шаблона

При создании новой страницы с применением шаблона "Документ":

1. Копировать структуру из `src/pages/documents/Chessboard.tsx`
2. Адаптировать под конкретную сущность
3. Сохранять все принципы работы с данными
4. Использовать единые паттерны для фильтров и действий

## Table Scroll Configuration

### КРИТИЧЕСКИ ВАЖНО: Правильная настройка прокрутки для предотвращения двойного скролла

При создании страниц с таблицами **ОБЯЗАТЕЛЬНО** используйте следующую структуру для предотвращения двойного вертикального скролла:

#### Правильная структура (ИСПОЛЬЗОВАТЬ ВСЕГДА):

```tsx
// Главный контейнер страницы - фиксированная высота
<div style={{ 
  height: 'calc(100vh - 96px)', // 96px = высота header + отступы
  display: 'flex', 
  flexDirection: 'column',
  overflow: 'hidden'  // ВАЖНО: предотвращает скролл страницы
}}>
  // Секция фильтров - не сжимается
  <div style={{ flexShrink: 0, paddingBottom: 16 }}>
    {/* Фильтры и управляющие элементы */}
  </div>
  
  // Контейнер таблицы - занимает оставшееся пространство
  <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>  // ВАЖНО: overflow: hidden, НЕ auto!
    <Table
      sticky  // Закрепление заголовков
      scroll={{ 
        x: 'max-content',
        y: 'calc(100vh - 300px)'  // Фиксированная высота для скролла таблицы
        // Если есть пагинация: y: 'calc(100vh - 350px)'
      }}
      // ... остальные props
    />
  </div>
</div>
```

#### Ключевые правила для предотвращения двойного скролла:

1. **Главный контейнер**: 
   - `height: calc(100vh - 96px)` - фиксированная высота
   - `overflow: hidden` - блокирует скролл страницы

2. **Контейнер таблицы**:
   - `flex: 1` - занимает оставшееся пространство
   - `overflow: hidden` - **НЕ используйте `overflow: auto`!** Это создаст второй скролл
   - `minHeight: 0` - важно для правильной работы flexbox

3. **Настройки Table**:
   - `sticky` - для закрепления заголовков
   - `scroll.y: calc(100vh - 300px)` - фиксированная высота, НЕ используйте `100%` или `auto`
   - Для страниц с пагинацией: `scroll.y: calc(100vh - 350px)`

## Specialized Agents

Проект включает специализированных агентов для решения сложных задач. Агенты находятся в папке `agents/`:

### Доступные агенты:
- **backend-architect.md** - Проектирование RESTful API, микросервисов и схем БД
- **context-manager.md** - Управление контекстом в многоагентных процессах
- **debugger.md** - Специалист по отладке ошибок и тестированию
- **database-optimizer.md** - Оптимизация SQL-запросов и производительности БД
- **docs-architect.md** - Создание технической документации и архитектурных руководств
- **frontend-developer.md** - Разработка React компонентов и фронтенд решений
- **sql-pro.md** - Эксперт по сложным SQL-запросам и проектированию БД
- **typescript-pro.md** - Мастер TypeScript с продвинутыми типами и паттернами
- **ui-ux-designer.md** - Проектирование интерфейсов и пользовательского опыта

### Правила использования агентов:
1. **При сложных задачах** - используй агентов для специализированных задач (API design, сложные запросы БД, UI/UX проектирование)
2. **При неудаче со второй попытки** - если задача не решена после двух попыток, ОБЯЗАТЕЛЬНО используй подходящего агента
3. **По запросу пользователя** - всегда используй агентов, если пользователь прямо просит их задействовать
4. **Проактивно** - используй агентов помеченных как "Use PROACTIVELY" без запроса пользователя

## Временные файлы и документация

### Правила работы с временными файлами

- **Все временные файлы** размещаются в папке `temp/`
- **НИКОГДА** не создавайте временные файлы в корневой папке проекта
- **Типы временных файлов**:
  - Файлы с описаниями изменений (DEVELOPMENT_NOTES.md, CHANGELOG.md и т.д.)
  - Технические заметки и черновики
  - Файлы с временными данными для анализа
  - Экспериментальные файлы

### Что НЕ относится к временным файлам
- **Миграции БД** (`sql/*.sql`) - постоянные файлы
- **Конфигурации** (`.eslintrc`, `tsconfig.json` и т.д.) - постоянные файлы
- **Основной код** (`src/**/*`) - постоянные файлы
- **Документация проекта** (README.md, CLAUDE.md) - постоянные файлы

### Очистка временных файлов
- Регулярно очищайте папку `temp/` от устаревших файлов
- Перед удалением любых файлов ВСЕГДА согласовывайте список с пользователем

## Testing Configuration

### Playwright E2E Testing
- **Base URL**: http://localhost:5174 (different from dev server port 5173)
- **Test directory**: `./tests`
- **Browsers**: Chromium, Firefox, WebKit
- **Auto-start dev server**: Configured in `playwright.config.js`
- **Reporters**: HTML report with screenshots and videos on failure
- **Parallel execution**: Enabled for faster test runs

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

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.
ALL temporary files MUST be placed in the temp/ directory, NEVER in the root directory.