import { useEffect, useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IconPlayerPlay, IconPlayerPause, IconPlayerSkipForward, IconArrowLeft, IconBulb, IconApple, IconBed } from '@tabler/icons-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth/AuthHook'
import { useDb } from '@/context/db/DbHook'
import { useSync } from '@/context/sync/SyncHook'
import { notifyLocalChange } from '@/context/sync/sync-bus'
import { useTasks } from '@/context/task/TaskHook'
import type { LocalPomodoroConfig, LocalTask } from './db/schema.sqlite'
import { createPomodoroConfig } from './db/local-agnostic-operations'

type TimerMode = 'focus_time' | 'short_break_time' | 'long_break_time'

const DEFAULT_TIMES: Record<TimerMode, number> = {
  focus_time: 45 * 60,
  short_break_time: 5 * 60,
  long_break_time: 15 * 60,
}

const CANVAS = 280
const CENTER = CANVAS / 2
const DECORATIVE_R = 130
const PROGRESS_R = 115
const PROGRESS_STROKE = 4

const MODE_ICONS: Record<TimerMode, typeof IconBulb> = {
  focus_time: IconBulb,
  short_break_time: IconApple,
  long_break_time: IconBed,
}

const PomodoroTimer = () => {
  const { localUserId } = useAuth()
  const { remoteChanges, setRemoteChanges, notifyRemoteChange } = useSync()
  const { tasks } = useTasks()
  const db = useDb()
  const navigate = useNavigate()

  const [mode, setMode] = useState<TimerMode>('focus_time')
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_TIMES.focus_time)
  const [remaining, setRemaining] = useState(DEFAULT_TIMES.focus_time)
  const [running, setRunning] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<string | null>(null)
  const [config, setConfig] = useState<LocalPomodoroConfig>();

  const selectedTask: LocalTask | undefined = tasks.find(t => t.id === selectedTaskId)

  // Load config from DB
  useEffect(() => {
    if (!db || !localUserId) return
    const load = async () => {
      const rows = await db.select<LocalPomodoroConfig[]>(
        'SELECT id, user_id, focus_time, short_break_time, long_break_time, created_at, updated_at, is_synced FROM PomodoroConfig WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
        [localUserId],
      )
      console.log("rows found:", rows)
      if (rows.length === 0) {
        console.log("No rows found, creating a new config")
        const id = crypto.randomUUID();
        const now = new Date().toISOString()
        const newPomodoroConfig: LocalPomodoroConfig = {
          id,
          user_id: localUserId,
          focus_time: 52,
          short_break_time: 17,
          long_break_time: 20,
          created_at: now,
          updated_at: now,
          deleted_at: null,
          is_synced: 0
        }
        const { sql, values } = createPomodoroConfig(newPomodoroConfig);
        await db.execute(sql, values);

        setConfig(newPomodoroConfig)
        setTotalSeconds(newPomodoroConfig.focus_time * 60)
        setRemaining(newPomodoroConfig.focus_time * 60)
      }

      if (rows.length > 0) {
        const c = rows[0]
        const newConfig: LocalPomodoroConfig = {
          id: c.id,
          user_id: c.user_id,
          focus_time: c.focus_time,
          short_break_time: c.short_break_time,
          long_break_time: c.long_break_time,
          created_at: c.created_at,
          updated_at: c.updated_at,
          deleted_at: c.deleted_at,
          is_synced: c.is_synced
        }
        setConfig(newConfig)
        setTotalSeconds(c.focus_time * 60)
        setRemaining(c.focus_time * 60)
      }
    }
    load()
  }, [db, localUserId])

  // Sync remote config changes
  useEffect(() => {
    const configChange = remoteChanges.find(r => r.table === 'PomodoroConfig' && !r.remoteSynced)
    if (configChange && db) {
      const refresh = async () => {
        const newChanges = notifyRemoteChange('PomodoroConfig', true)
        setRemoteChanges([...newChanges])
        const rows = await db.select<LocalPomodoroConfig[]>(
          'SELECT focus_time, short_break_time, long_break_time FROM PomodoroConfig WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
          [localUserId],
        )
        if (rows.length > 0) {
          const c = rows[0]
          const newConfig: LocalPomodoroConfig = {
            id: c.id,
            user_id: c.user_id,
            focus_time: c.focus_time,
            short_break_time: c.short_break_time,
            long_break_time: c.long_break_time,
            created_at: c.created_at,
            updated_at: c.updated_at,
            deleted_at: c.deleted_at,
            is_synced: c.is_synced
          }
          setConfig(newConfig)
          if (!running) {
            setTotalSeconds(c.focus_time * 60)
            setRemaining(c.focus_time * 60)
          }
        }
      }
      refresh()
    }
  }, [remoteChanges, db, localUserId, running, notifyRemoteChange, setRemoteChanges])

  const logSession = useCallback(async (endedAt: string) => {
    if (!db || !localUserId || !sessionStartRef.current) return
    const id = crypto.randomUUID()
    const duration = Math.round((new Date(endedAt).getTime() - new Date(sessionStartRef.current).getTime()) / 1000)
    await db.execute(
      `INSERT INTO "PomodoroSession" ("id", "user_id", "task_id", "type", "duration", "started_at", "ended_at", "updated_at", "is_synced")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 0)`,
      [id, localUserId, selectedTaskId, mode, duration, sessionStartRef.current, endedAt],
    )
    console.log("saving pomo session")
    notifyLocalChange('PomodoroSession')
    sessionStartRef.current = null
  }, [db, localUserId, selectedTaskId, mode])

  const advanceMode = useCallback((current: TimerMode) => {
    if (!config) return
    const next: TimerMode = current === 'focus_time' ? 'short_break_time' : 'focus_time'
    setMode(next)
    setTotalSeconds(config[next] * 60)
    setRemaining(config[next] * 60)
    console.log("switching mode")

    setRunning(false)
  }, [db, localUserId])

  // Tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current)
          const now = new Date().toISOString()
          logSession(now).then(() => advanceMode(mode))
          console.log("pomo session finished")
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, mode, logSession, advanceMode])

  const handleModeChange = (next: string) => {
    if (!config) return;
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const m = next as TimerMode
    const now = new Date().toISOString()
    logSession(now).then(() => advanceMode(m))
  }

  const handleToggle = () => {
    if (!running) {
      sessionStartRef.current = new Date().toISOString()
      setRunning(true)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setRunning(false)
    }
  }

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    const now = new Date().toISOString()
    logSession(now).then(() => advanceMode(mode))
  }

  const handleBack = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    setRunning(false)
    navigate('/task', { replace: true })
  }

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  // Red progress ring — shows time left, depletes clockwise from the top
  const fraction = totalSeconds > 0 ? Math.max(0, Math.min(0.9999, remaining / totalSeconds)) : 0
  const end = -Math.PI / 2 - 2 * Math.PI * fraction
  const progressArc =
    `M ${CENTER} ${CENTER - PROGRESS_R}` +
    `A ${PROGRESS_R} ${PROGRESS_R} 0 ${fraction > 0.5 ? 1 : 0} 0` +
    ` ${CENTER + PROGRESS_R * Math.cos(end)} ${CENTER + PROGRESS_R * Math.sin(end)}`

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-sm">
        {/* Back */}
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <IconArrowLeft data-icon="inline-start" />
            Tasks
          </Button>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex justify-center">
          <Tabs value={mode} onValueChange={handleModeChange}>
            <TabsList>
              {(Object.keys(MODE_ICONS) as TimerMode[]).map(m => {
                const Icon = MODE_ICONS[m]
                return (
                  <TabsTrigger key={m} value={m}>
                    <Icon data-icon="inline-start" />
                    {m === 'focus_time' ? 'Focus' : m === 'short_break_time' ? 'Short' : 'Long'}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        {/* Timer Ring */}
        <div className="mb-8 flex justify-center">
          <div className="relative" style={{ width: CANVAS, height: CANVAS }}>
            <svg width={CANVAS} height={CANVAS}>
              <defs>
                <linearGradient id="ring-gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e5e7eb" />
                  <stop offset="100%" stopColor="#9ca3af" />
                </linearGradient>
              </defs>
              {/* Decorative outer ring */}
              <circle
                cx={CENTER}
                cy={CENTER}
                r={DECORATIVE_R}
                fill="none"
                stroke="url(#ring-gradient)"
                strokeWidth={4}
              />
              {/* Progress ring — shows time left */}
              <path
                d={progressArc}
                fill="none"
                stroke="var(--destructive)"
                strokeWidth={PROGRESS_STROKE}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className=" text-5xl font-extrabold tracking-tight text-foreground">
                {formatTime(remaining)}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Task */}
        <div className="mb-6 text-center">
          <p className="text-sm text-muted-foreground">
            {selectedTask ? selectedTask.title : 'No task selected'}
          </p>
          {tasks.length > 0 && (
            <Select value={selectedTaskId ?? ''} onValueChange={v => setSelectedTaskId(v || null)}>
              <SelectTrigger className="mx-auto mt-2">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">None</SelectItem>
                {tasks.filter(t => t.is_completed !== 1).map(t => (
                  <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            onClick={handleToggle}
            className="gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg w-25"
          >
            {running ? (
              <>
                <IconPlayerPause data-icon="inline-start" />
                Pause
              </>
            ) : (
              <>
                <IconPlayerPlay data-icon="inline-start" />
                Start
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            className=" rounded-lg w-10 pr-2.5"
          >
            <IconPlayerSkipForward data-icon="inline-start" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default PomodoroTimer
