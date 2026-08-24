import { Bell, BookOpen, ChartNoAxesColumn, Cloud, LogOut, Power, Settings, Smartphone, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/auth/AuthHook'
import { useIsOnline } from '@/context/connectivity/ConnectivityHook'
import PomodoroSettingsForm from './PomodoroSettingsForm'

interface AppNavbarProps {
  running?: boolean
}

const AppNavbar = ({ running = false }: AppNavbarProps) => {
  const navigate = useNavigate()
  const { user, status: authStatus, signOut, exit } = useAuth()
  const isOnline = useIsOnline()

  const name = user ? user.username || user.email || 'Account' : 'Guest'
  const email = user?.email ?? null
  const initial = (name[0] ?? 'P').toUpperCase()

  const handleSignOut = async () => {
    await signOut()
    navigate('/', { replace: true })
  }

  const handleExit = async () => {
    await exit()
    navigate('/', { replace: true })
  }

  const navTabClass =
    'flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40'

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav aria-label="Main" className="relative mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
        {/* Account */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Account settings"
              className="flex min-w-0 items-center gap-2.5 rounded-xl py-1 pl-1 pr-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                {initial}
              </span>
              <span className="hidden min-w-0 items-center gap-2 sm:flex">
                <span className="truncate text-sm font-semibold">{name}</span>
                <span
                  aria-hidden="true"
                  title={running ? 'Session running' : undefined}
                  className={`size-2 shrink-0 rounded-full bg-primary transition-opacity ${running ? 'animate-pulse opacity-100 motion-reduce:animate-none motion-reduce:opacity-60' : 'opacity-0'}`}
                />
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 gap-3">
            <PopoverHeader>
              <PopoverTitle>{name}</PopoverTitle>
              <p className="text-muted-foreground">
                {authStatus === 'guest'
                  ? 'Working locally — progress stays on this device.'
                  : email ?? 'Signed in'}
              </p>
            </PopoverHeader>
            <div className="flex flex-col gap-1">
              {authStatus !== 'guest' && (
                <Button variant="ghost" className="justify-start" onClick={handleSignOut}>
                  <LogOut data-icon="inline-start" />
                  Sign out
                </Button>
              )}
              <Button variant="ghost" className="justify-start" onClick={handleExit}>
                <Power data-icon="inline-start" />
                Exit
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sections */}
        <div className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1.5 md:flex">
          <div className="flex items-center gap-0.5 rounded-xl border border-border bg-card p-1 shadow-sm">
            <button type="button" aria-current="page" className={`${navTabClass} bg-slate-900 text-white hover:bg-slate-800`}>
              <BookOpen className="size-4" />
              Pomodoro
            </button>
            <button type="button" disabled title="Metrics coming later" className={navTabClass}>
              <ChartNoAxesColumn className="size-4" />
              Metrics
            </button>
            <button type="button" disabled title="Social coming later" className={navTabClass}>
              <Users className="size-4" />
              Social
            </button>
          </div>
          <button type="button" disabled title="Devices coming later" className={`${navTabClass} border border-border bg-card shadow-sm`}>
            <Smartphone className="size-4" />
            Devices
          </button>
        </div>

        {/* Status & configuration */}
        <div className="ml-auto flex items-center gap-1">
          <span
            className="mr-1 hidden h-8 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium shadow-sm lg:flex"
            title={isOnline ? 'Connected to Supabase' : 'Working offline'}
          >
            <span aria-hidden="true" className={`size-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
            <Cloud className="size-3.5 text-muted-foreground" />
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <Button variant="ghost" size="icon" disabled title="Notifications coming later">
            <Bell />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Configuration">
                <Settings />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-64 gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Configuration</p>
              <PomodoroSettingsForm />
            </PopoverContent>
          </Popover>
        </div>
      </nav>
    </header>
  )
}

export default AppNavbar
