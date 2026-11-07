import type { Query } from "@tanstack/react-query";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";

export const LIBRARY_CACHE_KEY = "el-silbador-library-cache";
export const LIBRARY_CACHE_MAX_AGE = 24 * 60 * 60 * 1000;

// Bump the schema version when the persisted LibrarySong shape changes.
export const libraryCacheBuster = (userId: string) => `v1:${userId}`;

export function isPersonalLibraryQuery(query: Query, userId?: string) {
  const [scope, list, owner] = query.queryKey;
  return (
    query.queryKey.length === 3 &&
    scope === "songs" && (list === "mine" || list === "favorites") &&
    typeof owner === "string" && (userId === undefined || owner === userId)
  );
}

export function createLibraryPersister() {
  let active = true;
  const storagePersister = createAsyncStoragePersister({
    key: LIBRARY_CACHE_KEY,
    storage: {
      getItem: (key) => {
        if (!active) return null;
        try {
          return window.localStorage.getItem(key);
        } catch {
          return null;
        }
      },
      setItem: (key, value) => {
        // A throttled write from a previous session must not recreate its cache after logout.
        if (!active) return;
        try {
          window.localStorage.setItem(key, value);
        } catch {
          // Memory cache still works when storage is blocked or full.
        }
      },
      removeItem: (key) => {
        if (!active) return;
        try {
          window.localStorage.removeItem(key);
        } catch {
          // Storage may be blocked.
        }
      },
    },
  });
  return {
    persister: {
      ...storagePersister,
      restoreClient: async () => {
        const saved = await storagePersister.restoreClient();
        return active ? saved : undefined;
      },
    },
    deactivate: () => { active = false; },
  };
}
