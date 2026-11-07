"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initAnalytics, trackPageView } from "../editor/analytics";
import { AuthRequiredProvider } from "../editor/AuthRequired";
import { AuthCallbackErrorToast } from "../editor/components/AuthCallbackErrorToast";
import { PendingSongResumer } from "../editor/PendingSongResumer";
import { ToastProvider } from "../editor/components/ToastProvider";
import { useAuth } from "../editor/useAuth";
import { useLoginTracking } from "../editor/loginTracking";
import { LibraryCacheProvider } from "./LibraryCacheProvider";
import { LIBRARY_CACHE_MAX_AGE } from "../data/libraryQueryPersistence";
import { songQueryKeys } from "../data/queryKeys";

function makeQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      // Mutations invalidate their queries explicitly. Avoid extra fetches on focus/reconnect;
      // persisted personal lists revalidate when mounted, including after a reload.
      queries: {
        staleTime: 60_000,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      },
    },
  });
  for (const queryKey of [songQueryKeys.mineAll, songQueryKeys.favoritesAll]) {
    client.setQueryDefaults(queryKey, { gcTime: LIBRARY_CACHE_MAX_AGE, staleTime: 0 });
  }
  return client;
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

// Remove the obsolete cache format; personal library persistence uses its own versioned key.
function LegacyQueryCacheCleanup() {
  useEffect(() => {
    try {
      window.localStorage.removeItem("silabeo-query-cache");
    } catch {
      // Storage can be unavailable (private mode, blocked site data); nothing to clean then.
    }
  }, []);

  return null;
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
  useLoginTracking(session);
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <LibraryCacheProvider session={session}>
        <LegacyQueryCacheCleanup />
        <AnalyticsTracker />
        <ServiceWorkerRegistrar />
        <ToastProvider>
          <AuthCallbackErrorToast />
          <PendingSongResumer session={session} />
          <AuthRequiredProvider session={session}>{children}</AuthRequiredProvider>
        </ToastProvider>
      </LibraryCacheProvider>
    </QueryClientProvider>
  );
}
