import type {
  LocalTask,
  LocalCategory,
  LocalTaskCategory,
  LocalPomodoroConfig,
  LocalPomodoroSession,
  RemoteTask,
  RemoteCategory,
  RemoteTaskCategory,
  RemotePomodoroConfig,
  RemotePomodoroSession,
} from "@/db/db-types";

// ============================================================
// Timestamp helpers
// ============================================================
// Local (SQLite) TEXT timestamps come from CURRENT_TIMESTAMP,
// which is UTC but WITHOUT a timezone marker, e.g. "2024-01-01 12:00:00".
// Remote (Postgres) timestamptz columns round-trip as full ISO 8601
// strings with an offset, e.g. "2024-01-01T12:00:00.000Z".
// These two helpers keep that conversion in one place instead of
// repeating `new Date(...).toISOString()` (and getting it subtly
// wrong) in every mapper.

/** SQLite "YYYY-MM-DD HH:MM:SS" (assumed UTC) -> ISO 8601 string */
// function sqliteTimestampToISO(value: string): string {
//   // Treat the naive string as UTC explicitly, rather than letting
//   // `new Date()` guess based on the runtime's local timezone.
//   return value.replace(" ", "T") + "Z";
// }


// ============================================================
// Task
// ============================================================

export function taskLocalToRemote(local: LocalTask): RemoteTask {
  return {
    id: local.id,
    user_id: local.user_id,
    title: local.title,
    description: local.description ?? null,
    n_pomodoros: local.n_pomodoros,
    completed_pomodoros: local.completed_pomodoros,
    is_completed: Boolean(local.is_completed),
    updated_at: local.updated_at,
    created_at: local.created_at,
  };
}

export function taskRemoteToLocal(remote: RemoteTask): LocalTask {
  return {
    id: remote.id,
    user_id: remote.user_id,
    title: remote.title,
    description: remote.description ?? null,
    n_pomodoros: remote.n_pomodoros,
    completed_pomodoros: remote.completed_pomodoros,
    is_completed: remote.is_completed ? 1 : 0,
    updated_at: remote.updated_at,
    created_at: remote.created_at,
    deleted_at: null, // remote has no concept of a deleted task
    is_synced: 1, // just confirmed from the server, so it's synced by definition
  };
}

// ============================================================
// Category
// ============================================================

export function categoryLocalToRemote(local: LocalCategory): RemoteCategory {
  return {
    id: local.id,
    user_id: local.user_id,
    name: local.name,
    color: local.color,
    updated_at: local.updated_at,
    created_at: local.created_at,
  };
}

export function categoryRemoteToLocal(remote: RemoteCategory): LocalCategory {
  return {
    id: remote.id,
    user_id: remote.user_id,
    name: remote.name,
    color: remote.color,
    updated_at: remote.updated_at,
    created_at: remote.created_at,
    deleted_at: null,
    is_synced: 1,
  };
}

// ============================================================
// TaskCategory
// ============================================================

export function taskCategoryLocalToRemote(
  local: LocalTaskCategory,
): RemoteTaskCategory {
  return {
    id: local.id,
    task_id: local.task_id,
    category_id: local.category_id,
    created_at: local.created_at,
  };
}

export function taskCategoryRemoteToLocal(
  remote: RemoteTaskCategory,
): LocalTaskCategory {
  return {
    id: remote.id,
    task_id: remote.task_id,
    category_id: remote.category_id,
    created_at: remote.created_at,
    deleted_at: null,
    is_synced: 1,
  };
}

// ============================================================
// PomodoroConfig
// ============================================================

export function pomodoroConfigLocalToRemote(
  local: LocalPomodoroConfig,
): RemotePomodoroConfig {
  return {
    id: local.id,
    user_id: local.user_id,
    focus_time: local.focus_time,
    short_break_time: local.short_break_time,
    long_break_time: local.long_break_time,
    created_at: local.created_at,
    updated_at: local.updated_at,
  };
}

export function pomodoroConfigRemoteToLocal(
  remote: RemotePomodoroConfig,
): LocalPomodoroConfig {
  return {
    id: remote.id,
    user_id: remote.user_id,
    focus_time: remote.focus_time,
    short_break_time: remote.short_break_time,
    long_break_time: remote.long_break_time,
    created_at: remote.created_at,
    updated_at: remote.updated_at,
    deleted_at: null, 
    is_synced: 1,
  };
}

// ============================================================
// PomodoroSession
// ============================================================

export function pomodoroSessionLocalToRemote(
  local: LocalPomodoroSession,
): RemotePomodoroSession {
  return {
    id: local.id,
    user_id: local.user_id,
    task_id: local.task_id ?? null,
    type: local.type,
    duration: local.duration,
    started_at: local.started_at,
    ended_at: local.ended_at,
    updated_at: local.updated_at,
  };
}

export function pomodoroSessionRemoteToLocal(
  remote: RemotePomodoroSession,
): LocalPomodoroSession {
  return {
    id: remote.id,
    user_id: remote.user_id,
    task_id: remote.task_id ?? null,
    type: remote.type,
    duration: remote.duration,
    started_at: remote.started_at,
    ended_at: remote.ended_at,
    updated_at: remote.updated_at,
    is_synced: 1,
  };
}

type Direction = "localToRemote" | "remoteToLocal";

export function getMapper(table: string, direction: Direction) {
  switch (table) {
    case "Task":
      return direction === "localToRemote"
        ? taskLocalToRemote
        : taskRemoteToLocal;
    case "Category":
      return direction === "localToRemote"
        ? categoryLocalToRemote
        : categoryRemoteToLocal;
    case "TaskCategory":
      return direction === "localToRemote"
        ? taskCategoryLocalToRemote
        : taskCategoryRemoteToLocal;
    case "PomodoroConfig":
      return direction === "localToRemote"
        ? pomodoroConfigLocalToRemote
        : pomodoroConfigRemoteToLocal;
    case "PomodoroSession":
      return direction === "localToRemote"
        ? pomodoroSessionLocalToRemote
        : pomodoroSessionRemoteToLocal;
    default:
      throw new Error(`Unknown table mapper for ${table}`);
  }
}
