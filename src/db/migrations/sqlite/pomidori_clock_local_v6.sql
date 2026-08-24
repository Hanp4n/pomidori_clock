-- migration 6: configurable pomodoro flow on PomodoroConfig
--   long_break_count: how many focus sessions before a long break
--   focus_auto / break_auto: auto-start next focus session / break

ALTER TABLE "PomodoroConfig" ADD COLUMN "long_break_count" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "PomodoroConfig" ADD COLUMN "focus_auto" INTEGER NOT NULL DEFAULT 0 CHECK ("focus_auto" IN (0, 1));
ALTER TABLE "PomodoroConfig" ADD COLUMN "break_auto" INTEGER NOT NULL DEFAULT 0 CHECK ("break_auto" IN (0, 1));
