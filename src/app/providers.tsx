"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initAnalytics, trackPageView } from "../editor/analytics";
import { AuthRequiredProvider } from "../editor/AuthRequired";
import { AuthCallbackErrorToast } from "../editor/components/AuthCallbackErrorToast";
import { ToastProvider } from "../editor/components/ToastProvider";
import { useAuth } from "../editor/useAuth";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      // Data comes from Supabase and only changes through our own mutations (save/delete/fork/
      // favorite), which invalidate their queries explicitly — so there's no need to refetch just
      // because the window regained focus or the network reconnected.
      queries: {
        staleTime: 60_000,
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

// React Query's in-memory client is the only frontend cache. Earlier versions persisted song
// lists to localStorage under this key; drop any leftover copy so it doesn't linger on disk.
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
  const [queryClient] = useState(getQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <LegacyQueryCacheCleanup />
      <AnalyticsTracker />
      <ServiceWorkerRegistrar />
      <ToastProvider>
        <AuthCallbackErrorToast />
        <AuthRequiredProvider session={session}>{children}</AuthRequiredProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
