import { getDb } from "@/db/db";
import { supabase } from "../../db/supabase";
import { getOperation } from "../../db/local-agnostic-operations";

const db = getDb();

// Timestamps arrive in three shapes: sqlite naive "YYYY-MM-DD HH:MM:SS",
// JS ".000Z" and Postgres "+00:00" — raw string comparison ranks them
// inconsistently, so parse before comparing. Naive strings are UTC by convention.
function toMs(ts: string | null | undefined): number {
  if (!ts) return 0;
  const iso = /^\d{4}-\d{2}-\d{2} \d{2}:/.test(ts) ? `${ts.replace(" ", "T")}Z` : ts;
  return Date.parse(iso) || 0;
}

/** true when `a` is strictly newer than `b`, format-independent */
export function isNewer(a: string | null | undefined, b: string | null | undefined): boolean {
  return toMs(a) > toMs(b);
}

export interface SyncableRegistry {
  id: string;
  updated_at: string;
  deleted_at?: string | null;
  is_synced?: boolean | number;

  //Rest of the undefined amount of properties
  [key: string]: unknown;
}

/**
 * Tests:
 * 1. table found: a real tableName from the database is received, and as a result the registries for that table are returned.
 * 2. table not found: a tableName that doesn't belong to the schema is received, and as a result there will be returned an empty array.
 */

export async function downloadOnlineRegistries<T extends SyncableRegistry>(
  tableName: string,
): Promise<T[]> {
  const { data, error } = await supabase
    .schema("pomidori_clock")
    .from(tableName)
    .select("*");

  if (error) {
    console.error(`Error downloading ${tableName} from supabase:`, error);
    return [];
  }

  return data as T[];
}

/**
 * Tests:
 * 1. not found table, null registries...
 */

export async function mergeAndUploadRegistries<
  TLocal extends SyncableRegistry,
  TRemote extends SyncableRegistry,
>(
  tableName: string,
  localRegistries: TLocal[],
  toRemote: (local: TLocal) => TRemote,
  mergeKey: keyof TRemote & string = "id" as keyof TRemote & string,
): Promise<void> {
  if (!db) return;
  const conn = await db;
  const toDelete = localRegistries.filter((r) => r.deleted_at);
  const toUpsert = localRegistries.filter((r) => !r.deleted_at);

  // 1. deleting registries
  for (const registry of toDelete) {
    await deleteRegistry(registry, tableName);
  }

  if (toUpsert.length > 0) {
    const mappedLocalRegistries = toUpsert.map(toRemote);
    const onlineRegistries = await downloadOnlineRegistries<TRemote>(tableName);

    const merged = await mergeRegistries(
      mappedLocalRegistries,
      onlineRegistries,
      mergeKey,
      tableName,
    );

    for (const registry of merged) {
      // console.log(
      //   `Uploading ${tableName} registry ${registry.id} to supabase: `,
      //   registry,
      // );

      // 2. Uploading registries
      const { error } = await supabase
        .schema("pomidori_clock")
        .from(tableName)
        .upsert(registry as any, { onConflict: mergeKey });

      const toUpsertRegistry = toUpsert.find((r) => r.id === registry.id);
      if (toUpsertRegistry && isNewer(registry.updated_at, toUpsertRegistry.updated_at)) {
        // console.log(
        //   `Registry ${registry.id} in ${tableName} was updated on the server. Updating local registry to match server.`,
        // );

        // 3. Automatic synchronisation for the registries that demonstrated being newer from the remote database
        const updateOperation = getOperation(tableName, "UPDATE");
        const { sql, values } = updateOperation(registry);
        await conn.execute(sql, values);
      }

      if (error)
        throw new Error(`Error uploading ${tableName} to supabase:`, error);
    }

    // 4. Flag the uploaded registries as synced — but only if unchanged since the
    // snapshot we uploaded, so an edit landing mid-push stays is_synced = 0 and
    // rides the next push instead of being lost.
    const snapshotById = new Map(toUpsert.map((r) => [r.id, r]));
    for (const registry of merged) {
      const snapshot = snapshotById.get(registry.id);
      if (!snapshot) continue;
      // TaskCategory has no updated_at column (immutable link table)
      await conn.execute(
        tableName === 'TaskCategory'
          ? `UPDATE "${tableName}" SET is_synced = 1 WHERE id = $1`
          : `UPDATE "${tableName}" SET is_synced = 1 WHERE id = $1 AND updated_at = $2`,
        tableName === 'TaskCategory' ? [snapshot.id] : [snapshot.id, snapshot.updated_at],
      );
    }
  }
}

