export type LocalUser = {
  id: string;
  username: string | null;
  email: string | null;
  is_guest: 1 | 0;
  created_at: string;
};

export type NewLocalUser = {
  id: string;
  username?: string | null;
  email?: string | null;
  is_guest?: 1 | 0;
  created_at?: string;
};

export type LocalPomodoroConfig = {
  id: string;
  user_id: string;
  focus_time: number;
  short_break_time: number;
  long_break_time: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  is_synced: 1 | 0;
};

export type NewLocalPomodoroConfig = {
  id: string;
  user_id: string;
  focus_time?: number;
  short_break_time?: number;
  long_break_time?: number;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
  is_synced?: 1 | 0;
};

export type LocalTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  n_pomodoros: number;
  completed_pomodoros: number;
  is_completed: 1 | 0;
  updated_at: string;
  created_at: string;
  deleted_at: string | null;
  is_synced: 1 | 0;
};

export type NewLocalTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  n_pomodoros?: number;
  completed_pomodoros?: number;
  is_completed?: 1 | 0;
  updated_at?: string;
  created_at?: string;
  deleted_at?: string | null;
  is_synced?: 1 | 0;
};

export type LocalPomodoroSession = {
  id: string;
  user_id: string;
  task_id: string | null;
  type: 'focus' | 'short_break' | 'long_break';
  duration: number;
  started_at: string;
  ended_at: string | null;
  updated_at: string;
  is_synced: 1 | 0;
};

export type NewLocalPomodoroSession = {
  id: string;
  user_id: string;
  type: 'focus' | 'short_break' | 'long_break';
  started_at: string;
  task_id?: string | null;
  duration?: number;
  ended_at?: string | null;
  updated_at?: string;
  is_synced?: 1 | 0;
};

export type LocalCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  updated_at: string;
  created_at: string;
  deleted_at: string | null;
  is_synced: 1 | 0;
};

export type NewLocalCategory = {
  id: string;
  user_id: string;
  name: string;
  color?: string;
  updated_at?: string;
  created_at?: string;
  deleted_at?: string | null;
  is_synced?: 1 | 0;
};

export type LocalTaskCategory = {
  id: string;
  task_id: string;
  category_id: string;
  created_at: string;
  deleted_at: string | null;
  is_synced: 1 | 0;
};

export type NewLocalTaskCategory = {
  id: string;
  task_id: string;
  category_id: string;
  created_at?: string;
  deleted_at?: string | null;
  is_synced?: 1 | 0;
};

export type LocalAppState = {
  id: number;
  active_user_id: string | null;
};