# Pomidori Clock

An offline-first Pomodoro task tracker built as a desktop app with **Tauri v2**, **React 19**, **TypeScript**, and **Vite**. Tasks and settings are stored locally in SQLite and synced to **Supabase (Postgres)** whenever the device is online.

## Features

- **Task management** — create, edit, and soft-delete tasks with estimated pomodoro counts (`src/Test2.tsx`).
- **Offline-first storage** — every syncable table is mirrored in a local SQLite database (`pomidori_clock_local.db`) via `@tauri-apps/plugin-sql`.
- **Bi-directional sync** with Supabase:
  - Pulls on a 5-minute interval, on connectivity regain, and in real time via `postgres_changes` subscriptions.
  - Pushes local changes (debounced) when writes are signaled through a local change bus (`src/context/sync/`).
- **Auth** — Supabase Auth (email + password), guest mode, and offline sign-in with previously saved accounts. Sessions persist in the **OS keychain** via `tauri-plugin-keyring`, with a reconnect dialog when tokens expire (`src/context/auth/`).
- **Connectivity detection** — `@silvermine/tauri-plugin-connectivity` keeps the app usable offline and triggers auto-sync when the connection returns (`src/context/connectivity/`).

## Tech stack

| Layer      | Technology |
| ---------- | ---------- |
| Shell      | Tauri v2 (Rust) |
| UI         | React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui |
| Local DB   | SQLite via `@tauri-apps/plugin-sql` |
| Cloud DB   | Supabase (Postgres, `pomidori_clock` schema) |
| Routing    | `react-router-dom` |
| Icons      | `lucide-react`, `@tabler/icons-react` |

## Project structure

```
src/
├── components/        # shadcn/ui primitives + shared components
├── context/
│   ├── auth/          # Supabase auth, keychain session, guest/offline login
│   ├── connectivity/  # online/offline detection
│   ├── db/            # local DB provider & hooks
│   └── sync/          # sync bus, mappers, pull/push logic
├── db/
│   ├── migrations/sqlite/  # local schema migrations
│   ├── schema.sqlite.ts    # local row types
│   ├── schema.postgres.ts  # remote row types
│   └── supabase.ts         # Supabase client
├── pages/auth/        # Login, Register, OfflineLogin
└── Test2.tsx          # current task screen
```

### Sync design

Local rows are keyed by **client-generated UUIDs** (reused on push, no id remapping). Each syncable table carries bookkeeping columns:

- `is_synced` — `0` after any local write; only the sync worker sets it back to `1` once Supabase confirms the exact row.
- `updated_at` — last local modification time, used to detect rows changed during a push.
- `deleted_at` — soft-delete marker so deletions made offline still propagate.

`Friend` and `Request` tables exist only on the remote schema; they require a live connection and are not mirrored locally.

## Getting started

### Prerequisites

- Node.js
- Rust toolchain (for Tauri)
- A Supabase project with the `pomidori_clock` schema

### Environment variables

Create a `.env.local` at the project root:

```
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_PUBLISHABLE_KEY=<your-publishable-key>
```

### Commands

| Command                  | Description                              |
| ------------------------ | ---------------------------------------- |
| `npm run dev`            | Start the Vite dev server                |
| `npm run build`          | Typecheck (`tsc -b`) + build with Vite   |
| `npm run lint`           | Run ESLint                               |
| `npm test`               | Run Vitest tests                         |
| `npx tauri dev`          | Run the Tauri desktop app in dev mode    |
| `npx tauri build`        | Build the desktop app bundles            |

## License

TBD.
