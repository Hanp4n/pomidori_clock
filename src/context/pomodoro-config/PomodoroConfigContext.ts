import { createContext } from "react";
import type { LocalPomodoroConfig } from "@/db/schema.sqlite";

export type NewPomodoroConfigInput = {
  focus_time?: number;
  short_break_time?: number;
  long_break_time?: number;
  long_break_count?: number;
  focus_auto?: 1 | 0;
  break_auto?: 1 | 0;
  sound_enabled?: 1 | 0;
};

export interface PomodoroConfigContextValue {
  config: LocalPomodoroConfig | null;
  refreshConfig: () => Promise<LocalPomodoroConfig | null>;
  addConfig: (input: NewPomodoroConfigInput) => Promise<void>;
  updateConfig: (input: NewPomodoroConfigInput) => Promise<void>;
  deleteConfig: () => Promise<void>;
}

export const PomodoroConfigContext = createContext<PomodoroConfigContextValue | null>(null);
