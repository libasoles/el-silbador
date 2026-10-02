"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { IsRestoringProvider, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type PersistedQueryClientRestoreOptions,
  type PersistedQueryClientSaveOptions,
} from "@tanstack/query-persist-client-core";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { initAnalytics, trackPageView } from "../editor/analytics";
import { AuthRequiredProvider } from "../editor/AuthRequired";
import { AuthCallbackErrorToast } from "../editor/components/AuthCallbackErrorToast";
import { ToastProvider } from "../editor/components/ToastProvider";
import { useAuth } from "../editor/useAuth";

// gcTime must be at least as long as the persister's maxAge below, or React Query garbage-collects
// a query from memory (and skips persisting it) before it'd otherwise expire.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Data comes from Supabase and only changes through our own mutations (save/delete/fork/
      // favorite), which invalidate their queries explicitly — so there's no need to refetch just
      // because the window regained focus or the network reconnected.
      queries: {
        staleTime: 60_000,
        gcTime: ONE_DAY_MS,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

// On the server a module-level client would be shared across requests: the first request's
// `initialData` would stick in its cache and later requests would SSR that stale list while the
// client hydrates from fresh props, causing a hydration text mismatch. So the server gets a
// fresh client per render and only the browser reuses a singleton.
function getQueryClient() {
  if (typeof window === "undefined") return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

function getPersister() {
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: "silabeo-query-cache",
  });
}

type DeferredPersistOptions = PersistedQueryClientRestoreOptions & PersistedQueryClientSaveOptions;

function scheduleIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(callback);
    return () => window.cancelIdleCallback(handle);
  }
  const handle = window.setTimeout(callback, 0);
  return () => window.clearTimeout(handle);
}

/**
 * Restores and persists the React Query cache like `PersistQueryClientProvider` does, but defers
 * the synchronous JSON parse/stringify work to an idle moment (via `requestIdleCallback`, falling
 * back to a macrotask) instead of running it inline in a mount effect, so it doesn't compete with
 * the page's initial render and interactivity.
 */
function useDeferredPersistQueryClient(options: DeferredPersistOptions | undefined): boolean {
  const [isRestoring, setIsRestoring] = useState(() => options !== undefined);

  useEffect(() => {
    if (!options) return;
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const cancelIdle = scheduleIdle(() => {
      persistQueryClientRestore(options)
        .catch(() => undefined)
        .finally(() => {
          if (cancelled) return;
          setIsRestoring(false);
          unsubscribe = persistQueryClientSubscribe(options);
        });
    });

    return () => {
      cancelled = true;
      cancelIdle();
      unsubscribe?.();
    };
  }, [options]);

  return isRestoring;
}

function AnalyticsTracker() {
  const pathname = usePathname();

  useEffect(() => {
    initAnalytics();
  }, []);

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return null;
}

function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const session = useAuth();
  const [queryClient] = useState(getQueryClient);
  // `localStorage` doesn't exist during SSR — this component still renders on the server to
  // produce the initial HTML, so the persisted client can only be created once in the browser.
  const persister = useMemo(() => (typeof window === "undefined" ? undefined : getPersister()), []);

  const persistOptions = useMemo<DeferredPersistOptions | undefined>(() => {
    if (!persister) return undefined;
    return {
      queryClient,
      persister,
      maxAge: ONE_DAY_MS,
      // Bump this when a cached query's shape changes incompatibly, to drop old localStorage
      // entries instead of feeding stale-shaped data into components expecting the new one.
      buster: "v1",
      dehydrateOptions: {
        // Song *lists* (["songs", "mine", ...]) are plain, JSON-safe summaries — fine to
        // persist. A song's own detail (["songs", "bySlug", ...]) carries its full editable
        // content, which includes a native `Set` (SongContent.merges); the persister's default
        // JSON serialization silently drops Set contents, so persisting it would hand the editor
        // a corrupted, merge-less song on next reload. It stays cached in memory only.
        shouldDehydrateQuery: (query) =>
          query.state.status === "success" &&
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === "songs" &&
          query.queryKey[1] !== "bySlug" &&
          query.queryKey[1] !== "detail",
      },
    };
  }, [persister, queryClient]);

  const isRestoring = useDeferredPersistQueryClient(persistOptions);

  return (
    <QueryClientProvider client={queryClient}>
      <IsRestoringProvider value={isRestoring}>
        <AnalyticsTracker />
        <ServiceWorkerRegistrar />
        <ToastProvider>
          <AuthCallbackErrorToast />
          <AuthRequiredProvider session={session}>{children}</AuthRequiredProvider>
        </ToastProvider>
      </IsRestoringProvider>
    </QueryClientProvider>
  );
}
