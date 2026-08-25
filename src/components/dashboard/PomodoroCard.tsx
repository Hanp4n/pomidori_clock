import { useEffect, useState, useRef, useCallback, type Dispatch, type SetStateAction } from 'react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { IconPlayerPlay, IconPlayerPause, IconPlayerSkipForward, IconBulb, IconApple, IconBed } from '@tabler/icons-react'
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { Command } from '@tauri-apps/plugin-shell'
import { useAuth } from '@/context/auth/AuthHook'
import { useDb } from '@/context/db/DbHook'
import { notifyLocalChange } from '@/context/sync/sync-bus'
import { useSync } from '@/context/sync/SyncHook'
import { useTasks } from '@/context/task/TaskHook'
import { usePomodoroConfig } from '@/context/pomodoro-config/PomodoroConfigHook'
import type { LocalPomodoroConfig, LocalTask } from '@/db/schema.sqlite'
import { readTimerSnapshot, restoredRemaining, writeTimerSnapshot, type TimerMode, type TimerSnapshot } from './timer-snapshot'
import finishedSound from '@/assets/audio/finished_pomodoro2.mp3'

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

const sendNativeNotification = async (body: string) => {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      const perm = await requestPermission()
      granted = perm === 'granted'
    }
    if (!granted) return
    // Shell out to notify-send (reliable on Linux; the Tauri notification plugin silently fails here).
    const isTauri = !!(window as unknown as Record<string, unknown>).__TAURI_INTERNALS__
    if (isTauri) {
      try {
        await Command.create('notify-send', ['-a', 'Pomidori Clock', 'Pomidori Clock 🍅', body]).execute()
      } catch {
        // notify-send is Linux-only; fall back to the Tauri notification plugin on other OSes.
        try {
          sendNotification({ title: 'Pomidori Clock 🍅', body })
        } catch { /* no notification channel available */ }
      }
    } else {
      sendNotification({ title: 'Pomidori Clock 🍅', body })
    }
  } catch {
    try {
      new window.Notification('Pomidori Clock 🍅', { body })
    } catch { /* ignore */ }
  }
}

// Test hook — call `window.testNotify()` from the Tauri WebView DevTools console
;(window as unknown as Record<string, unknown>).testNotify = () =>
  sendNativeNotification('Test notification — if you see this, the plumbing works')

interface PomodoroCardProps {
  running: boolean
  setRunning: Dispatch<SetStateAction<boolean>>
  mode: TimerMode
  setMode: Dispatch<SetStateAction<TimerMode>>
  remaining: number
  setRemaining: Dispatch<SetStateAction<number>>
}

