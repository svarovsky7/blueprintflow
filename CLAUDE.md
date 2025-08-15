# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

BlueprintFlow - Construction management portal for work documentation analysis and cost estimation (200+ users). Built with React/TypeScript, Supabase backend, real-time collaboration.

## Essential Commands

```bash
npm install        # Install dependencies
npm run dev        # Development server
npm run build      # Build (run before commit)
npm run lint       # Lint (MUST pass before commit)
npm run preview    # Preview production build
```

## Pre-commit Requirements
1. `npm run lint` - MUST pass with no warnings
2. `npm run build` - MUST build successfully  
3. Use Conventional Commits: `feat:`, `fix:`, `chore:`

## Architecture & Key Components

### Tech Stack
- **Frontend**: React 18, TypeScript (strict), Vite, Ant Design 5
- **Backend**: Supabase (PostgreSQL 16, Auth, Storage, Realtime)
- **State**: TanStack Query
- **Excel**: xlsx library
- **Monitoring**: Sentry, Grafana Cloud

### Architecture

**Supabase Setup** (`src/lib/supabase.ts`):
```
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY or VITE_SUPABASE_ANON_KEY
```

**Key Components**:
- **Chessboard** (`src/pages/documents/Chessboard.tsx`) - Material tracking with Excel import, hierarchical filtering (Project→Block→Category→Type), real-time collaborative editing
- **Database**: `chessboard` (main), `chessboard_mapping` (relations), reference tables (`units`, `cost_categories`, `location`)
- **Migration**: `supabase.sql` + `sql/*.sql` directory

## Critical Requirements

### Performance Targets (from `tech_task.md`)
- Excel import: 5,000 rows ≤ 30 seconds
- Table render: 10,000 rows ≤ 100ms  
- Real-time sync latency < 300ms
- Support 100 concurrent users

### Code Standards
- **TypeScript strict mode** - no `any` types
- **Functional components only** - use hooks
- **TanStack Query** for all data fetching
- **Database tables** - always include `created_at`, `updated_at`
- **NEVER use RLS** - handle auth in application layer
- **Russian UI labels** - maintain existing language

### Table UI Requirements
- Column headers MUST have sorting and filtering
- Row controls must be icon-only (no text)
- Support inline editing with optimistic locking
- Cascading dropdowns: changing category resets dependent fields

### Excel Import Logic
- Fuzzy match columns: "материал" (material), "кол" (quantity), "ед" (unit)
- Store original files in Supabase Storage
- Support drag-and-drop up to 250 MB

### Real-time Collaboration
- Supabase Realtime WebSocket channels
- Optimistic locking via `updated_at` timestamp
- Conflict resolver: Merge/Overwrite/Rollback options

## Deployment
- Frontend: GitHub Actions → Vercel
- Backend: Supabase Cloud (PostgreSQL 16)
- Monitoring: Sentry + Grafana Cloud