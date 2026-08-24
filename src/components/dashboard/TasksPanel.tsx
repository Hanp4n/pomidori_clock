import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import TagSelector, { type Tag } from '@/components/tasks/TagSelector'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/auth/AuthHook'
import type { LocalTask } from '@/db/schema.sqlite'
import { useDb } from '@/context/db/DbHook'
import { useSync } from '@/context/sync/SyncHook'
import { notifyLocalChange } from '@/context/sync/sync-bus'
import { useTasks } from '@/context/task/TaskHook'

const TasksPanel = () => {
  const { user, localUserId, status: authStatus } = useAuth();
  const { remoteChanges, setRemoteChanges, notifyRemoteChange } = useSync();
  const { tasks, taskTags, addTask, updateTask, deleteTask, toggleComplete, clearCompleted, refreshTaskTags } = useTasks();
  const db = useDb();
  const [categories, setCategories] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [modifyTaskTags, setModifyTaskTags] = useState<string[]>([])
  const [openNewTask, setOpenNewTask] = useState(false)
  const [openModifyTaskForm, setOpenModifyTaskForm] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)

  // New Task Form
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    n_pomodoros: 1,
  })

  const [modifyTaskForm, setModifyTaskForm] = useState({
    title: '',
    description: '',
    n_pomodoros: 1,
    completed_pomodoros: 0,
  })

  const fetchCategories = async (): Promise<Tag[]> => {
    if (!db) return [];
    const rows = await db.select<{ id: string; name: string; color: string }[]>(
      'SELECT id, name, color FROM Category WHERE user_id = $1 AND deleted_at IS NULL ORDER BY created_at',
      [localUserId],
    );
    return rows;
  }

  const loadTags = async () => {
    setCategories(await fetchCategories());
    await refreshTaskTags();
  }

  const handleCreateCategory = async (name: string, color: string) => {
    if (!db) { console.error('createCategory skipped: db unavailable'); return; }
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.execute(
      `INSERT INTO "Category" ("id", "name", "color", "user_id", "created_at", "updated_at", "deleted_at", "is_synced")
       VALUES ($1, $2, $3, $4, $5, $5, NULL, 0)`,
      [id, name, color, localUserId, now],
    );
    notifyLocalChange("Category");
    await loadTags();
  }

  const handleUpdateCategory = async (catId: string, name: string, color: string) => {
    if (!db) { console.error('updateCategory skipped: db unavailable'); return; }
    const now = new Date().toISOString();
    await db.execute(
      `UPDATE "Category" SET "name" = $1, "color" = $2, "updated_at" = $3, "is_synced" = 0 WHERE "id" = $4`,
      [name, color, now, catId],
    );
    notifyLocalChange("Category");
    await loadTags();
  }

  const handleDeleteCategory = async (catId: string) => {
    if (!db) { console.error('deleteCategory skipped: db unavailable'); return; }
    const now = new Date().toISOString();
    if (authStatus === "guest") {
      await db.execute(`DELETE FROM "TaskCategory" WHERE "category_id" = $1`, [catId]);
      await db.execute(`DELETE FROM "Category" WHERE "id" = $1`, [catId]);
    } else {
      await db.execute(`UPDATE "TaskCategory" SET "deleted_at" = $1, "is_synced" = 0 WHERE "category_id" = $2`, [now, catId]);
      await db.execute(
        `UPDATE "Category" SET "deleted_at" = $1, "is_synced" = 0 WHERE "id" = $2`,
        [now, catId],
      );
    }
    notifyLocalChange("Category");
    await loadTags();
  }

  const handleAddTask = async () => {
    if (!newTaskForm.title.trim()) return;
    await addTask(newTaskForm, selectedTags);
    setNewTaskForm({ title: '', description: '', n_pomodoros: 1 })
    setSelectedTags([])
    setOpenNewTask(false)
  }

  const handleOpenModifyTaskForm = async (task: LocalTask) => {
    const { title, description, n_pomodoros, completed_pomodoros } = task;
    setModifyTaskForm({
      title,
      description: description ?? "",
      n_pomodoros,
      completed_pomodoros,
    })
    setSelectedTaskId(task.id);
    setModifyTaskTags((taskTags[task.id] ?? []).map(t => t.id));
    setOpenModifyTaskForm(true);
  }

  const handleModifyTask = async () => {
    if (!modifyTaskForm.title.trim() || !selectedTaskId) return;
    await updateTask(selectedTaskId, modifyTaskForm, modifyTaskTags);
    setOpenModifyTaskForm(false);
    setSelectedTaskId(null);
  }

  const handleAdjustPomodoros = (task: LocalTask, delta: number) => {
    const completed = Math.max(0, Math.min(task.n_pomodoros, task.completed_pomodoros + delta));
    updateTask(task.id, {
      title: task.title,
      description: task.description,
      n_pomodoros: task.n_pomodoros,
      completed_pomodoros: completed,
      is_completed: completed >= task.n_pomodoros ? 1 : 0,
    });
  }

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!db || !user) return;
    const loadCategories = async () => {
      await loadTags();
    };
    loadCategories();
  }, [db, user]);

  useEffect(() => {
    const categoryRemoteChanges = remoteChanges.find(remoteChange => remoteChange.table === "Category") ?? null;
    if (categoryRemoteChanges && !categoryRemoteChanges.remoteSynced) {
      if (db) {
        const updateRemoteChanges = async () => {
          const newRemoteChanges = notifyRemoteChange("Category", true);
          setRemoteChanges([...newRemoteChanges])
          setCategories(await fetchCategories());
          await refreshTaskTags();
        }
        updateRemoteChanges();
      }
    }
  }, [remoteChanges, db, refreshTaskTags])

  const openCount = tasks.filter(t => t.is_completed !== 1).length

  return (
    <section aria-label="Tasks" className="flex flex-col rounded-3xl border border-border bg-card shadow-sm lg:absolute lg:inset-0">
      {/* Panel header */}
      <div className="flex items-center justify-between gap-2 px-6 pt-5 pb-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          Tasks{openCount > 0 && <span className="ml-2 tabular-nums text-foreground">{openCount}</span>}
        </p>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive"
            disabled={tasks.every(t => t.is_completed !== 1)}
            onClick={() => {
              if (window.confirm('Delete all completed tasks?')) clearCompleted();
            }}
            title="Clear completed tasks"
          >
            <Trash2 />
          </Button>
          <Dialog open={openNewTask} onOpenChange={setOpenNewTask}>
            <DialogTrigger asChild>
              <Button size="sm" className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-background dark:text-foreground dark:border dark:border-border">
                <Plus data-icon="inline-start" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>New Task</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="Enter task title"
                    value={newTaskForm.title}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Enter description"
                    value={newTaskForm.description}
                    onChange={(e) =>
                      setNewTaskForm({ ...newTaskForm, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pomodoros">Pomodoros</Label>
                  <Input
                    id="pomodoros"
                    type="number"
                    min="1"
                    value={newTaskForm.n_pomodoros}
                    onChange={(e) =>
                      setNewTaskForm({
                        ...newTaskForm,
                        n_pomodoros: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <TagSelector
                    id="tags"
                    tags={categories}
                    selected={selectedTags}
                    onChange={setSelectedTags}
                    onCreate={handleCreateCategory}
                    onUpdate={handleUpdateCategory}
                    onDelete={handleDeleteCategory}
                  />
                </div>
              </div>
              <Button
                onClick={handleAddTask}
                className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-background dark:text-foreground dark:border dark:border-border"
              >
                Add task
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Modify dialog */}
      <Dialog
        open={openModifyTaskForm}
        onOpenChange={(open) => {
          setOpenModifyTaskForm(open);
          if (!open) {
            setSelectedTaskId(null);
            setModifyTaskTags([]);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Modify Task</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="modify-title">Title</Label>
              <Input
                id="modify-title"
                placeholder="Enter task title"
                value={modifyTaskForm.title}
                onChange={(e) =>
                  setModifyTaskForm({ ...modifyTaskForm, title: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-description">Description (Optional)</Label>
              <Input
                id="modify-description"
                placeholder="Enter description"
                value={modifyTaskForm.description}
                onChange={(e) =>
                  setModifyTaskForm({ ...modifyTaskForm, description: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-pomodoros">Pomodoros</Label>
              <Input
                id="modify-pomodoros"
                type="number"
                min="1"
                value={modifyTaskForm.n_pomodoros}
                onChange={(e) =>
                  setModifyTaskForm({
                    ...modifyTaskForm,
                    n_pomodoros: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="modify-completed-pomodoros">Completed pomodoros</Label>
              <Input
                id="modify-completed-pomodoros"
                type="number"
                min="0"
                max={modifyTaskForm.n_pomodoros}
                value={modifyTaskForm.completed_pomodoros}
                onChange={(e) =>
                  setModifyTaskForm({
                    ...modifyTaskForm,
                    completed_pomodoros: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="modify-tags">Tags</Label>
              <TagSelector
                id="modify-tags"
                tags={categories}
                selected={modifyTaskTags}
                onChange={setModifyTaskTags}
                onCreate={handleCreateCategory}
                onUpdate={handleUpdateCategory}
                onDelete={handleDeleteCategory}
              />
            </div>
          </div>
          <Button
            onClick={handleModifyTask}
            className="w-full rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-background dark:text-foreground dark:border dark:border-border"
          >
            Save changes
          </Button>
        </DialogContent>
      </Dialog>

      {/* Task rows */}
      {tasks.length === 0 ? (
        <div className="mx-6 mb-6 flex flex-1 items-center justify-center rounded-2xl border border-dashed border-border py-10 text-sm text-muted-foreground">
          No tasks yet — add your first one.
        </div>
      ) : (
        <ul className="min-h-0 flex-1 divide-y divide-border overflow-y-auto border-t border-border">
          {tasks.map(task => (
            <li
              key={task.id}
              className="relative cursor-pointer overflow-hidden px-6 py-3 transition-colors hover:bg-muted/50"
              onClick={() => handleOpenModifyTaskForm(task)}
            >
              <div className="flex items-center justify-between gap-3">
                <Checkbox
                  checked={task.is_completed === 1}
                  onCheckedChange={() => toggleComplete(task.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="shrink-0"
                  aria-label={`Mark ${task.title} as completed`}
                />
                <div className="min-w-0 flex-1 pl-1">
                  <div className="flex min-w-0 items-center gap-2">
                    <h3 className={`truncate text-sm font-semibold ${task.is_completed === 1 ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{task.title}</h3>
                    {(taskTags[task.id] ?? []).map(tag => (
                      <span
                        key={tag.id}
                        className="inline-flex h-5 shrink-0 items-center rounded-full px-2 text-[11px] font-semibold"
                        style={{ backgroundColor: tag.color }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                  {task.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{task.description}</p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      className="flex h-7 w-6 items-center justify-center hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); handleAdjustPomodoros(task, 1); }}
                      disabled={task.completed_pomodoros >= task.n_pomodoros}
                      aria-label="Increment completed pomodoros"
                    >
                      <ChevronUp className="size-3.5 text-muted-foreground" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleAdjustPomodoros(task, -1); }}
                      disabled={task.completed_pomodoros <= 0}
                      aria-label="Decrement completed pomodoros"
                      className={`h-7 px-1.5 text-xs font-medium tabular-nums hover:bg-muted disabled:pointer-events-none ${task.completed_pomodoros >= task.n_pomodoros ? 'text-primary' : 'text-muted-foreground'}`}
                    >
                      {task.completed_pomodoros}/{task.n_pomodoros}
                    </button>
                    <button
                      type="button"
                      className="flex h-7 w-6 items-center justify-center hover:bg-muted"
                      onClick={(e) => { e.stopPropagation(); handleAdjustPomodoros(task, -1); }}
                      disabled={task.completed_pomodoros <= 0}
                      aria-label="Decrement completed pomodoros"
                    >
                      <ChevronDown className="size-3.5 text-muted-foreground" />
                    </button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTask(task);
                    }}
                    aria-label={`Delete ${task.title}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {/* Pomodoro progress */}
              <div
                className="absolute bottom-0 left-0 h-[3px] rounded-r-full bg-primary transition-all"
                style={{
                  width: task.n_pomodoros > 0
                    ? `${Math.min(100, (task.completed_pomodoros / task.n_pomodoros) * 100)}%`
                    : '0%',
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default TasksPanel
