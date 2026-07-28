import { useCallback, useEffect, useState } from 'react'
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
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth/AuthHook'
import type Database from '@tauri-apps/plugin-sql'
import type { LocalTask } from './db/schema.sqlite'
import { useDb } from './context/db/DbHook'
import { useSync } from './context/sync/SyncHook'
import { getOperation } from './db/local-agnostic-operations'
import { notifyLocalChange } from './db/sync/sync-bus'


const Test2 = () => {
  const { user, localUserId } = useAuth();
  const { sync, remoteChanges, setRemoteChanges, notifyRemoteChange } = useSync();
  const [tasks, setTasks] = useState<LocalTask[]>([])
  const [db] = useState<Database | null>(useDb());
  const [categories, setCategories] = useState([
    { id: '1', title: 'ALG', color: '#E5E7EB' },
    { id: '2', title: 'CAL', color: '#E5E7EB' },
    { id: '3', title: 'INF', color: '#E5E7EB' },
    { id: '4', title: 'SED', color: '#FEF3C7' },
  ])
  const [openNewTask, setOpenNewTask] = useState(false)
  const [openModifyTaskForm, setOpenModifyTaskForm] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [openNewCategory, setOpenNewCategory] = useState(false)
  const [openTagDropdown, setOpenTagDropdown] = useState(false)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const navigate = useNavigate();

  // New Task Form
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    n_pomodoros: 0,
  })

  // New Category Form
  const [newCategoryForm, setNewCategoryForm] = useState({
    title: '',
    color: '#FFFFFF',
  })

  const [modifyTaskForm, setModifyTaskForm] = useState({
    title: '',
    description: '',
    n_pomodoros: 0
  })

  const handleRetrieveTasks = async () => {
    if (!db) return;

    console.log("Doing cloud sync");
    await sync();
    const actualTasks: LocalTask[] = await db.select('SELECT id, title, description, n_pomodoros as n_pomodoros, user_id, completed_pomodoros, is_completed, created_at , updated_at, deleted_at, is_synced FROM Task WHERE user_id = $1 ORDER BY created_at', [user?.id || ""]);

    console.log('Retrieved tasks from database:', actualTasks);
    return actualTasks as LocalTask[];
  };

  const handleAddTask = async () => {
    if (!db) return;
    if (newTaskForm.title.trim()) {

      const task: LocalTask = {
        id: crypto.randomUUID(),
        title: newTaskForm.title,
        description: newTaskForm.description,
        n_pomodoros: newTaskForm.n_pomodoros,
        user_id: localUserId,
        completed_pomodoros: 0,
        is_completed: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
        is_synced: 0,
      }

      await db.execute(`INSERT INTO Task (id, title, description, n_pomodoros, user_id, completed_pomodoros, is_completed, created_at, updated_at, deleted_at, is_synced) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`, [
        task.id,
        task.title,
        task.description,
        task.n_pomodoros,
        task.user_id,
        task.completed_pomodoros,
        0,
        task.created_at,
        task.updated_at,
        task.deleted_at,
        0
      ]);

      notifyLocalChange("Task");
      setTasks([...tasks, task])
      setNewTaskForm({ title: '', description: '', n_pomodoros: 0 })
      setSelectedTags([])
      setOpenNewTask(false)
    }
  }

  const handleAddCategory = () => {
    if (newCategoryForm.title.trim()) {
      const category: any = {
        id: Date.now().toString(),
        title: newCategoryForm.title,
        color: newCategoryForm.color,
      }
      setCategories([...categories, category])
      setNewCategoryForm({ title: '', color: '#FFFFFF' })
      setOpenNewCategory(false)
    }
  }

  const handleOpenModifyTaskForm = (task: LocalTask) => {
    const { title, description, n_pomodoros } = task;
    setModifyTaskForm({
      title,
      description: description ?? "",
      n_pomodoros
    })
    setSelectedTaskId(task.id);
    setOpenModifyTaskForm(true);
  }

  const handleModifyTask = async () => {
    if (!modifyTaskForm.title.trim() || !selectedTaskId) return;

    if (db) {
      const { title, description, n_pomodoros } = modifyTaskForm;
      const updatedAt = new Date().toISOString();
      await db.execute(
        `UPDATE Task SET title = $1, description = $2, n_pomodoros = $3, updated_at = $4, is_synced = $5 WHERE id = $6`,
        [title, description, n_pomodoros, updatedAt, 0, selectedTaskId]
      );
      notifyLocalChange("Task");
    }

    const taskIndex = tasks.findIndex(task => task.id === selectedTaskId);
    if (taskIndex === -1) {
      setOpenModifyTaskForm(false);
      setSelectedTaskId(null);
      return;
    }

    const updatedTask: LocalTask = {
      ...tasks[taskIndex],
      title: modifyTaskForm.title,
      description: modifyTaskForm.description,
      n_pomodoros: modifyTaskForm.n_pomodoros,
      updated_at: new Date().toISOString(),
      is_synced: 0,
    };

    const newTasks = [...tasks];
    newTasks[taskIndex] = updatedTask;
    setTasks(newTasks);
    setOpenModifyTaskForm(false);
    setSelectedTaskId(null);
  }

  const handleDeleteTask = async (task: LocalTask) => {
    if (!db) return;
    const id = task.id;
    const deleteTask = getOperation("Task", 'DELETE');
    const { sql, values } = deleteTask(task);
    await db.execute(sql, values);

    notifyLocalChange("Task");

    const newTasks = tasks.map(task => {
      if (task.id === id) {
        const softDeletedTask: LocalTask = {
          ...task,
          deleted_at: new Date().toISOString()
        }
        return softDeletedTask;
      } else {
        return task
      }
    })
    setTasks(newTasks.filter(task => task.deleted_at === null));
  }

  const handleTagToggle = (categoryId: string) => {
    setSelectedTags(prev =>
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    )
  }

  const handleExit = () => {

    navigate('/');
  }


  useEffect(() => {
    const fetchTasks = async () => {
      const actualTasks: LocalTask[] = await handleRetrieveTasks() || [];
      // console.log('Fetched tasks:', actualTasks);
      setTasks(actualTasks.filter(task => task.deleted_at === null));
    }
    if (db) {
      fetchTasks();
    }
  }, [db]);

  useEffect(() => {
    const taskRemoteChanges = remoteChanges.find(remoteChange => remoteChange.table === "Task") ?? null;
    if (taskRemoteChanges && !taskRemoteChanges.remoteSynced) {
      if (db) {
        const updateRemoteChanges = async () => {
          const newRemoteChanges = notifyRemoteChange("Task", true);
          setRemoteChanges([...newRemoteChanges])
          const actualTasks: LocalTask[] = await db.select('SELECT id, title, description, n_pomodoros as n_pomodoros, user_id, completed_pomodoros, is_completed, created_at , updated_at, deleted_at, is_synced FROM Task WHERE user_id = $1 ORDER BY created_at', [user?.id || ""]);

          // console.log('Retrieved tasks from database:', actualTasks);
          // console.log('Fetched tasks:', actualTasks);
          setTasks(actualTasks);
        }
        updateRemoteChanges();
      }
    }
  }, [remoteChanges])



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
                  min="0"
                  value={newTaskForm.n_pomodoros}
                  onChange={(e) =>
                    setNewTaskForm({
                      ...newTaskForm,
                      n_pomodoros: parseInt(e.target.value) || 0,
                    })
                  }
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
                  min="0"
                  value={modifyTaskForm.n_pomodoros}
                  onChange={(e) =>
                    setModifyTaskForm({
                      ...modifyTaskForm,
                      n_pomodoros: parseInt(e.target.value) || 0,
                    })
                  }
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

export default Test2