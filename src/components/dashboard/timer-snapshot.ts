export type TimerMode = 'focus_time' | 'short_break_time' | 'long_break_time'

export type TimerSnapshot = {
  mode: TimerMode
  remaining: number
  running: boolean
  savedAt: number
  taskId: string | null
}

const MODES: TimerMode[] = ['focus_time', 'short_break_time', 'long_break_time']

const storageKey = (userId: string | null) => `pomidori:timer:${userId ?? 'anonymous'}`

// Written only on transitions (start/pause/skip/mode change) — wall-clock math
// in restoredRemaining() accounts for the time in between, including app-closed time.
export function writeTimerSnapshot(userId: string | null, snap: Omit<TimerSnapshot, 'savedAt'>): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify({ ...snap, savedAt: Date.now() }))
  } catch { /* storage unavailable — resume silently won't happen */ }
}

export function readTimerSnapshot(userId: string | null): TimerSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return null
    const s = JSON.parse(raw)
    if (
      !MODES.includes(s.mode) ||
      typeof s.remaining !== 'number' || !Number.isFinite(s.remaining) || s.remaining < 0 ||
      typeof s.running !== 'boolean' ||
      typeof s.savedAt !== 'number' || !Number.isFinite(s.savedAt)
    ) return null
    return s as TimerSnapshot
  } catch { return null }
}

/** Remaining seconds after real time has passed since the snapshot was written. */
export function restoredRemaining(
  s: Pick<TimerSnapshot, 'remaining' | 'running' | 'savedAt'>,
  nowMs = Date.now(),
): number {
  const elapsed = s.running ? Math.max(0, Math.floor((nowMs - s.savedAt) / 1000)) : 0
  return Math.max(0, s.remaining - elapsed)
}
