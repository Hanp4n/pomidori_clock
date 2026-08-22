import { createContext } from "react";
import type { LocalTask } from "@/db/schema.sqlite";
import type { Tag } from "@/components/tasks/TagSelector";

export type NewTaskInput = {
  title: string;
  description?: string | null;
  n_pomodoros?: number;
  completed_pomodoros?: number;
  is_completed?: 1 | 0;
};

export interface TaskContextValue {
  tasks: LocalTask[];
  taskTags: Record<string, Tag[]>;
  refreshTasks: () => Promise<void>;
  refreshTaskTags: () => Promise<void>;
  addTask: (input: NewTaskInput, tagIds?: string[]) => Promise<void>;
  updateTask: (id: string, input: NewTaskInput, tagIds?: string[]) => Promise<void>;
  deleteTask: (task: LocalTask) => Promise<void>;
  toggleComplete: (id: string) => Promise<void>;
  clearCompleted: () => Promise<void>;
  incrementTaskPomodoros: (id: string) => Promise<void>;
}

export const TaskContext = createContext<TaskContextValue | null>(null);
