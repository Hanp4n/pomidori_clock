import React, { useCallback, useEffect, useState } from 'react';
import type { LocalTask } from '@/db/schema.sqlite';
import type { Tag } from '@/components/tasks/TagSelector';
import { useDb } from '../db/DbHook';
import { useAuth } from '../auth/AuthHook';
import { useSync } from '../sync/SyncHook';
import { createTask as createTaskOp, updateTask as updateTaskOp, getOperation, type OperationType } from '@/db/local-agnostic-operations';
import { notifyLocalChange } from '../sync/sync-bus';
import { TaskContext, type NewTaskInput } from './TaskContext';

const TASK_COLUMNS = 'id, title, description, n_pomodoros as n_pomodoros, user_id, completed_pomodoros, is_completed, created_at, updated_at, deleted_at, is_synced';

export function TaskProvider({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const { user, localUserId, status: authStatus } = useAuth();
  const { sync, remoteChanges, setRemoteChanges, notifyRemoteChange } = useSync();
  const [tasks, setTasks] = useState<LocalTask[]>([]);
  const [taskTags, setTaskTags] = useState<Record<string, Tag[]>>({});

  const fetchTasks = useCallback(async (): Promise<LocalTask[]> => {
    if (!db || !user) return [];
    return await db.select<LocalTask[]>(`SELECT ${TASK_COLUMNS} FROM Task WHERE user_id = $1 ORDER BY created_at`, [user.id]);
  }, [db, user]);

  const fetchTaskTags = useCallback(async (): Promise<Record<string, Tag[]>> => {
    if (!db) return {};
    const rows = await db.select<{ task_id: string; id: string; name: string; color: string }[]>(
      `SELECT c.id, c.name, c.color, tc.task_id
       FROM TaskCategory tc
       JOIN Category c ON c.id = tc.category_id
       WHERE tc.deleted_at IS NULL AND c.deleted_at IS NULL`,
    );
    return rows.reduce<Record<string, Tag[]>>((acc, row) => {
      (acc[row.task_id] ??= []).push({ id: row.id, name: row.name, color: row.color });
      return acc;
    }, {});
  }, [db]);

  const refreshTasks = useCallback(async () => {
    const actualTasks = await fetchTasks();
    setTasks(actualTasks.filter(task => task.deleted_at === null));
    setTaskTags(await fetchTaskTags());
  }, [fetchTasks, fetchTaskTags]);

  const refreshTaskTags = useCallback(async () => {
    setTaskTags(await fetchTaskTags());
  }, [fetchTaskTags]);

  // ponytail: upsert per (task, category), keeping the existing row's id.
  // Stable ids + the unique index (migration v5) mean a sync pull can never create
  // a second row for the same (task, category), and no rows get orphaned remotely.
  const replaceTaskTags = useCallback(async (taskId: string, tagIds: string[]) => {
    if (!db) { console.error('replaceTaskTags skipped: db unavailable'); return; }
    const now = new Date().toISOString();
    try {
      // ponytail: guests never sync, so soft deletes would pile up forever.
      // Hard-delete the removed links so they actually disappear from the DB.
      if (authStatus === "guest") {
        await db.execute(`DELETE FROM "TaskCategory" WHERE "task_id" = $1`, [taskId]);
      } else {
        await db.execute(`UPDATE "TaskCategory" SET "deleted_at" = $1, "is_synced" = 0 WHERE "task_id" = $2`, [now, taskId]);
      }
      for (const categoryId of tagIds) {
        await db.execute(
          `INSERT INTO "TaskCategory" ("id", "task_id", "category_id", "created_at", "deleted_at", "is_synced")
           VALUES ($1, $2, $3, $4, NULL, 0)
           ON CONFLICT ("task_id", "category_id") DO UPDATE SET
             "deleted_at" = NULL,
             "is_synced" = 0`,
          [crypto.randomUUID(), taskId, categoryId, now],
        );
      }
    } catch (err) {
      console.error(err);
    }
  }, [db, authStatus]);

  const addTask = useCallback(async (input: NewTaskInput, tagIds: string[] = []) => {
    if (!db) { console.error('addTask skipped: db unavailable'); return; }
    if (!input.title.trim()) return;

    const task: LocalTask = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? null,
      n_pomodoros: input.n_pomodoros ?? 1,
      user_id: localUserId,
      completed_pomodoros: 0,
      is_completed: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      is_synced: 0,
    };

    const { sql, values } = createTaskOp(task);
    await db.execute(sql, values);
    await replaceTaskTags(task.id, tagIds);
    notifyLocalChange("Task");
    notifyLocalChange("TaskCategory");

    setTasks([...tasks, task]);
    setTaskTags(await fetchTaskTags());
  }, [db, localUserId, tasks, replaceTaskTags, fetchTaskTags]);

  const updateTask = useCallback(async (id: string, input: NewTaskInput, tagIds?: string[]) => {
    if (!db) { console.error('updateTask skipped: db unavailable'); return; }
    if (!input.title.trim()) return;

    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) throw new Error("no task found");

    const updated: LocalTask = {
      ...tasks[taskIndex],
      title: input.title,
      description: input.description ?? null,
      n_pomodoros: input.n_pomodoros ?? tasks[taskIndex].n_pomodoros,
      completed_pomodoros: input.completed_pomodoros ?? tasks[taskIndex].completed_pomodoros,
      is_completed: input.is_completed !== undefined
        ? input.is_completed
        : input.completed_pomodoros !== undefined
          && input.completed_pomodoros >= (input.n_pomodoros ?? tasks[taskIndex].n_pomodoros)
          ? 1
          : tasks[taskIndex].is_completed,
      updated_at: new Date().toISOString(),
      is_synced: 0,
    };

    const { sql, values } = updateTaskOp(updated);
    await db.execute(sql, values);
    // ponytail: undefined tagIds means "don't touch tags" — a forgotten arg
    // must never silently wipe a task's categories.
    if (tagIds !== undefined) await replaceTaskTags(id, tagIds);
    
    const newTasks = [...tasks];
    newTasks[taskIndex] = updated;
    setTasks(newTasks);
    setTaskTags(await fetchTaskTags());

    notifyLocalChange("TaskCategory");
    notifyLocalChange("Task");
  }, [db, tasks, replaceTaskTags, fetchTaskTags]);

  const deleteTask = useCallback(async (task: LocalTask) => {
    if (!db) { console.error('deleteTask skipped: db unavailable'); return; }
    const deleteType: OperationType = authStatus === "guest" ? 'HARD_DELETE' : 'SOFT_DELETE';

    const { sql: linkSql, values: linkValues } = getOperation("TaskCategory", deleteType)({ task_id: task.id });
    await db.execute(linkSql, linkValues);
    
    const { sql, values } = getOperation("Task", deleteType)(task);
    await db.execute(sql, values);

    setTasks(prev => prev.filter(t => t.id !== task.id));
    
    notifyLocalChange("Task");
    notifyLocalChange("TaskCategory");
  }, [db, authStatus]);

  const clearCompleted = useCallback(async () => {
    await Promise.all(tasks.filter(t => t.is_completed === 1).map(deleteTask));
  }, [tasks, deleteTask]);

  const toggleComplete = useCallback(async (id: string) => {
    if (!db) { console.error('toggleComplete skipped: db unavailable'); return; }
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const updated: LocalTask = {
      ...tasks[taskIndex],
      is_completed: tasks[taskIndex].is_completed === 1 ? 0 : 1,
      updated_at: new Date().toISOString(),
      is_synced: 0,
    };

    const { sql, values } = updateTaskOp(updated);
    await db.execute(sql, values);

    const newTasks = [...tasks];
    newTasks[taskIndex] = updated;
    setTasks(newTasks);

    notifyLocalChange("Task");
  }, [db, tasks]);

  const incrementTaskPomodoros = useCallback(async (id: string) => {
    if (!db) return;
    const taskIndex = tasks.findIndex(t => t.id === id);
    if (taskIndex === -1) return;

    const completed = tasks[taskIndex].completed_pomodoros + 1;
    const updated: LocalTask = {
      ...tasks[taskIndex],
      completed_pomodoros: completed,
      is_completed: completed >= tasks[taskIndex].n_pomodoros ? 1 : tasks[taskIndex].is_completed,
      updated_at: new Date().toISOString(),
      is_synced: 0,
    };

    const { sql, values } = updateTaskOp(updated);
    await db.execute(sql, values);

    const newTasks = [...tasks];
    newTasks[taskIndex] = updated;
    setTasks(newTasks);

    notifyLocalChange("Task");
  }, [db, tasks]);

  useEffect(() => {
    if (authStatus === 'loading' || !db || !user) return;
    const load = async () => {
      await refreshTasks();
      if (authStatus !== 'guest') sync();
    };
    load();
  }, [db, user, authStatus, refreshTasks, sync]);

  useEffect(() => {
    const taskRemoteChanges = remoteChanges.find(remoteChange => remoteChange.table === "Task") ?? null;
    if (taskRemoteChanges && !taskRemoteChanges.remoteSynced && db) {
      const update = async () => {
        const newRemoteChanges = notifyRemoteChange("Task", true);
        setRemoteChanges([...newRemoteChanges]);
        await refreshTasks();
      };
      update();
    }
  }, [remoteChanges, db, notifyRemoteChange, setRemoteChanges, refreshTasks]);

  return (
    <TaskContext.Provider value={{ tasks, taskTags, refreshTasks, refreshTaskTags, addTask, updateTask, deleteTask, toggleComplete, clearCompleted, incrementTaskPomodoros }}>
      {children}
    </TaskContext.Provider>
  );
}

export default TaskProvider;
