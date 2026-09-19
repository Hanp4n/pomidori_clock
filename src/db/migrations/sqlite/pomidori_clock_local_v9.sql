-- migration 9: opt-out of auto-restarting the timer when the selected task
-- changes. When 1 (default) a running timer restarts on task switch; when 0 it
-- stops instead. Local-only until the Supabase table gains the column.

ALTER TABLE "PomodoroConfig" ADD COLUMN "restart_on_task_switch" INTEGER NOT NULL DEFAULT 0 CHECK ("restart_on_task_switch" IN (0, 1));
