import { useState } from 'react'
import AppNavbar from '@/components/dashboard/AppNavbar'
import PomodoroCard from '@/components/dashboard/PomodoroCard'
import TasksPanel from '@/components/dashboard/TasksPanel'
import MetricsStrip from '@/components/dashboard/MetricsStrip'
import type { TimerMode } from '@/components/dashboard/timer-snapshot'

const DEFAULT_TIMES: Record<TimerMode, number> = {
  focus_time: 45 * 60,
  short_break_time: 5 * 60,
  long_break_time: 15 * 60,
}

const Dashboard = () => {
  const [running, setRunning] = useState(false)
  const [mode, setMode] = useState<TimerMode>('focus_time')
  const [remaining, setRemaining] = useState(DEFAULT_TIMES.focus_time)

  return (
    <div className="dot-grid flex h-dvh flex-col overflow-y-auto overflow-x-hidden">
      <AppNavbar running={running} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-4 py-6 pb-24 sm:px-6 lg:pb-50">
        <div className="grid min-h-0 gap-4 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
          <PomodoroCard running={running} setRunning={setRunning} mode={mode} setMode={setMode} remaining={remaining} setRemaining={setRemaining} />
          <div className="relative">
            <TasksPanel />
          </div>
        </div>
        <MetricsStrip mode={mode} remaining={remaining} />
      </main>
    </div>
  )
}

export default Dashboard
