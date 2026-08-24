import React, { useCallback, useEffect, useState } from 'react';
import type { LocalPomodoroConfig } from '@/db/schema.sqlite';
import { useDb } from '../db/DbHook';
import { useAuth } from '../auth/AuthHook';
import { useSync } from '../sync/SyncHook';
import { createPomodoroConfig as createConfigOp, updatePomodoroConfig as updateConfigOp, getOperation } from '@/db/local-agnostic-operations';
import { notifyLocalChange } from '../sync/sync-bus';
import { PomodoroConfigContext, type NewPomodoroConfigInput } from './PomodoroConfigContext';

const CONFIG_COLUMNS = 'id, user_id, focus_time, short_break_time, long_break_time, long_break_count, focus_auto, break_auto, sound_enabled, created_at, updated_at, deleted_at, is_synced';

export function PomodoroConfigProvider({ children }: { children: React.ReactNode }) {
  const db = useDb();
  const { user, localUserId, status: authStatus } = useAuth();
  const { sync, remoteChanges, setRemoteChanges, notifyRemoteChange } = useSync();
  const [config, setConfig] = useState<LocalPomodoroConfig | null>(null);

  // ponytail: one config row per user (LIMIT 1) — the schema allows many but
  // the app only ever reads/writes the first; add a list UI if that changes.
  const fetchConfig = useCallback(async (): Promise<LocalPomodoroConfig | null> => {
    if (!db || !user) return null;
    const rows = await db.select<LocalPomodoroConfig[]>(
      `SELECT ${CONFIG_COLUMNS} FROM PomodoroConfig WHERE user_id = $1 AND deleted_at IS NULL LIMIT 1`,
      [user.id],
    );
    return rows[0] ?? null;
  }, [db, user]);

  const refreshConfig = useCallback(async (): Promise<LocalPomodoroConfig | null> => {
    const fetched = await fetchConfig();
    setConfig(fetched);
    return fetched;
  }, [fetchConfig]);

  const addConfig = useCallback(async (input: NewPomodoroConfigInput) => {
    if (!db) { console.error('addConfig skipped: db unavailable'); return; }
    if (!localUserId) return;

    const newConfig: LocalPomodoroConfig = {
      id: crypto.randomUUID(),
      user_id: localUserId,
      focus_time: input.focus_time ?? 52,
      short_break_time: input.short_break_time ?? 17,
      long_break_time: input.long_break_time ?? 20,
      long_break_count: input.long_break_count ?? 4,
      focus_auto: input.focus_auto ?? 0,
      break_auto: input.break_auto ?? 0,
      sound_enabled: input.sound_enabled ?? 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      is_synced: 0,
    };

    const { sql, values } = createConfigOp(newConfig);
    await db.execute(sql, values);
    notifyLocalChange("PomodoroConfig");

    setConfig(newConfig);
  }, [db, localUserId]);

  const updateConfig = useCallback(async (input: NewPomodoroConfigInput) => {
    if (!db) { console.error('updateConfig skipped: db unavailable'); return; }
    if (!config) return;

    const updated: LocalPomodoroConfig = {
      ...config,
      focus_time: input.focus_time ?? config.focus_time,
      short_break_time: input.short_break_time ?? config.short_break_time,
      long_break_time: input.long_break_time ?? config.long_break_time,
      long_break_count: input.long_break_count ?? config.long_break_count,
      focus_auto: input.focus_auto ?? config.focus_auto,
      break_auto: input.break_auto ?? config.break_auto,
      sound_enabled: input.sound_enabled ?? config.sound_enabled,
      updated_at: new Date().toISOString(),
      is_synced: 0,
    };

    const { sql, values } = updateConfigOp(updated);
    await db.execute(sql, values);
    notifyLocalChange("PomodoroConfig");

    setConfig(updated);
  }, [db, config]);

  const deleteConfig = useCallback(async () => {
    if (!db) { console.error('deleteConfig skipped: db unavailable'); return; }
    if (!config) return;
    const deleteType = authStatus === "guest" ? 'HARD_DELETE' : 'SOFT_DELETE';

    const { sql, values } = getOperation("PomodoroConfig", deleteType)(config);
    await db.execute(sql, values);
    notifyLocalChange("PomodoroConfig");

    setConfig(null);
  }, [db, authStatus, config]);

  useEffect(() => {
    if (authStatus === 'loading' || !db || !user) return;
    const load = async () => {
      const fetched = await fetchConfig();
      // ponytail: the provider owns row creation — no row means create it here
      // so consumers never invent defaults of their own.
      if (!fetched) await addConfig({});
      else setConfig(fetched);
      if (authStatus !== 'guest') sync();
    };
    load();
  }, [db, user, authStatus, fetchConfig, addConfig, sync]);

  useEffect(() => {
    const configRemoteChanges = remoteChanges.find(remoteChange => remoteChange.table === "PomodoroConfig") ?? null;
    if (configRemoteChanges && !configRemoteChanges.remoteSynced && db) {
      const update = async () => {
        const newRemoteChanges = notifyRemoteChange("PomodoroConfig", true);
        setRemoteChanges([...newRemoteChanges]);
        await refreshConfig();
      };
      update();
    }
  }, [remoteChanges, db, notifyRemoteChange, setRemoteChanges, refreshConfig]);

  return (
    <PomodoroConfigContext.Provider value={{ config, refreshConfig, addConfig, updateConfig, deleteConfig }}>
      {children}
    </PomodoroConfigContext.Provider>
  );
}

export default PomodoroConfigProvider;
