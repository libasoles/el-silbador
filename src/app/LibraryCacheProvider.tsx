"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { IsRestoringProvider, useQueryClient, type Query } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
} from "@tanstack/react-query-persist-client";
import type { Session } from "@supabase/supabase-js";
import {
  createLibraryPersister,
  isPersonalLibraryQuery,
  LIBRARY_CACHE_MAX_AGE,
  libraryCacheBuster,
} from "../data/libraryQueryPersistence";

interface LibraryCacheProviderProps {
  session: Session | null | undefined;
  children: ReactNode;
}

/** Restore only after auth identifies the owner; keep queries paused until hydration finishes. */
export function LibraryCacheProvider({ session, children }: LibraryCacheProviderProps) {
  const queryClient = useQueryClient();
  const userId = session === undefined ? undefined : session?.user.id ?? null;
  const [restoredUser, setRestoredUser] = useState<string | null>();
  const previousUser = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (userId === undefined) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    const { persister, deactivate } = createLibraryPersister();

    // Cancellation also prevents an old account's pending request from refilling the cache.
    const otherUsers = {
      predicate: (query: Query) =>
        isPersonalLibraryQuery(query) && (!userId || !isPersonalLibraryQuery(query, userId)),
    };
    void queryClient.cancelQueries(otherUsers);
    queryClient.removeQueries(otherUsers);
    if (!userId || (previousUser.current && previousUser.current !== userId)) {
      persister.removeClient();
    }
    previousUser.current = userId;

    const options = {
      queryClient,
      persister,
      maxAge: LIBRARY_CACHE_MAX_AGE,
      buster: libraryCacheBuster(userId ?? ""),
      dehydrateOptions: {
        shouldDehydrateMutation: () => false,
        shouldDehydrateQuery: (query: Query) =>
          Boolean(userId) && isPersonalLibraryQuery(query, userId ?? "") &&
          query.state.status === "success",
      },
    };

    async function restore() {
      try {
        if (userId) await persistQueryClientRestore(options);
      } catch {
        // TanStack discards corrupt caches. Continue with a normal network load.
      }
      if (!active) return;
      if (userId) unsubscribe = persistQueryClientSubscribe(options);
      setRestoredUser(userId ?? null);
    }
    void restore();

    return () => {
      active = false;
      deactivate();
      unsubscribe?.();
    };
  }, [queryClient, userId]);

  return (
    <IsRestoringProvider value={userId === undefined || restoredUser !== userId}>
      {children}
    </IsRestoringProvider>
  );
}
