import type { LocalUser } from '@/db/schema.sqlite';
import { supabase } from '../../db/supabase';
import { useEffect, useState } from 'react'
import { getDb } from '@/db/db';
import type { AuthContextValue, AuthStatus } from './AuthContext';
import { AuthContext } from './AuthContext';
import { useDb } from '../db/DbHook';
import { createUser } from '@/db/local-agnostic-operations';


const GUEST_ID = '00000000-0000-0000-0000-000000000000';
// This provider should have all the utilities to sign in online and offline, sign up online and sign in as a guest
const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [localUserId, setLocalUserId] = useState(GUEST_ID);
  // const [users, setUsers] = useState<LocalUser[]>([])
  const db = useDb();

  async function fetchUsers() {
    if (!db) { return; }
    return await db.select('SELECT id, username, email, is_guest , access_token , refresh_token, created_at FROM "User" ORDER BY created_at DESC') as LocalUser[];
  }

  // async function bootstrap() {
  //   if (!db) { return; }

  //   const state = await db.select<{ active_user_id: string | null }[]>(
  //     `SELECT active_user_id FROM "AppState" WHERE id = 1`
  //   );
  //   const activeUserId = state[0]?.active_user_id;

  //   if (!activeUserId) {
  //     setStatus('guest');
  //     setLocalUserId(GUEST_ID);
  //     return;
  //   }

  //   const rows = await db.select<{ id: string; access_token: string; refresh_token: string }[]>(
  //     `SELECT id, access_token, refresh_token FROM "User" WHERE id = $1`,
  //     [activeUserId]
  //   );

  //   if (rows.length === 0) {
  //     // active_user_id pointed at a row that no longer exists — reset and fall back

  //     await db.execute(`UPDATE "AppState" SET active_user_id = NULL WHERE id = 1`);
  //     setStatus('guest');
  //     setLocalUserId(GUEST_ID);
  //     return;
  //   }

  //   const cached = rows[0];
  //   const { data, error } = await supabase.auth.setSession({
  //     access_token: cached.access_token,
  //     refresh_token: cached.refresh_token,
  //   });

  //   if (error || !data.session) {
  //     setStatus('guest');
  //     setLocalUserId(GUEST_ID);
  //     return;
  //   }

  //   const newUser: LocalUser = {
  //     id: data.session.user.id,
  //     email: data.session.user.email ?? null,
  //     username: data.session.user.user_metadata?.username ?? null,
  //     is_guest: 0,
  //     access_token: data.session.access_token,
  //     refresh_token: data.session.refresh_token,
  //     created_at: data.session.user.created_at,
  //   }
  //   setUser(newUser);
  //   setLocalUserId(newUser.id);
  //   setStatus('authenticated');
  // }

  // async function signIn(user: LocalUser) {
  //   if (!db) { return; }

  //   try {
  //     if (!user.email) {
  //       throw new Error('User email not available for sign in.');
  //     }

  //     const { error } = await supabase.auth.signInWithPassword({
  //       email: user.email,
  //       password: 'temporary-password',
  //     })

  //     if (error) {
  //       throw error;
  //     }

  //     setStatus('authenticated');
  //     setLocalUserId(user.id);
  //     setUser(user);
  //   } catch (err) {
  //     console.error('Sign in error:', err);
  //   }
  // }

  // async function signUpOnline(email: string, username: string, password: string = 'temporary-password') {
  //   if (!db) { return; }
  //   try {

  //     // console.log("handleCreateInSupabaseAndSync: creating user in supabase");
  //     const { data: authData, error: authError } = await supabase.auth.signUp({
  //       email: email.trim(),
  //       password: password,
  //       options: {
  //         data: {
  //           username: username.trim(),
  //         },
  //       },
  //     });

  //     // console.log("handleCreateInSupabaseAndSync: the user was created in supabase");

  //     if (authError) throw authError;
  //     if (!authData.user) throw new Error('Supabase Auth did not return a user.');

  //     const accessToken = authData.session?.access_token ?? null;
  //     const refreshToken = authData.session?.refresh_token ?? null;
  //     const data = await waitForRemoteUser(authData.user.id);

  //     // console.log("User: ", JSON.stringify(data));
  //     // console.log("handleCreateInSupabaseAndSync: creating user in SQLite");

  //     await db.execute(
  //       'INSERT INTO "User" (id, username, email, is_guest, access_token, refresh_token, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
  //       [data.id, data.username, data.email, 0, accessToken, refreshToken, data.created_at]
  //     );

  //     // console.log("handleCreateInSupabaseAndSync: the user was created in SQLite");

  //     const updatedUsers = (await db.select('SELECT * FROM "User" ORDER BY created_at DESC')) as LocalUser[];

  //   } catch (err) {
  //     console.error('Sync user error:', err);
  //   }
  // }

  //   async function waitForRemoteUser(userId: string, attempts = 3) {
  //     for (let attempt = 0; attempt < attempts; attempt += 1) {
  //       await new Promise((resolve) => window.setTimeout(resolve, 5000));

  //       const { data, error } = await supabase
  //         .schema('pomidori_clock')
  //         .from('User')
  //         .select('id, username, email, created_at')
  //         .eq('id', userId)
  //         .maybeSingle();

  //       if (!error && data) {
  //         console.log("waitForRemoteUser: User created")
  //         return data;
  //       }
  //     }

  //     throw new Error('The user was created in Auth, but no matching row was found in the remote User table yet.');
  //   }

  //   useEffect(() => {
  //     const updateUserList = async () => {
  //       const newUsers = await fetchUsers();
  //       if (newUsers) {
  //         setUsers(newUsers)
  //       }
  //     }
  //     updateUserList();
  //   }, []);


    useEffect(() => {

      const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (!db) { return; }

        const conn = await db;

        if (session) {
          const newUser: LocalUser = {
            id: session.user.id,
            email: session.user.email ?? null,
            username: session.user.user_metadata?.username ?? null,
            is_guest: 0,
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            created_at: session.user.created_at,
          };

          await conn.execute(
            `UPDATE "User" SET access_token = $1, refresh_token = $2 WHERE id = $3`,
            [newUser.access_token, newUser.refresh_token, newUser.id]
          );

          await conn.execute(
            `UPDATE "AppState" SET active_user_id = $1 WHERE id = 1`,
            [session.user.id]
          );

          setUser(newUser);
          setLocalUserId(newUser.id);
          setStatus('authenticated');
        }
      });
      return () => sub.subscription.unsubscribe();

    }, []);

    const value: AuthContextValue = {
      user,
      setUser,
      status,
      setStatus,
      localUserId,
      setLocalUserId,
      signInAsGuest: () => { setStatus('guest'); setLocalUserId(GUEST_ID); },
      signOut: async () => {
        await supabase.auth.signOut();
        const db = await getDb();
        await db.execute(`UPDATE "AppState" SET active_user_id = NULL WHERE id = 1`);
        setStatus('guest');
        setLocalUserId(GUEST_ID);
      },
      // refreshSession: bootstrap,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
  };

export default AuthProvider