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
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth/AuthHook'
import type { LocalTask } from './db/schema.sqlite'
import { useDb } from './context/db/DbHook'
import { useSync } from './context/sync/SyncHook'
import { notifyLocalChange } from './context/sync/sync-bus'
import { useTasks } from './context/task/TaskHook'


const TaskManager = () => {
  const { user, localUserId, signOut, status: authStatus, exit } = useAuth();
  const { remoteChanges, setRemoteChanges, notifyRemoteChange } = useSync();
  const { tasks, taskTags, addTask, updateTask, deleteTask, refreshTaskTags } = useTasks();
  const db = useDb();
  const [categories, setCategories] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [modifyTaskTags, setModifyTaskTags] = useState<string[]>([])
  const [openNewTask, setOpenNewTask] = useState(false)
  const [openModifyTaskForm, setOpenModifyTaskForm] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const navigate = useNavigate();

  // New Task Form
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    n_pomodoros: 1,
  })


  const [modifyTaskForm, setModifyTaskForm] = useState({
    title: '',
    description: '',
    n_pomodoros: 1
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
    if (!db) return;
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
    if (!db) return;
    const now = new Date().toISOString();
    await db.execute(
      `UPDATE "Category" SET "name" = $1, "color" = $2, "updated_at" = $3, "is_synced" = 0 WHERE "id" = $4`,
      [name, color, now, catId],
    );
    notifyLocalChange("Category");
    await loadTags();
  }

  const handleDeleteCategory = async (catId: string) => {
    if (!db) return;
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
    const { title, description, n_pomodoros } = task;
    setModifyTaskForm({
      title,
      description: description ?? "",
      n_pomodoros
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

  const handleDeleteTask = async (task: LocalTask) => {
    await deleteTask(task);
  }


  const handleExit = async () => {
    await exit();
    navigate('/', { replace: true });
  }

  const handleLogOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  }

  useEffect(() => {
    if (authStatus === 'loading') return;
    if (!db || !user) {
      throw Error("Error fetching tasks");
    }
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

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      {/* Header with Add Button */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-3">
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 py-2" onClick={handleExit}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Exit
            </Button>
            {
              authStatus !== 'guest' &&
              <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 py-2" onClick={handleLogOut}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Log out
              </Button>
            }
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Welcome{user ? `, ${user.username || user.email}` : ''}</h1>
            <p className="text-sm text-slate-600">
              {user ? 'Here are your tasks.' : 'No authenticated user found.'}
            </p>
          </div>
        </div>
        <Dialog open={openNewTask} onOpenChange={setOpenNewTask}>
          <DialogTrigger asChild>
            <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-lg px-6 py-2">
              <Plus className="w-4 h-4 mr-2" />
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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              Save changes
            </Button>
          </DialogContent>
        </Dialog>

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
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              Save changes
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {tasks.map(task => (
          <div
            key={task.id}
            className="bg-white p-4 rounded-lg border border-gray-200 flex items-center justify-between"
            onClick={() => handleOpenModifyTaskForm(task)}
          >
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{task.title}</h3>
              {task.description && (
                <p className="text-sm text-gray-600">{task.description}</p>
              )}
              <div className="flex gap-2 mt-2">
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-600">
                {task.completed_pomodoros}/{task.n_pomodoros}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTask(task);
                }}
              >
                <Trash2 className="w-4 h-4 text-gray-400" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default TaskManager