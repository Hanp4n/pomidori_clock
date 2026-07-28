import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/context/auth/AuthHook'
import type { LocalUser } from '@/db/db-types'
import loginImage from '@/assets/img/pomofocus_login_img.png'

const Login = () => {
  const navigate = useNavigate()
  const { signInAsGuest, fetchSignedUser, signInOnline, fetchUsers, status } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [localUsers, setLocalUsers] = useState<LocalUser[]>([])
  const [showUserList, setShowUserList] = useState(false)

  //Uncomment when log out is enabled
  // useEffect(() => {
  //   if (status === 'authenticated' || status === 'guest') {
  //     navigate('/task', { replace: true })
  //   }
  // }, [status, navigate])

  const handleContinue = async () => {
    if (!email.trim()) {
      setError('Enter your email to continue.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const user = await fetchSignedUser(email.trim())
      if (!user) {
        setError('No account found with that email.')
        setLoading(false)
        return
      }
      await signInOnline(user)
      navigate('/task', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleGuest = () => {
    signInAsGuest()
    navigate('/task', { replace: true })
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
      await signInOnline(user)
      navigate('/task', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
    } finally {
      setLoading(false)
    }
  }

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
            >
              Continue as a guest
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSelectAccount}
            >
              Select account
            </Button>
          </div>

          {showUserList && localUsers.length > 0 && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Pick an account
              </p>
              {localUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handlePickUser(u)}
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{u.username || 'User'}</span>
                  <span className="ml-2 text-muted-foreground">{u.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Login
