-- migration 7: toggleable finish sound on PomodoroConfig
-- Default ON (1): matches the previous always-play behaviour.

ALTER TABLE "PomodoroConfig" ADD COLUMN "sound_enabled" INTEGER NOT NULL DEFAULT 1 CHECK ("sound_enabled" IN (0, 1));