export async function mergeOnlineWithLocal<
  TLocal extends SyncableRegistry,
  TRemote extends SyncableRegistry,
>(
  tableName: string,
  localRegistries: TLocal[],
  onlineRegistries: TRemote[],
  toLocal: (remote: TRemote) => TLocal,
  mergeKey: keyof TLocal & string = "id" as keyof TLocal & string,
): Promise<TLocal[]> {
  const mappedOnlineData = onlineRegistries.map(toLocal);
  const merged = await mergeRegistries(
    localRegistries,
    mappedOnlineData,
    mergeKey,
    tableName,
  );
  return merged;
}
/**
 * Merge the local registries with the online registries, adding and replacing registries depending if they are not present in the local database
 * or they demonstrate being newer than the equally local registry
 * @param localRegistries 
 * @param onlineRegistries 
 * @param mergeKey 
 * @param tableName 
 * @returns 
 */
async function mergeRegistries<T extends SyncableRegistry>(
  localRegistries: T[],
  onlineRegistries: T[],
  mergeKey: keyof T & string = "id" as keyof T & string,
  tableName: string,
): Promise<T[]> {
  const merged = new Map<T[keyof T & string], T>();

  // 1. Fill the list with the local registries
  localRegistries.forEach((registry) =>
    merged.set(registry[mergeKey], registry),
  );

  // 2. Add / Replace the registries from the list with the registries of the remote database
  for (const onlineRegistry of onlineRegistries) {
    const key = onlineRegistry[mergeKey];
    const localRegistry = merged.get(key);

    // If there is not an equal local registry in the remote database,
    // the registry is added directly
    if (!localRegistry) {
      merged.set(key, onlineRegistry);
      continue;
    }

    // If a registry has a deleted_at flag, then is removed from the list and both databases
    if (localRegistry.deleted_at) {
      merged.delete(key);
      await deleteRegistry(localRegistry, tableName);
      continue;
    }

    const localUpdated = localRegistry.updated_at;
    const onlineUpdated = onlineRegistry.updated_at;

    // If an online registry demonstrates being newer, then is replaced
    if (isNewer(onlineUpdated, localUpdated)) {
      merged.set(key, onlineRegistry);
    }
  }

  return Array.from(merged.values());
}

/**
 * Deletes a registry from both the local database and the Supabase remote database.
 * @param registry 
 * @param tableName 
 * @returns 
 */
async function deleteRegistry<T extends SyncableRegistry>(
  registry: T,
  tableName: string,
): Promise<void> {
  if (!db) {
    return;
  }
  const conn = await db;
  if (tableName === 'Category') {
    const {sql, values} = getOperation('TaskCategory', 'HARD_DELETE')(registry);
    await conn.execute(sql, values);
  }

  const {sql, values} = getOperation(tableName, 'HARD_DELETE')(registry);
  await conn
    .execute(sql, values)
    .catch((error) => {
      console.error(
        `Error deleting ${tableName} registry ${registry.id} from local database:`,
        error,
      );
    });

  // Delete from supabase remote database as well
  const { error } = await supabase
    .schema("pomidori_clock")
    .from(tableName)
    .delete()
    .eq("id", registry.id);

  if (error) {
    console.error(
      `Error deleting ${tableName} registry ${registry.id} from supabase:`,
      error,
    );
  }
}


/**
 * Reconciles deletions between local and online registries.
 * If a local registry is marked as synced but does not exist in the online registries, it will be deleted from the local database.
 * @param tableName
 * @param localRegistries 
 * @param onlineRegistries 
 * @returns 
 */
export async function reconcileDeletions<
  TLocal extends SyncableRegistry,
  TRemote extends SyncableRegistry,
>(
  tableName: string,
  localRegistries: TLocal[],
  onlineRegistries: TRemote[],
): Promise<TLocal[]> {
  if (!db) return localRegistries;
  const conn = await db;

  const onlineIds = new Set(onlineRegistries.map((r) => r.id));

  const survivors: TLocal[] = [];
  for (const registry of localRegistries) {
    if (registry.is_synced && !onlineIds.has(registry.id)) {
      await conn.execute(`DELETE FROM "${tableName}" WHERE id = $1`, [
        registry.id,
      ]);
    } else {
      survivors.push(registry);
    }
  }
  return survivors;
}
