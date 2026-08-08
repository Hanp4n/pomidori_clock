-- ============================================================
-- Pomidori Clock — Local SQLite Schema
-- ============================================================
-- Role: Offline-first local mirror of Supabase, used by the
-- Tauri client. Only tables a single client can write to while
-- offline are included. "Friend" and "Request" are NOT mirrored
-- here — they require a live connection to Supabase (Presence /
-- real-time), so they are read/written directly against the
-- cloud when online and simply unavailable while offline.
--
-- ID strategy: every primary key is a client-generated UUID
-- (TEXT). The same id is reused when the row is pushed to
-- Supabase, so there is no remapping step after sync.
--
-- Sync bookkeeping columns on every syncable table:
--   is_synced  -> has the CURRENT version of this row been
--                 pushed and confirmed by Supabase? Set to 0 by
--                 every INSERT and every UPDATE to a syncable
--                 column. Only the sync worker sets it back to
--                 1, and only after Supabase confirms that exact
--                 row — never a blanket "mark batch as synced."
--   updated_at -> last local modification time. Used by the sync
--                 worker to detect whether a row changed again
--                 after it was read for a push (if so, do not
--                 mark it synced even if the push "succeeded",
--                 since a newer version now exists locally).
--   deleted_at -> soft-delete marker, so deletions made offline
--                 can still be propagated on next sync.
-- ============================================================

PRAGMA foreign_keys = ON;


-- ------------------------------------------------------------
-- User (local copy only — enough for FK integrity + guest mode)
-- ------------------------------------------------------------
-- The real source of truth for accounts is Supabase Auth.
-- This table only stores:
--   - the currently known account(s) that have logged in on
--     this device (so a cached session token can be offered
--     when offline), and
--   - a fixed sentinel row representing the local guest, so
--     guest-created rows have a valid user_id to FK against.

CREATE TABLE "User" (
  "id" TEXT PRIMARY KEY,
  "username" TEXT UNIQUE,
  "email" TEXT UNIQUE,
  "is_guest" INTEGER NOT NULL DEFAULT 0 CHECK ("is_guest" IN (0, 1)),
  "session_token" TEXT,
  "created_at" TEXT NOT NULL ,
  CHECK ("is_guest" = 1 OR ("username" IS NOT NULL AND "email" IS NOT NULL))
);

-- Sentinel guest row. All guest-mode data FKs to this fixed id.
INSERT INTO "User" ("id", "username", "email", "is_guest", "created_at")
VALUES ('00000000-0000-0000-0000-000000000000', 'guest', NULL, 1, CURRENT_TIMESTAMP);

-- ------------------------------------------------------------
-- PomodoroConfig
-- ------------------------------------------------------------
CREATE TABLE "PomodoroConfig" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "focus_time" INTEGER NOT NULL,
  "short_break_time" INTEGER NOT NULL,
  "long_break_time" INTEGER NOT NULL,
  "created_at" TEXT NOT NULL ,
  "updated_at" TEXT NOT NULL ,
  "deleted_at" TEXT,
  "is_synced" INTEGER NOT NULL DEFAULT 0 CHECK ("is_synced" IN (0, 1)),
  FOREIGN KEY ("user_id") REFERENCES "User" ("id")
);

-- ------------------------------------------------------------
-- Task
-- ------------------------------------------------------------
CREATE TABLE "Task" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "n_pomodoros" INTEGER NOT NULL DEFAULT 1,
  "completed_pomodoros" INTEGER NOT NULL DEFAULT 0,
  "is_completed" INTEGER NOT NULL DEFAULT 0 CHECK ("is_completed" IN (0, 1)),
  "updated_at" TEXT NOT NULL ,
  "created_at" TEXT NOT NULL ,
  "deleted_at" TEXT,
  "is_synced" INTEGER NOT NULL DEFAULT 0 CHECK ("is_synced" IN (0, 1)),
  FOREIGN KEY ("user_id") REFERENCES "User" ("id")
);

