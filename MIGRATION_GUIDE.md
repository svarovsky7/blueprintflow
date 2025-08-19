# Migration Guide - BlueprintFlow

## Applied Changes from PayHub Project

### 1. ✅ CLAUDE.md Updated
- Combined best practices from both projects
- Added detailed architecture documentation
- Included critical "MUST DO" and "NEVER DO" guidelines
- Added API patterns and error handling examples

### 2. ✅ Prettier Configuration Added
- Added `.prettierrc` and `.prettierignore` files
- Added npm scripts: `npm run format` and `npm run format:check`
- Installed prettier as dev dependency

### 3. ✅ Path Aliases Configured
- Updated `tsconfig.app.json` with path aliases
- Updated `vite.config.ts` with resolver aliases
- Now you can use imports like: `import { something } from '@/shared/lib'`

### 4. ✅ Zustand State Management Added
- Installed zustand for auth state management
- Created auth store at `src/features/auth/model/auth-store.ts`
- Includes user authentication methods and state persistence

### 5. ✅ Feature-Sliced Design (FSD) Structure Implemented
Created folder structure:
```
src/
├── app/          # App-level configuration
├── features/     # User features (auth, etc.)
│   └── auth/
│       └── model/auth-store.ts
├── entities/     # Business entities
│   └── chessboard/
│       ├── api/chessboard-api.ts
│       └── model/types.ts
├── widgets/      # Complex UI blocks
├── shared/       # Shared code
│   ├── types/    # Common types
│   └── lib/      # Utilities
├── pages/        # Existing pages (keep as is)
├── components/   # Legacy components (migrate gradually)
└── lib/          # External configs (Supabase, etc.)
```

## How to Use New Features

### Using Path Aliases
Instead of:
```typescript
import { something } from '../../../shared/lib'
```

Use:
```typescript
import { something } from '@/shared/lib'
```

### Using Auth Store
```typescript
import { useAuthStore } from '@/features/auth'

function Component() {
  const { user, isAuthenticated, signIn, signOut } = useAuthStore()
  
  // Use auth methods and state
}
```

### Using Prettier
```bash
# Format all files
npm run format

# Check formatting without changes
npm run format:check
```

### FSD Architecture
- Each feature/entity/widget has its own folder
- Export public API through `index.ts`
- Keep internal implementation private
- Use barrel exports for cleaner imports

## Migration Strategy for Existing Code

### Phase 1: Gradual Migration (Recommended)
1. Keep existing pages and components as is
2. New features follow FSD structure
3. When refactoring, move code to appropriate FSD layers
4. Use path aliases in new code

### Phase 2: Component Migration
As you work on components:
1. Move business logic to `entities/`
2. Move complex UI to `widgets/`
3. Move shared utilities to `shared/`
4. Update imports to use path aliases

### Phase 3: Full Migration
1. Move all pages to use FSD entities
2. Deprecate old component structure
3. Complete migration to FSD

## Notes
- All dependencies are installed
- Build passes successfully
- Old code continues to work
- New structure ready for use
- Prettier can be run on existing files when ready