import { useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth/AuthHook'
import { useDb } from '@/context/db/DbHook'
import { useTasks } from '@/context/task/TaskHook'
import type { LocalPomodoroConfig, LocalTask } from '@/db/schema.sqlite'
import type { TimerMode } from './timer-snapshot'

type ConfigRow = Pick<
  LocalPomodoroConfig,
  'focus_time' | 'short_break_time' | 'long_break_time' | 'long_break_count'
>

const DEFAULT_CONFIG: ConfigRow = {
  focus_time: 52,
  short_break_time: 17,
  long_break_time: 20,
  long_break_count: 4,
}

const nowTime = () => {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const computeMetrics = (
  tasks: Pick<LocalTask, 'n_pomodoros' | 'completed_pomodoros' | 'is_completed'>[],
  config: ConfigRow,
  startTime: string,
  timer?: { mode: TimerMode; remaining: number },
) => {
  // Remaining pomodoros of unfinished tasks; drops as pomodoros/tasks get completed.
  const sessions = tasks
    .filter(t => t.is_completed !== 1)
    .reduce((sum, t) => sum + Math.max(0, t.n_pomodoros - t.completed_pomodoros), 0)

  // Every pomodoro is followed by a break; every long_break_count-th break is a long one.
  const longBreaks = config.long_break_count > 0 ? Math.floor(sessions / config.long_break_count) : 0
  const shortBreaks = sessions - longBreaks
  const totalMinutes =
    sessions * config.focus_time +
    shortBreaks * config.short_break_time +
    longBreaks * config.long_break_time

  // An in-progress timer session only owes its time left, not its full length.
  const startedMinutes = timer
    ? Math.max(0, config[timer.mode] * 60 - timer.remaining) / 60
    : 0

  const [h, m] = startTime.split(':').map(Number)
  const end = new Date()
  end.setHours(h || 0, (m || 0) + totalMinutes - startedMinutes) // Date normalizes overflow (incl. past midnight)
  const pad = (n: number) => String(n).padStart(2, '0')

  return {
    sessions,
    finishHour: `${pad(end.getHours())}:${pad(end.getMinutes())}`,
    totalMinutes,
  }
}

const formatLength = (totalMinutes: number) =>
  totalMinutes >= 60 ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m` : `${totalMinutes}m`

const MetricsStrip = ({ mode, remaining }: { mode?: TimerMode; remaining?: number } = {}) => {
  const { localUserId } = useAuth()
  const db = useDb()
  const { tasks } = useTasks()

  const [config, setConfig] = useState<ConfigRow>(DEFAULT_CONFIG)
  const [startTime, setStartTime] = useState(nowTime)

  useEffect(() => {
    if (!db || !localUserId) return
    db.select<ConfigRow[]>(
      'SELECT focus_time, short_break_time, long_break_time, long_break_count FROM PomodoroConfig WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1',
      [localUserId],
    ).then(rows => {
      if (rows[0]) setConfig({ ...DEFAULT_CONFIG, ...rows[0] })
    })
  }, [db, localUserId])

  const { sessions, finishHour, totalMinutes } = computeMetrics(
    tasks,
    config,
    startTime,
    mode !== undefined && remaining !== undefined ? { mode, remaining } : undefined,
  )
  const unfinished = tasks.filter(t => t.is_completed !== 1)

  const stats: { label: string; value: string; sub: string }[] = [
    { label: 'Sessions left', value: String(sessions), sub: `${unfinished.length} unfinished tasks` },
    { label: 'Finishing hour', value: finishHour, sub: `starting at ${startTime || '--:--'}` },
    { label: 'Total length', value: formatLength(totalMinutes), sub: 'start to finish' },
  ]

  return (
    <section aria-label="Today" className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4 rounded-3xl border border-border bg-card px-6 py-4 shadow-sm">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Today</p>
        <Input
          type="time"
          aria-label="Starting hour"
          value={startTime}
          onChange={e => setStartTime(e.target.value)}
          className="h-7 w-32 rounded-lg border-border/70 px-2 text-xs"
        />
        <button
          type="button"
          onClick={() => setStartTime(nowTime())}
          aria-label="Reset starting hour to now"
          className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <RotateCw className="h-3.5 w-3.5" />
        </button>
      </div>
      {stats.map(s => (
        <div key={s.label} className="min-w-28">
          <p className="text-[11px] font-medium text-muted-foreground">{s.label}</p>
          <p className="text-xl font-bold tabular-nums tracking-tight text-foreground">{s.value}</p>
          <p className="text-[11px] text-muted-foreground/80">{s.sub}</p>
        </div>
      ))}
    </section>
  )
}

export default MetricsStrip
