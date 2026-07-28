'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/db/supabase';
import type { LocalUser } from '@/db/db-types';
import { useAuth } from './context/auth/AuthHook';
import { useDb } from './context/db/DbHook';
import { createUser } from './db/local-agnostic-operations';

interface DashboardState {
  users: LocalUser[];
  loading: boolean;
  error: string | null;
  isInitializing: boolean;
}

interface SyncFormState {
  username: string;
  email: string;
}

const Test: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    users: [],
    loading: false,
    error: null,
    isInitializing: true,
  });

  const [form, setForm] = useState<SyncFormState>({
    username: '',
    email: '',
  });
  const [signInEmail, setSignInEmail] = useState('');

  const navigate = useNavigate();
  const { fetchSignedUser, fetchUsers, signInOnline, signUpOnline } = useAuth();

  const db = useDb();

  // Initialize database connection
  useEffect(() => {
    const initializeDashboard = async () => {
      if (!db) { return; }

      try {
        setState((prev) => ({ ...prev, isInitializing: true, error: null }));
        // console.log("fetching users...")

        const existingUsers = await fetchUsers() ?? [];

        // console.log("the users were fetched")
        // console.log("Status auth: ", authStatus)

        setState((prev) => ({
          ...prev,
          users: existingUsers,
          isInitializing: false,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState((prev) => ({
          ...prev,
          error: `Failed to initialize database: ${errorMessage}`,
          isInitializing: false,
        }));
        console.error('Database initialization error:', err);
      }
    };

    initializeDashboard();
  }, [db]);

  const handleRefreshUsers = useCallback(async () => {
    if (!db) {
      setState((prev) => ({
        ...prev,
        error: 'Database not initialized',
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const updatedUsers = await fetchUsers() ?? [];
      console.log("User fetched locally: ", updatedUsers)

      setState((prev) => ({
        ...prev,
        users: updatedUsers,
        loading: false,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        error: `Failed to refresh users: ${errorMessage}`,
        loading: false,
      }));
      console.error('Refresh users error:', err);
    }
  }, [db]);

  const handleCreateInSupabaseAndRefresh = useCallback(async () => {
    if (!db) {
      setState((prev) => ({
        ...prev,
        error: 'Local database not initialized. Please wait...',
      }));
      return;
    }

    if (!form.username.trim() || !form.email.trim()) {
      setState((prev) => ({
        ...prev,
        error: 'Please provide a username and email.',
      }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      await signUpOnline(form.email.trim(), form.username.trim());
      // console.log("User signed up")
      await handleRefreshUsers();
      // console.log("Users list refreshed")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        error: `Failed to sync user: ${errorMessage}`,
        loading: false,
      }));
      console.error('Sync user error:', err);
      // console.log(err);
    }
  }, [db, form.email, form.username, signUpOnline]);

  // Delete a user by id
  const handleDeleteUser = useCallback(
    async (userId: string) => {
      if (!db) {
        setState((prev) => ({
          ...prev,
          error: 'Database not initialized',
        }));
        return;
      }

      try {
        setState((prev) => ({ ...prev, loading: true, error: null }));

        await db.execute('DELETE FROM "User" WHERE id = $1', [userId]);

        handleRefreshUsers();
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setState((prev) => ({
          ...prev,
          error: `Failed to delete user: ${errorMessage}`,
          loading: false,
        }));
        console.error('Delete user error:', err);
      }
    },
    [db]
  );

  const handleSignIn = useCallback(async () => {
    if (!signInEmail.trim()) {
      setState((prev) => ({ ...prev, error: 'Please provide an email to sign in.' }));
      return;
    }

    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      const user = await fetchSignedUser(signInEmail);
      if (!user) return;

      signInOnline(user);

      setState((prev) => ({
        ...prev,
        loading: false,
        error: `Signed in as ${user.username || user.email}`,
      }));

      navigate('/task');

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, loading: false, error: `Sign in failed: ${errorMessage}` }));
      console.error('Sign in form error:', err);
    }
  }, [signInEmail, navigate, fetchSignedUser, signInOnline]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 text-foreground">SQLite & Supabase Test</h1>
          <p className="text-muted-foreground">
            Testing connection to SQLite and Supabase databases - Generate and manage user records
          </p>
        </div>

        {/* Loading State */}
        {state.isInitializing && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-200">
            <p>Initializing database connection...</p>
          </div>
        )}

        {/* Error Alert */}
        {state.error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200">
              <span className="font-semibold">Error: </span>
              {state.error}
            </p>
          </div>
        )}

        {/* Signup Form */}
        <div className="mb-8 p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Create a new user</h2>
              <p className="text-sm text-muted-foreground">
                Create a user in Supabase and sync it to your local SQLite database.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="Enter a username"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                placeholder="Enter an email"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                onClick={handleCreateInSupabaseAndRefresh}
                disabled={state.loading || state.isInitializing}
              >
                {state.loading ? 'Creating...' : 'Create and sync user'}
              </Button>
            </div>
          </div>
        </div>

        {/* Sign In Form */}
        <div className="mb-8 p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Sign in with email</h2>
              <p className="text-sm text-muted-foreground">
                Enter an email to sign in or create a new local account.
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="signInEmail">Email</Label>
              <Input
                id="signInEmail"
                type="email"
                value={signInEmail}
                onChange={(event) => setSignInEmail(event.target.value)}
                placeholder="Enter your email"
                disabled={state.loading || state.isInitializing}
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <Button
                onClick={handleSignIn}
                disabled={state.loading || state.isInitializing}
              >
                {state.loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </div>
          </div>
        </div>

        {/* Control Section */}
        <div className="mb-8 p-6 bg-card border border-border rounded-lg shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2 text-foreground">Signed Up Users</h2>
              <p className="text-sm text-muted-foreground">Users stored locally for sign in.</p>
            </div>
            <Button
              onClick={handleRefreshUsers}
              disabled={state.loading || state.isInitializing}
              variant="outline"
            >
              {state.loading ? 'Refreshing...' : 'Refresh Users'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-4">
            Total users: <span className="font-semibold text-foreground">{state.users.length}</span>
          </p>
        </div>

        {/* Users Dashboard */}
        <div className="p-6 bg-card border border-border rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4 text-foreground">User Registry</h2>

          {state.users.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No signed-up users found locally.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {state.users.map((u) => (
                <div
                  key={u.id}
                  className="rounded-2xl border border-border bg-background p-5 shadow-sm"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Username</p>
                      <p className="text-lg font-semibold text-foreground">{u.username || 'Unknown'}</p>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {u.is_guest ? 'Guest user' : 'Registered user'}
                    </div>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div className="space-y-1">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Email</p>
                      <p className="text-sm text-foreground break-all">{u.email || '-'}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(u.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 justify-end">
                      <Button
                        onClick={() => signInOnline(u)}
                        disabled={state.loading}
                        variant="secondary"
                        size="sm"
                      >
                        Sign in
                      </Button>
                      <Button
                        onClick={() => handleDeleteUser(u.id)}
                        disabled={state.loading}
                        variant="destructive"
                        size="sm"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 p-4 bg-muted/50 rounded-lg border border-border">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold">Database Status:</span>{' '}
            {state.isInitializing ? 'Initializing...' : db ? 'Connected ✓' : 'Disconnected ✗'}
            {' | '}
            <span className="font-semibold">Records:</span> {state.users.length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Test;