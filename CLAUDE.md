# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlueprintFlow is a React-based construction management portal for analyzing work documentation and cost estimation department of a construction general contractor. The system supports OAuth 2.0 authentication, Excel import capabilities, and real-time collaboration features for a team of 200+ employees.

## Common Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build production bundle
npm run build

# Run linting (MUST run before commit)
npm run lint

# Preview production build
npm run preview
```

## Pre-commit Checklist
- Run `npm run lint` and fix all warnings
- Run `npm run build` and ensure project builds successfully
- Follow Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)

## Architecture & Key Components

### Tech Stack
- **Frontend**: React 18 with TypeScript (strict typing), Vite build tool
- **UI Library**: Ant Design 5 with Vibe design approach
- **State Management**: TanStack Query for server state
- **Backend**: Supabase (PostgreSQL 16, Auth, Storage, Edge Functions, Realtime WebSocket)
- **Authentication**: Supabase Auth with OAuth 2.0 (Google, Microsoft) and MFA support
- **Observability**: Sentry, Grafana Cloud, OpenTelemetry
- **Excel Processing**: xlsx library for import/export
- **Editor**: WebStorm

### Core Pages Structure

The application is organized around three main sections:

1. **Documents** (`/documents/*`)
   - Chessboard (`src/pages/documents/Chessboard.tsx`) - Complex material tracking with Excel import, filtering, and inline editing
   - VOR (`src/pages/documents/Vor.tsx`) - Volume of work documentation

2. **References** (`/references/*`)
   - Units of measurement
   - Cost categories
   - Projects
   - Locations

3. **Dashboard** - Analytics widgets for completed work

### Database Integration

- Supabase client configuration in `src/lib/supabase.ts`
- Environment variables required:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` or `VITE_SUPABASE_ANON_KEY`
- Database schema defined in `supabase.sql` and migration files in `sql/` directory

### Key Features Implementation

**Chessboard Component** (`src/pages/documents/Chessboard.tsx`):
- Hierarchical filtering: Project → Block → Cost Category → Cost Type
- Excel import with column mapping for materials, quantities, and units
- Real-time editing with optimistic locking
- Row coloring system for visual categorization
- Cascading dropdowns with automatic location assignment

**Data Flow**:
1. Main data stored in `chessboard` table
2. Mapping relationships in `chessboard_mapping` table
3. Reference data in `units`, `cost_categories`, `detail_cost_categories`, `location` tables

### Performance Requirements

From technical specification (`tech_task.md`):
- Import 5,000 Excel rows ≤ 30 seconds
- Render 10,000 rows ≤ 100ms
- Support 100 concurrent users
- Latency < 300ms for real-time sync
- 99.9% uptime target
- MTTR ≤ 5 minutes

## Development Principles

### UI/UX Guidelines
- **Mobile-first** design approach
- **WCAG 2.1 AA** accessibility compliance
- Modern, responsive UI with Ant Design 5/Vibe design system
- All tables MUST have sorting and filters in column headers
- Control elements in table rows should be icon-only (no text)
- Display page title in header on all new portal pages

### Code Standards
- Write **TypeScript only** with strict typing
- Use functional React components and hooks
- Data fetching via TanStack Query
- Component names: `PascalCase`
- Variables and functions: `camelCase`
- All new database tables must include `created_at` and `updated_at` fields
- **NEVER use RLS (Row Level Security)**

### Collaboration Features
- Optimistic locking for concurrent editing
- Conflict resolver for simultaneous updates
- Real-time sync via Supabase Realtime WebSocket

### File Handling
- Drag-and-drop upload support up to 250 MB
- File preview for PDF/DWG/XLS/DOC formats
- Store original files in Supabase Storage
- Version control through date-based subfolders

## Important Considerations

1. **Multi-language**: UI is in Russian, maintain Russian labels for user-facing elements
2. **Excel Import**: Headers are flexible - use fuzzy matching for "материал", "кол", "ед" columns
3. **Cascading Logic**: When cost category changes, reset cost type and location
4. **Row Operations**: Support add, copy, edit, delete with proper state management
5. **Filtering**: Applied filters persist through mode changes (view/add/edit)
6. **Security**: Never store secrets or generated artifacts in repository
7. **Documentation**: Update documentation and reference `tech_task.md` when needed

## Git Workflow
- Work in feature branches
- Submit changes via Pull Request
- Use Conventional Commits format (`feat:`, `fix:`, `chore:`, etc.)
- Update documentation as needed

## Deployment
- Frontend: GitHub Actions → Vercel
- Backend: Supabase Cloud
- Configure Sentry and Grafana Cloud for monitoring

## Environment Setup

Ensure Supabase environment variables are configured before running the application. The app gracefully handles missing Supabase configuration but features will be limited.

## Additional Features
- Onboarding wizard for new users
- AI-powered suggestions (Codex integration)
- Analytics dashboard (win-rate, cost dynamics)
- Full action history logging