const PomodoroCard = ({ running, setRunning, mode, setMode, remaining, setRemaining }: PomodoroCardProps) => {
  const { localUserId } = useAuth()
  const { tasks, incrementTaskPomodoros } = useTasks()
  const db = useDb()
  const { config } = usePomodoroConfig()
  const { remoteChanges, setRemoteChanges, notifyRemoteChange } = useSync()

  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_TIMES.focus_time)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const sessionStartRef = useRef<string | null>(null)
  const focusStreakRef = useRef(0)
  const modeRef = useRef(mode)
  useEffect(() => { modeRef.current = mode }, [mode])
  const lastAppliedConfig = useRef<LocalPomodoroConfig | null>(null)
  const didRestoreRef = useRef(false)

  const selectedTask: LocalTask | undefined =
    tasks.find(t => t.id === selectedTaskId && t.is_completed !== 1)
  const activeSelectedTaskId = selectedTask?.id ?? null

  // Applies a timer snapshot to the clock — used both for restoring an
  // interrupted session on startup and for applying another device's
  // transition (start/pause/skip) pulled in by the sync pipeline.
  const applyRestoredSnapshot = useCallback((saved: TimerSnapshot) => {
    if (!config) return
    const remainingNow = restoredRemaining(saved)
    setMode(saved.mode)
    setTotalSeconds(config[saved.mode] * 60)
    setRemaining(remainingNow)
    setSelectedTaskId(saved.taskId)
    if (saved.running) {
      sessionStartRef.current = new Date(saved.savedAt).toISOString()
      setRunning(true)
    } else {
      // also covers a pause that happened on another device
      if (intervalRef.current) clearInterval(intervalRef.current)
      sessionStartRef.current = null
      setRunning(false)
    }
    // keep the localStorage mirror in step so a restart resumes from synced state
    writeTimerSnapshot(localUserId, { mode: saved.mode, remaining: remainingNow, running: saved.running, taskId: saved.taskId })
  }, [config, localUserId, setRunning, setMode, setRemaining])

  // Mirrors each snapshot into the synced TimerState row (id = userId:
  // exactly one per user). The push debounce + realtime channel take it
  // from there; countdowns are derived locally from saved_at on each device.
  const saveTimerState = useCallback((snap: Omit<TimerSnapshot, 'savedAt'>) => {
    if (!db || !localUserId) return
    const nowIso = new Date().toISOString()
    db.execute(
      `INSERT INTO "TimerState" ("id", "user_id", "mode", "remaining", "running", "saved_at", "task_id", "created_at", "updated_at", "is_synced")
       VALUES ($1, $1, $2, $3, $4, $5, $6, $5, $5, 0)
       ON CONFLICT("id") DO UPDATE SET
         "mode" = $2, "remaining" = $3, "running" = $4, "saved_at" = $5, "task_id" = $6, "updated_at" = $5, "is_synced" = 0`,
      [localUserId, snap.mode, snap.remaining, snap.running ? 1 : 0, nowIso, snap.taskId],
    ).then(() => notifyLocalChange('TimerState')).catch(console.error)
  }, [db, localUserId])

  // Config changes (saved here or synced from another device) reset the displayed
  // clock to the *current mode's* duration — never hardcode focus_time, and never
  // clobber a session in progress.
  useEffect(() => {
    if (!config || config === lastAppliedConfig.current) return
    lastAppliedConfig.current = config

    // Once, on first config load: resume a timer interrupted by reload/close.
    // The snapshot's wall-clock timestamp covers time the app was shut.
    if (!running && !didRestoreRef.current) {
      didRestoreRef.current = true
      const saved = readTimerSnapshot(localUserId)
      if (saved) {
        // Restoring persisted state on mount is the whole point here — same
        // exemption as ConnectivityProvider's status restore.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        applyRestoredSnapshot(saved)
        return
      }
    }

    if (!running) {
      setTotalSeconds(config[modeRef.current] * 60)
      setRemaining(config[modeRef.current] * 60)
    }
  }, [config, running, localUserId, setRunning, setRemaining, applyRestoredSnapshot])

  // Focus sessions completed since the last long break — read once at startup,
  // then kept in memory so finishing/skipping never waits on a DB round trip.
  useEffect(() => {
    if (!db || !localUserId) return
    db.select<{ n: number }[]>(
      `SELECT COUNT(*) AS n FROM PomodoroSession
       WHERE user_id=$1 AND type='focus'
         AND started_at > COALESCE((SELECT MAX(started_at) FROM PomodoroSession
                                    WHERE user_id=$1 AND type='long_break'), '')`,
      [localUserId],
    ).then(rows => { focusStreakRef.current = rows[0]?.n ?? 0 }).catch(console.error)
  }, [db, localUserId])

  // Another device moved the timer: the pull already landed the newer row in
  // SQLite, so applying it is just reading it back through the same snapshot
  // path as a startup restore.
  // ponytail: if both devices run timers simultaneously both will expire and
  // each logs its own PomodoroSession — fine for single-user use; needs leader
  // election if that ever matters.
  useEffect(() => {
    const rc = remoteChanges.find(c => c.table === 'TimerState') ?? null
    if (!rc || rc.remoteSynced || !db || !config || !localUserId) return

    const applyRemoteTimer = async () => {
      setRemoteChanges(notifyRemoteChange('TimerState', true))
      const rows = await db.select<Array<{
        mode: TimerMode
        remaining: number
        running: 1 | 0
        saved_at: string
        task_id: string | null
      }>>(
        'SELECT mode, remaining, running, saved_at, task_id FROM TimerState WHERE user_id = $1 LIMIT 1',
        [localUserId],
      ).catch(err => { console.error('Failed reading TimerState:', err); return [] })
      const s = rows[0]
      if (!s) return
      applyRestoredSnapshot({
        mode: s.mode,
        remaining: s.remaining,
        running: !!s.running,
        savedAt: Date.parse(s.saved_at),
        taskId: s.task_id,
      })
    }

    applyRemoteTimer()
  }, [remoteChanges, db, config, localUserId, notifyRemoteChange, setRemoteChanges, applyRestoredSnapshot])

  // Background writer only — fire-and-forget, never blocks the mode transition.
  const logSession = useCallback((type: 'focus' | 'short_break' | 'long_break', startedAt: string) => {
    if (!db || !localUserId) return
    const endedAt = new Date().toISOString()
    const duration = Math.max(0, Math.round((Date.parse(endedAt) - Date.parse(startedAt)) / 1000))
    db.execute(
      `INSERT INTO "PomodoroSession" ("id", "user_id", "task_id", "type", "duration", "started_at", "ended_at", "updated_at", "is_synced")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, 0)`,
      [crypto.randomUUID(), localUserId, activeSelectedTaskId, type, duration, startedAt, endedAt],
    ).then(() => {
      notifyLocalChange('PomodoroSession')
      if (type === 'focus' && activeSelectedTaskId) incrementTaskPomodoros(activeSelectedTaskId)
    }).catch(console.error)
  }, [db, localUserId, activeSelectedTaskId, incrementTaskPomodoros])

  // Closes the current session and switches modes. Fully synchronous: the session
  // is closed before any async work starts, so rapid skips/expiries can't
  // double-log or queue stale transitions behind IPC round trips.
  const finishSession = useCallback((chosen?: TimerMode) => {
    if (!config || !sessionStartRef.current) return
    const startedAt = sessionStartRef.current
    sessionStartRef.current = null
    logSession(mode === 'focus_time' ? 'focus' : mode === 'short_break_time' ? 'short_break' : 'long_break', startedAt)

    let next: TimerMode
    if (chosen) {
      next = chosen
    } else if (mode !== 'focus_time') {
      next = 'focus_time'
    } else {
      focusStreakRef.current += 1
      next = focusStreakRef.current % config.long_break_count === 0 ? 'long_break_time' : 'short_break_time'
    }
    if (next === 'long_break_time') focusStreakRef.current = 0

    setMode(next)
    setTotalSeconds(config[next] * 60)
    setRemaining(config[next] * 60)
    setRunning(false)
    writeTimerSnapshot(localUserId, { mode: next, remaining: config[next] * 60, running: false, taskId: activeSelectedTaskId })
    saveTimerState({ mode: next, remaining: config[next] * 60, running: false, taskId: activeSelectedTaskId })
  }, [config, mode, logSession, setRunning, setMode, setRemaining, localUserId, activeSelectedTaskId, saveTimerState])

  // Tick
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }
    intervalRef.current = setInterval(() => {
      setRemaining(prev => Math.max(0, prev - 1))
    }, 1000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, setRemaining])

  // Session expiry — runs once per commit where remaining hits 0 while running
  useEffect(() => {
    if (!running || remaining !== 0) return
    if (intervalRef.current) clearInterval(intervalRef.current)
    new Audio(finishedSound).play()
    const label = mode === 'focus_time' ? 'Focus session' : mode === 'short_break_time' ? 'Short break' : 'Long break'
    sendNativeNotification(`${label} finished!`)
    finishSession()
  }, [remaining, running, mode, finishSession])

  const handleModeChange = (next: string) => {
    if (!config) return;
    if (intervalRef.current) clearInterval(intervalRef.current)
    const m = next as TimerMode
    if (sessionStartRef.current) {
      finishSession(m) // logs the interrupted session, jumps to the clicked tab
    } else {
      setMode(m)
      setTotalSeconds(config[m] * 60)
      setRemaining(config[m] * 60)
      writeTimerSnapshot(localUserId, { mode: m, remaining: config[m] * 60, running: false, taskId: activeSelectedTaskId })
      saveTimerState({ mode: m, remaining: config[m] * 60, running: false, taskId: activeSelectedTaskId })
    }
  }

  const handleToggle = async () => {
    if (!running) {
      sessionStartRef.current = new Date().toISOString()
      setRunning(true)
      writeTimerSnapshot(localUserId, { mode, remaining, running: true, taskId: activeSelectedTaskId })
      saveTimerState({ mode, remaining, running: true, taskId: activeSelectedTaskId })
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setRunning(false)
      writeTimerSnapshot(localUserId, { mode, remaining, running: false, taskId: activeSelectedTaskId })
      saveTimerState({ mode, remaining, running: false, taskId: activeSelectedTaskId })
    }
  }

  const handleSkip = () => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    finishSession()
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
    <section aria-label="Pomodoro timer" className="flex w-full flex-col self-start rounded-3xl border border-border bg-card p-6 shadow-sm">
      {/* Mode tabs */}
      <div className="mb-6 flex justify-center">
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

      {/* Timer ring */}
      <div className="mb-4 flex justify-center">
        <div className="relative" style={{ width: CANVAS, height: CANVAS }}>
          <svg width={CANVAS} height={CANVAS}>
            <defs>
              <linearGradient id="ring-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--secondary)" />
                <stop offset="100%" stopColor="var(--muted-foreground)" />
              </linearGradient>
            </defs>
            {/* Decorative outer halo */}
            <circle
              cx={CENTER}
              cy={CENTER}
              r={DECORATIVE_R}
              fill="none"
              stroke="url(#ring-gradient)"
              strokeWidth={4}
              className="motion-reduce:hidden"
              style={{
                transformOrigin: `${CENTER}px ${CENTER}px`,
                animation: running ? 'rotate-gradient 8s linear infinite' : undefined,
              }}
            />
            {/* Progress ring — shows time left */}
            <path
              d={progressArc}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={PROGRESS_STROKE}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1">
            <span className={`text-5xl font-bold tracking-tight tabular-nums text-foreground transition-colors ${running ? '' : 'text-muted-foreground/70'}`}>
              {formatTime(remaining)}
            </span>
            <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {mode === 'focus_time' ? 'Focus' : mode === 'short_break_time' ? 'Short break' : 'Long break'}
            </span>
          </div>
        </div>
      </div>

      {/* Selected task */}
      <div className="mb-5 text-center">  
        { (
          <Select value={activeSelectedTaskId ?? ''} onValueChange={v => {
            const nextId = v || null
            setSelectedTaskId(nextId)
            saveTimerState({ mode, remaining, running, taskId: nextId })
          }}>
            <SelectTrigger className="mx-auto mt-2 h-8 max-w-[240px]" aria-label="Select a task">
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
          size="lg"
          className="w-28 rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-background dark:text-foreground dark:border dark:border-border"
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
        {running && (
          <Button variant="outline" onClick={handleSkip} className="rounded-xl" title="End this session and move on">
            <IconPlayerSkipForward data-icon="inline-start" />
            Skip
          </Button>
        )}
      </div>
    </section>
  )
}

export default PomodoroCard
