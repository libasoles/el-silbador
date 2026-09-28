"use client";

import { useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { initAnalytics, trackPageView } from "../editor/analytics";
import { AuthRequiredProvider } from "../editor/AuthRequired";
import { ToastProvider } from "../editor/components/ToastProvider";
import { useAuth } from "../editor/useAuth";

// gcTime must be at least as long as the persister's maxAge below, or React Query garbage-collects
// a query from memory (and skips persisting it) before it'd otherwise expire.
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const queryClient = new QueryClient({
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

function getPersister() {
  return createSyncStoragePersister({
    storage: window.localStorage,
    key: "silabeo-query-cache",
  });
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

export function Providers({ children }: { children: React.ReactNode }) {
  const session = useAuth();
  // `localStorage` doesn't exist during SSR — this component still renders on the server to
  // produce the initial HTML, so the persisted client can only be created once in the browser.
  const persister = useMemo(() => (typeof window === "undefined" ? undefined : getPersister()), []);

  if (!persister) {
    return (
      <QueryClientProvider client={queryClient}>
        <AnalyticsTracker />
        <ToastProvider>
          <AuthRequiredProvider session={session}>{children}</AuthRequiredProvider>
        </ToastProvider>
      </QueryClientProvider>
    );
  }

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
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
      }}
    >
      <AnalyticsTracker />
      <ToastProvider>
        <AuthRequiredProvider session={session}>{children}</AuthRequiredProvider>
      </ToastProvider>
    </PersistQueryClientProvider>
  );
}
