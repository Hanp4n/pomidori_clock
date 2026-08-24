import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth/AuthHook'
import type { LocalUser } from '@/db/db-types'
import loginImage from '@/assets/img/pomofocus_login_img.png'
import { useIsOnline } from '@/context/connectivity/ConnectivityHook'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const Login = () => {
  const navigate = useNavigate()
  const { signInAsAGuest, signInOnline, fetchUsers, refreshSession, setUser, setLocalUserId } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [localUsers, setLocalUsers] = useState<LocalUser[]>([])
  const [showUserList, setShowUserList] = useState(false)
  const isOnline = useIsOnline();

  const handleContinue = async () => {
    if (!email.trim()) {
      setError('Enter your email to continue.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // const user = await fetchSignedUser(email.trim())
      // if (!user) {
      //   setError('No account found with that email.')
      //   setLoading(false)
      //   return
      // }
      console.log("sign in...")
      await signInOnline(email.trim(), password)
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = async () => {
    setLoading(true)
    setError(null)
    try {
      // Await before navigating — mounting the dashboard first would render
      // the previous account's data while the guest session is still loading.
      await signInAsAGuest()
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAccount = async () => {
    const users = await fetchUsers()
    if (users && users.length > 0) {
      setLocalUsers(users.filter((u) => !u.is_guest))
      setShowUserList(true)
    } else {
      setError('No saved accounts found.')
    }
  }

  const handlePickUser = async (user: LocalUser) => {
    setLoading(true)
    setError(null)
    setShowUserList(false)
    try {
      setUser(user);
      setLocalUserId(user.id);
      await refreshSession(user);
      navigate('/app', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("is online: ", isOnline);
    if(!isOnline){
      navigate("/offline", {replace: true});
    }
  }, [isOnline, navigate])
  

  return (
    <div className="flex min-h-dvh">
      <div className="hidden lg:flex w-1/2 relative overflow-hidden">
        <img
          src={loginImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight">
              Pomidori Clock
            </h1>
            <p className="text-sm text-muted-foreground">
              Sign in to pick up where you left off.
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleContinue()}
              />
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/register')}
            >
              Register
            </Button>
            <Button
              className="flex-1"
              onClick={handleContinue}
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Continue'}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                or
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <Button
              variant="secondary"
              className="w-full"
              onClick={handleGuest}
              disabled={loading}
            >
              Continue as a guest
            </Button>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleSelectAccount}
              >
                Select account
              </Button>
              
            </div>
          </div>

          <Dialog open={showUserList} onOpenChange={setShowUserList}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Pick an account</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-1">
                {localUsers.map((u) => (
                  <Button
                    key={u.id}
                    variant="ghost"
                    className="justify-start font-normal"
                    onClick={() => handlePickUser(u)}
                  >
                    <span className="font-medium">{u.username || 'User'}</span>
                    <span className="ml-auto text-muted-foreground">{u.email}</span>
                  </Button>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  )
}

export default Login
