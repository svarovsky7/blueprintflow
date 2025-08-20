# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlueprintFlow is a React-based construction management portal for analyzing work documentation and cost estimation department of a construction general contractor. The system supports OAuth 2.0 authentication, Excel import capabilities, and real-time collaboration features for a team of 200+ employees.

## Tech Stack
- **Frontend**: React 19, TypeScript (strict mode), Vite 7
- **UI Library**: Ant Design 5 with Vibe design approach
- **State Management**: TanStack Query 5+ (server state), Zustand 5+ (auth state)
- **Backend**: Supabase 2.47+ (PostgreSQL 17, Auth, Storage, Edge Functions, Realtime WebSocket)
- **Authentication**: Supabase Auth with OAuth 2.0 (Google, Microsoft) and MFA support
- **Observability**: Sentry, Grafana Cloud, OpenTelemetry
- **Excel Processing**: xlsx library for import/export
- **Utilities**: Day.js for dates
- **Routing**: React Router DOM 6
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
- **Imports**: Use path aliases (`@/`, `@/entities/`, `@/features/`, etc.)
- **State**: TanStack Query for server state, Zustand for auth state only
- **API Files**: Named as `entity-name-api.ts` in `entities/*/api/`
- **Error Handling**: All Supabase queries must include error handling

## Database

**CRITICAL**: Always reference `supabase/schemas/prod.sql` for current database structure.


## Database Integration

### Supabase Configuration
Environment variables required:
```env
VITE_SUPABASE_URL=<supabase_url>
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=<anon_key> # or VITE_SUPABASE_ANON_KEY
VITE_STORAGE_BUCKET=<storage_url>
```

Configuration: `src/lib/supabase.ts`

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
- `.env.example` - Environment variables template

## Important Notes
- Excel import headers are flexible - use fuzzy matching
- Cascading logic: When cost category changes, reset cost type and location
- Row operations: Support add, copy, edit, delete with proper state management
- Filtering: Applied filters persist through mode changes (view/add/edit)
- Column settings saved in localStorage for persistence across sessions