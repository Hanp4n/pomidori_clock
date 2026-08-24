-- migration 8: synced timer state (one row per user, id = user_id) so other
-- devices see timer transitions. Mirror of the localStorage TimerSnapshot shape
-- plus the standard sync columns.

CREATE TABLE IF NOT EXISTS "TimerState" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL UNIQUE,
  "mode" TEXT NOT NULL CHECK ("mode" IN ('focus_time', 'short_break_time', 'long_break_time')),
  "remaining" INTEGER NOT NULL DEFAULT 0,
  "running" INTEGER NOT NULL DEFAULT 0 CHECK ("running" IN (0, 1)),
  "saved_at" TEXT NOT NULL,
  "task_id" TEXT,
  "created_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at" TEXT,
  "is_synced" INTEGER NOT NULL DEFAULT 0 CHECK ("is_synced" IN (0, 1))
);
