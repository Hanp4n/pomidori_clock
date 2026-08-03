import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/auth/AuthHook'
import type { LocalUser } from '@/db/db-types'
import loginImage from '@/assets/img/pomofocus_login_img.png'
import { useIsOnline } from '@/context/connectivity/ConnectivityHook'

const OfflineLogin = () => {
  const navigate = useNavigate()
  const { fetchUsers, signInOffline, status } = useAuth()

  const [localUsers, setLocalUsers] = useState<LocalUser[]>([])
  const [selectedUser, setSelectedUser] = useState<LocalUser | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const isOnline = useIsOnline();

  useEffect(() => {
    if(isOnline){
      navigate("/login", {replace: true})
    }
  }, [isOnline, navigate])

  useEffect(() => {
    const load = async () => {
      const users = await fetchUsers()
      if (users) {
        setLocalUsers(users.filter((u) => !u.is_guest && u.email))
      }
    }
    load()
  }, [status, navigate, fetchUsers])

  useEffect(() => {
    if (status === 'pending') {
      navigate('/task', { replace: true })
    }
  }, [status, navigate])

  const handleSignIn = async () => {
    if (!selectedUser || !selectedUser.email) return
    if (!password.trim()) {
      setError('Enter your password.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await signInOffline(selectedUser.email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.')
      setLoading(false)
    }
  }

  const handleSelectUser = (u: LocalUser) => {
    setSelectedUser(u)
    setPassword('')
    setError(null)
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
              Offline sign in
            </h1>
            <p className="text-sm text-muted-foreground">
              {selectedUser
                ? `Enter your password for ${selectedUser.email}`
                : 'Pick a saved account to sign in without internet.'}
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {selectedUser ? (
            <div className="space-y-4">
              <div className="rounded-lg border bg-card p-4">
                <p className="font-medium">{selectedUser.username || 'User'}</p>
                <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
              </div>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSelectedUser(null)}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSignIn}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign in offline'}
                </Button>
              </div>
            </div>
          ) : localUsers.length === 0 ? (
            <div className="rounded-lg border bg-card p-6 text-center">
              <p className="text-muted-foreground">
                No saved accounts found.
              </p>
              
            </div>
          ) : (
            <div className="space-y-2">
              {localUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectUser(u)}
                  className="w-full rounded-lg border bg-card p-4 text-left hover:bg-muted transition-colors"
                >
                  <p className="font-medium">{u.username || 'User'}</p>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </button>
              ))}
             
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OfflineLogin
