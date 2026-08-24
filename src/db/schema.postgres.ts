export type RemoteUser = {
  id: string;
  username: string;
  email: string;
  created_at: string;
};
export type NewRemoteUser = {
  id?: string;
  username: string;
  email: string;
  created_at: string;
};
export type RemotePomodoroConfig = {
  id: string;
  user_id: string;
  focus_time: number;
  short_break_time: number;
  long_break_time: number;
  created_at: string;
  updated_at: string;
  long_break_count: number;
  focus_auto: number;
  break_auto: number;
  sound_enabled: number;
};
export type NewRemotePomodoroConfig = {
  id?: string;
  user_id?: string | null;
  focus_time: number;
  short_break_time: number;
  long_break_time: number;
  long_break_count: number;
  focus_auto: number;
  break_auto: number;
  sound_enabled: number;
  created_at: string;
  updated_at: string;
};
export type RemoteTask = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  n_pomodoros: number;
  completed_pomodoros: number;
  is_completed: boolean;
  updated_at: string;
  created_at: string;
};
export type NewRemoteTask = {
  id?: string;
  user_id: string;
  title: string;
  description?: string | null;
  n_pomodoros?: number;
  completed_pomodoros?: number;
  is_completed?: boolean;
  updated_at: string;
  created_at: string;
};
export type RemotePomodoroSession = {
  id: string;
  user_id: string;
  task_id: string | null;
  type: 'focus' | 'short_break' | 'long_break';
  duration: number;
  updated_at: string;
  started_at: string;
  ended_at: string | null;
};
export type NewRemotePomodoroSession = {
  id?: string;
  user_id: string;
  task_id?: string | null;
  type: 'focus' | 'short_break' | 'long_break';
  duration?: number;
  updated_at: string;
  started_at: string;
  ended_at?: string | null;
};
export type RemoteCategory = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  updated_at: string;
  created_at: string;
};
export type NewRemoteCategory = {
  id?: string;
  user_id: string;
  name: string;
  color?: string;
  updated_at: string;
  created_at: string;
};
export type RemoteTaskCategory = {
  id: string;
  task_id: string;
  category_id: string;
  created_at: string;
};
export type NewRemoteTaskCategory = {
  id?: string;
  task_id: string;
  category_id: string;
  created_at: string;
};
export type RemoteRequest = {
  id: string;
  sender_id: string;
  receiver_id: string;
  type: 'friend' | 'co_study';
  created_at: string;
};
export type NewRemoteRequest = {
  id?: string;
  sender_id: string;
  receiver_id: string;
  type: 'friend' | 'co_study';
  created_at: string;
};
export type RemoteFriend = {
  user_id: string;
  friend_id: string;
};
export type NewRemoteFriend = {
  user_id: string;
  friend_id: string;
};
export type RemoteTimerState = {
  id: string;
  user_id: string;
  mode: 'focus_time' | 'short_break_time' | 'long_break_time';
  remaining: number;
  running: boolean;
  saved_at: string;
  task_id: string | null;
  created_at: string;
  updated_at: string;
};
export type NewRemoteTimerState = {
  id?: string;
  user_id: string;
  mode: 'focus_time' | 'short_break_time' | 'long_break_time';
  remaining: number;
  running: boolean;
  saved_at: string;
  task_id?: string | null;
  created_at: string;
  updated_at: string;
};

