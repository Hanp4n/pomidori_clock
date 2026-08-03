import type { LocalUser } from '@/db/schema.sqlite';
import { supabase } from '../../db/supabase';
import { useEffect, useState } from 'react'
import { getDb } from '@/db/db';
import type { AuthContextValue, AuthStatus } from './AuthContext';
import { AuthContext } from './AuthContext';
import { useDb } from '../db/DbHook';
import { createUser } from '@/db/local-agnostic-operations';
import { AuthApiError, AuthRetryableFetchError, AuthSessionMissingError } from '@supabase/supabase-js';
import { saveSession, getSession, clearSession, getSessionKey } from './session-keychain';
import { ReconnectDialog } from '@/components/auth/ReconnectDialog';


const GUEST_ID = '00000000-0000-0000-0000-000000000000';

const USER_COLUMNS = 'id, username, email, is_guest, created_at';

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [localUserId, setLocalUserId] = useState(GUEST_ID);
  const [needsReauth, setNeedsReauth] = useState(false);
  const db = useDb();

  async function fetchUsers() {
    if (!db) { return; }
    return await db.select(`SELECT ${USER_COLUMNS} FROM "User" ORDER BY created_at DESC`) as LocalUser[];
  }

  async function fetchSignedUser(email: string) {
    if (!db) return;
    const existing = (await db.select(`SELECT ${USER_COLUMNS} FROM "User" WHERE email = $1 LIMIT 1`, [email.trim()])) as LocalUser[];

    let user: LocalUser = existing[0];

    if (!user) {
      const { data, error } = await supabase
        .schema('pomidori_clock')
        .from('User')
        .select('id, username, email, created_at')
        .eq('email', email)
        .maybeSingle();

      if (error || !data) throw new Error('Failed to fetch a remote user.');
      user = {
        ...data,
        is_guest: 0,
      }
      const { sql, values } = createUser(user);
      await db.execute(sql, values);
    }

    if (!user) throw new Error('Failed to create or find local user.');
    return user;
  }

  async function waitForRemoteUser(userId: string, attempts = 3) {
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 5000));

      const { data, error } = await supabase
        .schema('pomidori_clock')
        .from('User')
        .select('id, username, email, created_at')
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        return data;
      }
    }

    throw new Error('The user was created in Auth, but no matching row was found in the remote User table yet.');
  }

  async function signInOnline(user: LocalUser, password: string) {
    if (!db) { return; }

    try {
      if (!user.email) {
        throw new Error('User email not available for sign in.');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      })

      if (error) {
        throw error;
      }

      if (data.session) {
        await saveSession(getSessionKey(user), {
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      await db.execute(
        `UPDATE "AppState" SET active_user_id = $1 WHERE id = 1`,
        [user.id]
      );

      setStatus('authenticated');
      setLocalUserId(user.id);
      setUser(user);
    } catch (err) {
      console.error('Sign in error:', err);
      throw err;
    }
  }

  async function signInOffline(email: string) {
    if (!db) { return; }

    try {
      const users: LocalUser[] = await fetchUsers() ?? [];
      const localUser = users.find((u) => u.email === email);

      if (!localUser) {
        throw new Error('No account found with that email.');
      }

      setStatus('pending');
      setLocalUserId(localUser.id);
      setUser(localUser);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed.';
      console.error('Offline sign in error:', err);
      throw new Error(message);
    }
  }

  async function signUpOnline(email: string, username: string, password: string = 'temporary-password') {
    if (!db) { return; }
    try {

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Supabase Auth did not return a user.');

      if (authData.session) {
        await saveSession(getSessionKey({ id: authData.user.id }), {
          access_token: authData.session.access_token,
          refresh_token: authData.session.refresh_token,
        });
      }

      const data = await waitForRemoteUser(authData.user.id);

      const newLocalUser: LocalUser = {
        id: data.id,
        username: data.username,
        email: data.email,
        is_guest: 0,
        created_at: data.created_at,
      }
      const insertOperation = createUser(newLocalUser);
      const { sql, values } = insertOperation;

      await db.execute(sql, values);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed.';
      console.error('Online sign up error:', err);
      throw new Error(message);
    }
  }

  async function reconnectOnlineSession() {
    if (!db || !user) { return; }

    const session = await getSession(getSessionKey(user));
    if (!session) { return; }

    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    if (error) {
      console.error('Failed to restore session from keychain:', error);
      await clearSession(getSessionKey(user));
    }
  }

  const handleReauth = async (password: string) => {
    if (!user) return;
    await signInOnline(user, password);
    setNeedsReauth(false);
  };

  async function refreshSession(userAuth: LocalUser | null = user) {
    if(!userAuth) return;
    try {
      const session = await getSession(getSessionKey(userAuth));
      console.log("internet regained, restoring session with:", session)

      if (!session || !session.refresh_token) {
        setNeedsReauth(true);
        return;
      }

      // setSession restores the session and, via the auth state listener in
      // AuthProvider (SIGNED_IN / TOKEN_REFRESHED), handles persisting the
      // rotated tokens and flipping authStatus to 'authenticated'.
      const { error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) {
        const isTokenInvalid =
          error instanceof AuthApiError ||
          error instanceof AuthSessionMissingError;
        if (isTokenInvalid) {
          console.error('Stored session is no longer valid:', error);
          await clearSession(getSessionKey(userAuth));
          setNeedsReauth(true);
        } else if (error instanceof AuthRetryableFetchError) {
          console.error('Transient failure restoring session, will retry on next reconnect:', error);
        } else {
          console.error('Failed to restore session from keychain:', error);
          setNeedsReauth(true);
        }
      }
    } catch (err) {
      console.error('Restoring session threw unexpectedly:', err);
      try {
        await clearSession(getSessionKey(userAuth));
      } catch {
        // Ignore keychain cleanup failures; the reauth dialog must still open.
      }
      setNeedsReauth(true);
    }
  }

  useEffect(() => {
    if (!db) { return; }
    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      // console.log(event, session)
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (!session?.user) return;
        console.log(`${event} event triggered`)
        const newUser: LocalUser = {
          id: session.user.id,
          email: session.user.email ?? null,
          username: session.user.user_metadata?.username ?? null,
          is_guest: 0,
          created_at: session.user.created_at,
        };
        try {
          await saveSession(getSessionKey(newUser), {
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          });
        } catch (err) {
          console.error('Failed to save session to keychain:', err);
        }

        await db.execute(
          `UPDATE "AppState" SET active_user_id = $1 WHERE id = 1`,
          [session.user.id]
        );

        setUser(newUser);
        setLocalUserId(newUser.id);
        setStatus('authenticated');
      }
    });
    return () => sub.subscription.unsubscribe();

  }, [db]);

  const value: AuthContextValue = {
    user,
    setUser,
    fetchUsers,
    fetchSignedUser,
    status,
    setStatus,
    localUserId,
    setLocalUserId,
    signUpOnline,
    signInOnline,
    signInOffline,
    reconnectOnlineSession,
    refreshSession,
    signInAsGuest: () => { setStatus('guest'); setLocalUserId(GUEST_ID); },
    signOut: async () => {
      // Do NOT call supabase.auth.signOut(): it revokes the refresh token
      // server-side, which would leave the keychain holding a dead token.
      // Instead, clear only the local client state so the keychain session
      // stays valid for offline-to-online reconnects.
      const db = await getDb();
      await db.execute(`UPDATE "AppState" SET active_user_id = NULL WHERE id = 1`);
      setUser(null);
      setStatus('loading');
      setLocalUserId('');
    },
  };

  return <AuthContext.Provider value={value}>
    {children}
    <ReconnectDialog
      open={needsReauth}
      email={user?.email ?? ''}
      onSubmit={handleReauth}
      onClose={() => setNeedsReauth(false)}
    />
  </AuthContext.Provider>;
};

export default AuthProvider