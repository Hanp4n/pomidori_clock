# AGENTS.md

## Commands
- **Dev Server**: `npm run dev` (Vite dev server)
- **Build**: `npm run build` (Runs `tsc -b && vite build`)
- **Lint**: `npm run lint` (ESLint)
- **Tests**: `npm test` or `npx vitest` (Vitest)
- **Run Single Test**: `npx vitest run <test-file>`
- **Tauri Dev / Build**: `npx tauri dev` / `npx tauri build`

## Architecture & Boundaries
- **Stack**: React 19 + TypeScript + Vite + Tailwind CSS v4 (`@tailwindcss/vite`) + Tauri v2 (`src-tauri`) + Supabase / local SQLite sync (`src/db`).
- **Path Aliases**: `@/*` maps to `./src/*` (`tsconfig.json` & `vite.config.ts`).
- **UI Components**: shadcn UI primitives in `src/components/ui/`.
- **Database & Sync**: Agnostic local operations, SQLite migrations in `src/db/migrations/sqlite/`, and Supabase synchronization (`src/db/supabase.ts`, `src/context/sync/`).

## Verification Order
1. `npm run lint`
2. `npm run build` (typechecks + bundles)
3. `npm test`
