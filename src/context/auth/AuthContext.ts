import type { LocalUser } from "@/db/db-types";
import { createContext } from "react";
/**
 * loading: the authentication process is going through
 * guest: the user is enabled to offline-only operations
 * authenticated: the user is fully able to use the app
 * pending: the user (previously registered in the local database) was signed in locally, waiting for internet connection to be fully authenticated
 */
export type AuthStatus = 'loading' | 'guest' | 'authenticated' | 'pending';

export interface AuthContextValue {
  user: LocalUser | null;
  setUser: (user: LocalUser | null) => void;
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  localUserId: string;
  setLocalUserId: (id: string) => void;

  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  signUpOnline: (email: string, username: string, password?: string) => Promise<void>;
  signInOnline: (user: LocalUser, password: string) => Promise<void>;
  signInOffline: (email: string) => Promise<void>;
  reconnectOnlineSession: () => Promise<void>;
  refreshSession: (user: LocalUser | null) => Promise<void>
  fetchUsers: () => Promise<LocalUser[] | undefined>;
  fetchSignedUser: (email: string) => Promise<LocalUser | undefined>
}

export const AuthContext = createContext<AuthContextValue | null>(null);