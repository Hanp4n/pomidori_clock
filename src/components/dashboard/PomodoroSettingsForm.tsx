import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { usePomodoroConfig } from '@/context/pomodoro-config/PomodoroConfigHook'

type Draft = {
  focus_time: number
  short_break_time: number
  long_break_time: number
  long_break_count: number
  focus_auto: boolean
  break_auto: boolean
  sound_enabled: boolean
}

const clampMinutes = (value: number) =>
  Math.min(180, Math.max(1, Math.round(Number.isFinite(value) ? value : 1)))

const NUMBER_FIELDS = [
  { key: 'focus_time', label: 'Focus (min)' },
  { key: 'short_break_time', label: 'Short break (min)' },
  { key: 'long_break_time', label: 'Long break (min)' },
  { key: 'long_break_count', label: 'Long break every' },
] as const

const AUTO_FIELDS = [
  { key: 'focus_auto', label: 'Auto-start pomodoros' },
  { key: 'break_auto', label: 'Auto-start breaks' },
  { key: 'sound_enabled', label: 'Play finish sound' },
] as const

const PomodoroSettingsForm = () => {
  const { config, updateConfig } = usePomodoroConfig()

  // The popover remounts on every open, so seed straight from the live row;
  // zeros below are unreachable placeholders for the config-still-loading case.
  const [draft, setDraft] = useState<Draft>(() =>
    config
      ? {
          focus_time: config.focus_time,
          short_break_time: config.short_break_time,
          long_break_time: config.long_break_time,
          long_break_count: config.long_break_count,
          focus_auto: config.focus_auto === 1,
          break_auto: config.break_auto === 1,
          sound_enabled: config.sound_enabled === 1,
        }
      : { focus_time: 0, short_break_time: 0, long_break_time: 0, long_break_count: 0, focus_auto: false, break_auto: false, sound_enabled: false },
  )
  const [seededFrom, setSeededFrom] = useState(config)

  // Nothing renders until the real row is loaded — the form never invents defaults.
  if (!config) return null

  if (config !== seededFrom) {
    // Re-seed the draft whenever the provider hands us a new config object
    // (initial load, remote sync) — the React-endorsed adjust-during-render pattern.
    setSeededFrom(config)
    setDraft({
      focus_time: config.focus_time,
      short_break_time: config.short_break_time,
      long_break_time: config.long_break_time,
      long_break_count: config.long_break_count,
      focus_auto: config.focus_auto === 1,
      break_auto: config.break_auto === 1,
      sound_enabled: config.sound_enabled === 1,
    })
  }

  const isDirty =
    draft.focus_time !== config.focus_time ||
    draft.short_break_time !== config.short_break_time ||
    draft.long_break_time !== config.long_break_time ||
    draft.long_break_count !== config.long_break_count ||
    draft.focus_auto !== (config.focus_auto === 1) ||
    draft.break_auto !== (config.break_auto === 1) ||
    draft.sound_enabled !== (config.sound_enabled === 1)

  const save = () => {
    updateConfig({
      focus_time: clampMinutes(draft.focus_time),
      short_break_time: clampMinutes(draft.short_break_time),
      long_break_time: clampMinutes(draft.long_break_time),
      long_break_count: clampMinutes(draft.long_break_count),
      focus_auto: draft.focus_auto ? 1 : 0,
      break_auto: draft.break_auto ? 1 : 0,
      sound_enabled: draft.sound_enabled ? 1 : 0,
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pomodoro</p>
      <div className="grid grid-cols-2 gap-2">
        {NUMBER_FIELDS.map(({ key, label }) => (
          <Label key={key} className="flex-col items-stretch gap-1.5">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Input
              type="number"
              inputMode="numeric"
              min={1}
              max={180}
              value={draft[key]}
              onChange={e => setDraft(prev => ({ ...prev, [key]: e.target.valueAsNumber || prev[key] }))}
            />
          </Label>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {AUTO_FIELDS.map(({ key, label }) => (
          <div key={key} className="flex items-center justify-between gap-2">
            <Label htmlFor={`pomodoro-${key}`} className="text-sm font-normal">{label}</Label>
            <Switch
              id={`pomodoro-${key}`}
              checked={draft[key]}
              onCheckedChange={checked => setDraft(prev => ({ ...prev, [key]: checked }))}
            />
          </div>
        ))}
      </div>
      <Button variant="outline" className="justify-start" disabled={!isDirty} onClick={save}>
        Save changes
      </Button>
    </div>
  )
}

export default PomodoroSettingsForm
