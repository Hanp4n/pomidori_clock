import { useState, useCallback, useEffect, useRef } from 'react';
import { useIsOnline } from '../connectivity/ConnectivityHook';
import { useAuth } from '../auth/AuthHook';
import { downloadOnlineRegistries, mergeAndUploadRegistries, mergeOnlineWithLocal, reconcileDeletions } from '@/context/sync/sync-data';
import { useDb } from '../db/DbHook';
import { getMapper } from '@/context/sync/sync-mappers';
import { notifyLocalChange, onLocalChange } from '@/context/sync/sync-bus';
import { getOperation } from '@/db/local-agnostic-operations';
import { supabase } from '@/db/supabase';
import { SyncContext, type RemoteChanges, type SyncStatus } from './SyncContext';
import type { LocalUser } from '@/db/schema.sqlite';

const ALL_TABLES = ['Task', 'Category', 'TaskCategory', 'PomodoroConfig', 'PomodoroSession'];

type BackupTableList = {
  tables: string[],
  state: boolean
}

const INIT_BACKUP = {
  tables: [],
  state: false
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const isOnline = useIsOnline();
  const { status: authStatus, localUserId, user, setUser, setLocalUserId, refreshSession } = useAuth();
  const [status, setStatus] = useState<SyncStatus>('idle');
  const [remoteChanges, setRemoteChanges] = useState<RemoteChanges[]>([] as RemoteChanges[]);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const pullAgain = useRef<BackupTableList>(INIT_BACKUP);
  const pushAgain = useRef<BackupTableList>(INIT_BACKUP);
  const db = useDb();

  const pushTables = useCallback(async (tables: string[] = ALL_TABLES) => {
    // console.log("pushTables: status: " + JSON.stringify({isOnline, db, authStatus}))
    if (!db || !isOnline || authStatus !== 'authenticated') return;
    setStatus('syncing');
    try {
      console.log("Table order:", tables)
      for (const table of tables) {
        const pushingQuery = table === "TaskCategory" ?
          `SELECT tc.* FROM "TaskCategory" tc
       JOIN "Task" t ON t.id = tc.task_id
       WHERE t.user_id = $1 AND (tc.is_synced = 0 OR tc.deleted_at IS NOT NULL)`
          : `SELECT * FROM "${table}" WHERE user_id = $1 AND (is_synced = 0 OR deleted_at IS NOT NULL)`

        const pendingLocalRegistries = await db.select<any[]>(
          pushingQuery,
          [localUserId]
        );
        // console.log("Pending local registries for " + table + ": ", pendingLocalRegistries)
        if (pendingLocalRegistries.length === 0) return;
        await mergeAndUploadRegistries<any, any>(table, pendingLocalRegistries, getMapper(table, 'localToRemote'));
      }));

      setLastSyncedAt(new Date());
      setStatus('idle');
      // console.log("pushTables: finishing sync process");
    } catch (err) {
      setStatus('error');
      console.error("Error pushing: ", err)
      pushAgain.current.state = true;
      pushAgain.current.tables = tables;
    }
  }, [db, isOnline, authStatus, localUserId]);

  const notifyRemoteChange = (tableName: string, isRemoteSynced: boolean) => {
    return [
      ...remoteChanges.filter(rc => rc.table !== tableName),
      {
        table: tableName,
        remoteSynced: isRemoteSynced
      }
    ]
  }

  const pullFromRemote = useCallback(async (tables: string[] = ALL_TABLES) => {
    if (!db || !isOnline || authStatus !== 'authenticated') return;

    setStatus('syncing');
    try {
      await Promise.all(tables.map(async (tableName) => {
        console.log("pulling ", tableName)
        const pullingQuery = tableName === 'TaskCategory'
          ? `SELECT tc.* FROM "TaskCategory" tc
       JOIN "Task" t ON t.id = tc.task_id
       WHERE t.user_id = $1`
          : `SELECT * FROM "${tableName}" WHERE user_id = $1`

        const localRegistries = await db.select<any[]>(
          pullingQuery,
          [localUserId]
        );
        const localIds = new Set(localRegistries.map((r) => r.id));

        const newRemoteChanges: RemoteChanges[] = notifyRemoteChange(tableName, false)

        const onlineRegistries = await downloadOnlineRegistries(tableName);

        const reconciledLocal = await reconcileDeletions(tableName, localRegistries, onlineRegistries);

        const newRegistries = await mergeOnlineWithLocal<any, any>(tableName, reconciledLocal, onlineRegistries, getMapper(tableName, 'remoteToLocal'));

        // console.log("pullFromRemote: New Registries", newRegistries);
        await Promise.all(
          newRegistries.map(async (registry) => {
            const operationType: 'INSERT' | 'UPDATE' = localIds.has(registry.id) ? 'UPDATE' : 'INSERT';
            // console.log("pullingFromRemote: ", operationType)
            const sqlOperationFunction = getOperation(tableName, operationType);
            const sqlOperation = sqlOperationFunction(registry);
            // console.log(sqlOperation.values);
            await db.execute(sqlOperation.sql, [...sqlOperation.values]);

            setRemoteChanges([...newRemoteChanges])
          })
        );
      }));

      setLastSyncedAt(new Date());
      setStatus('idle');
    } catch (err) {
      setStatus('error')
      console.error("Error pulling: ", err);
      pullAgain.current.state = true;
      pullAgain.current.tables = tables;
    }

  }, [db, isOnline, authStatus, localUserId]);

  const sync = useCallback(async () => {
    // console.log("sync: starting sync process")
    if (!db || !isOnline || authStatus !== 'authenticated') {
      return;
    }
    await pullFromRemote();
    await pushTables(ALL_TABLES);
  }, [pullFromRemote, pushTables, authStatus, isOnline, db]);

  useEffect(() => {
    const initializeRemoteChanges = () => {
      const initRemoteChanges: RemoteChanges[] = ALL_TABLES.map(tableName => {
        return {
          table: tableName,
          remoteSynced: true
        };
      })

      setRemoteChanges(initRemoteChanges);
    }
    initializeRemoteChanges();
  }, [])

  useEffect(() => {
    if (!db) {
      return;
    }
    console.log("AppState refresh triggered")
    const activeUserID = async () => {
      const activeUsersList = await db.select<{ active_user_id: string | null }[]>(
        "SELECT active_user_id FROM AppState"
      );
      return activeUsersList[0]?.active_user_id ?? null;
    }

    const updateUser = async () => {

      const userID = await activeUserID();
      if (!userID) return;

      const users: LocalUser[] = await db.select<LocalUser[]>(
        "SELECT * FROM User WHERE id=$1", [userID]
      );
      const user = users[0];
      console.log("AppState event: ", user);
      if (!user) return;

      setUser(user);
      setLocalUserId(userID);
      await refreshSession(user);
    };

    updateUser();
  }, [db])

  // Static pulling as long as there is internet connection.
  useEffect(() => {
    if (!isOnline || authStatus !== 'authenticated') return;
    const interval = setInterval(() => { pullFromRemote(); }, 300_000); // every 300s
    return () => clearInterval(interval);
  }, [isOnline, authStatus, pullFromRemote]);

  // Dynamic pulling triggered once there is any changes in the remote database.
  useEffect(() => {
    if (!isOnline || authStatus !== 'authenticated') return;

    let channel = supabase.channel('sync-changes');

    ALL_TABLES.forEach((table) => {
      channel = channel.on('postgres_changes',
        { event: '*', schema: 'pomidori_clock', table, filter: table === 'TaskCategory' ? undefined : `user_id=eq.${localUserId}` },
        async () => {
          console.log("Detected changes in Supabase for " + table)
          await pullFromRemote([table])
        }
      );
    });

    channel = channel.subscribe((status, err) => {
      console.log('sync channel status:', status, err);
    });

    return () => { supabase.removeChannel(channel); };
  }, [isOnline, authStatus, localUserId, pullFromRemote]);


  // Semi-automatic pushing once there is any changes in the local database.
  // The changes are made once 'notifyLocalChange(table)' is called.
  useEffect(() => {
    // console.log("User: ", authStatus);
    if (!db || !isOnline || authStatus !== 'authenticated') return;

    let timeout: ReturnType<typeof setTimeout>;
    const pendingTables = new Set<string>();

    const unsubscribe = onLocalChange((table) => {
      pendingTables.add(table);
      clearTimeout(timeout);
      timeout = setTimeout(async () => {
        const tables = Array.from(pendingTables);
        if (tables.find(t => t === "TaskCategory")) console.log("Pushin TaskCategory rows...")
        if (tables.find(t => t === "Task")) console.log("Pushin Task rows...")
        pendingTables.clear();
        await pushTables(tables);
      }, 1000);
    });

    return () => { unsubscribe(); clearTimeout(timeout); };
  }, [pushTables, authStatus, isOnline, db]);

  // Auto-sync whenever connectivity is regained
  useEffect(() => {
    if (!isOnline || authStatus !== 'authenticated') return;
    const syncChanges = async () => {
      await sync();
    }
    syncChanges();

  }, [isOnline, authStatus, sync]);

  // Recover session when connectivity is regained while user is pending
  useEffect(() => {
    if (!isOnline || authStatus !== 'pending' || !user) return;
    refreshSession();

  }, [isOnline, authStatus, user]);

  useEffect(() => {
    if (!pullAgain.current) return;
    const pullingAgain = async () => {
      setTimeout(async () => {
        console.log("Pulling again...")
        await pullFromRemote(pullAgain.current.tables)
      }, 1000)
    }

    pullingAgain();
    pullAgain.current = INIT_BACKUP;
  }, [status, setStatus, pullFromRemote])

  useEffect(() => {
    if (!pushAgain.current) return;
    const pushingAgain = async () => {
      setTimeout(async () => {
        console.log("Pushing again...")
        await pushTables(pushAgain.current.tables)
      }, 1000)
    }

    pushingAgain();
    pushAgain.current = INIT_BACKUP;
  }, [status, setStatus, pushTables])


  return (
    <SyncContext.Provider value={{ status, lastSyncedAt, sync, remoteChanges, setRemoteChanges, notifyRemoteChange }}>
      {children}
    </SyncContext.Provider>
  );
}

