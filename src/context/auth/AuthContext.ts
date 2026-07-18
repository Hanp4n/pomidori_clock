import type { LocalUser } from "@/db/db-types";
import { createContext } from "react";

export type AuthStatus = 'loading' | 'guest' | 'authenticated';

export interface AuthContextValue {
  user: LocalUser | null;
  setUser: (user: LocalUser | null) => void;
  status: AuthStatus;
  setStatus: (status: AuthStatus) => void;
  localUserId: string;
  setLocalUserId: (id: string) => void;

  signInAsGuest: () => void;
  signOut: () => Promise<void>;
  // refreshSession: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);