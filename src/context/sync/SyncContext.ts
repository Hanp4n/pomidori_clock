import { createContext } from "react";

export type SyncStatus = 'idle' | 'syncing' | 'error';
export interface SyncContextValue { status: SyncStatus; lastSyncedAt: Date | null; sync: () => Promise<void>; remoteChanges: RemoteChanges[]; setRemoteChanges: (changes: RemoteChanges[]) => void; notifyRemoteChange: (tableName: string, isRemoteSynced: boolean) => RemoteChanges[]; }
export interface RemoteChanges {
  table: string,
  remoteSynced: boolean
}

export const SyncContext = createContext<SyncContextValue | null>(null);