-- ------------------------------------------------------------
-- PomodoroSession
-- ------------------------------------------------------------
-- NOTE: unlike the Postgres version, "updated_at" is included
-- here. A session can be modified locally after creation (e.g.
-- ended_at set when a focus block finishes), so a single
-- created_at is not enough to know whether a sync push is stale.
CREATE TABLE "PomodoroSession" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "task_id" TEXT,
  "type" TEXT NOT NULL CHECK ("type" IN ('focus', 'short_break', 'long_break')),
  "duration" INTEGER NOT NULL DEFAULT 0,
  "started_at" TEXT NOT NULL,
  "ended_at" TEXT,
  "updated_at" TEXT NOT NULL ,
  "deleted_at" TEXT,
  "is_synced" INTEGER NOT NULL DEFAULT 0 CHECK ("is_synced" IN (0, 1)),
  FOREIGN KEY ("user_id") REFERENCES "User" ("id"),
  FOREIGN KEY ("task_id") REFERENCES "Task" ("id") ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Category
-- ------------------------------------------------------------
CREATE TABLE "Category" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "color" TEXT NOT NULL DEFAULT '#FFFFFF',
  "updated_at" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "deleted_at" TEXT,
  "is_synced" INTEGER NOT NULL DEFAULT 0 CHECK ("is_synced" IN (0, 1)),
  FOREIGN KEY ("user_id") REFERENCES "User" ("id")
);

CREATE UNIQUE INDEX "idx_category_user_name" ON "Category" ("user_id", "name");

-- ------------------------------------------------------------
-- TaskCategory
-- ------------------------------------------------------------
CREATE TABLE "TaskCategory" (
  "id" TEXT PRIMARY KEY,
  "task_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "created_at" TEXT NOT NULL,
  "deleted_at" TEXT,
  "is_synced" INTEGER NOT NULL DEFAULT 0 CHECK ("is_synced" IN (0, 1)),
  FOREIGN KEY ("task_id") REFERENCES "Task" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("category_id") REFERENCES "Category" ("id")
);

-- ------------------------------------------------------------
-- Helpful indexes for sync queries
-- ------------------------------------------------------------
-- Every sync pass needs "give me everything not yet synced for
-- the current user" — index that path on each table.
CREATE INDEX "idx_pomodoroconfig_unsynced" ON "PomodoroConfig" ("is_synced");
CREATE INDEX "idx_tasks_unsynced" ON "Task" ("user_id", "is_synced");
CREATE INDEX "idx_pomodorosession_unsynced" ON "PomodoroSession" ("user_id", "is_synced");
CREATE INDEX "idx_category_unsynced" ON "Category" ("user_id", "is_synced");
CREATE INDEX "idx_taskcategory_unsynced" ON "TaskCategory" ("is_synced");

-- Local metrics views (today's/this week's focus time, etc.) hit this
-- same (user_id, started_at) shape as the online schema.
CREATE INDEX "idx_pomodorosession_user_started" ON "PomodoroSession" ("user_id", "started_at");

-- ============================================================
-- TASK TRIGGER — enforces is_completed invariant
-- ============================================================
-- Mirrors the Postgres trigger: completed_pomodoros >= n_pomodoros
-- always forces is_completed = 1. Below that threshold,
-- is_completed is left as whatever was explicitly written (manual
-- early-completion is allowed).
-- CREATE TRIGGER "trg_tasks_completion_insert"
-- AFTER INSERT ON "Task"
-- FOR EACH ROW
-- WHEN NEW."completed_pomodoros" >= NEW."n_pomodoros" AND NEW."is_completed" = 0
-- BEGIN
--   UPDATE "Task" 
--   SET "is_completed" = 1,
--       "is_synced" = 0,                             
--       "updated_at" = CURRENT_TIMESTAMP             
--   WHERE "id" = NEW."id";
-- END;

-- CREATE TRIGGER "trg_tasks_completion_update"
-- AFTER UPDATE OF "completed_pomodoros", "n_pomodoros" ON "Task"
-- FOR EACH ROW
-- WHEN NEW."completed_pomodoros" >= NEW."n_pomodoros" AND NEW."is_completed" = 0
-- BEGIN
--   UPDATE "Task" 
--   SET "is_completed" = 1,
--       "is_synced" = 0,                             
--       "updated_at" = CURRENT_TIMESTAMP             
--   WHERE "id" = NEW."id";
-- END;