"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { initAnalytics, trackPageView } from "../editor/analytics";
import { AuthRequiredProvider } from "../editor/AuthRequired";
import { AuthCallbackErrorToast } from "../editor/components/AuthCallbackErrorToast";
import { ToastProvider } from "../editor/components/ToastProvider";
import { useAuth } from "../editor/useAuth";

const queryClient = new QueryClient({
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
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  return null;
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

export function Providers({ children }: { children: React.ReactNode }) {
  const session = useAuth();
  return (
    <QueryClientProvider client={queryClient}>
      <LegacyQueryCacheCleanup />
      <AnalyticsTracker />
      <ServiceWorkerRegistrar />
      <ToastProvider>
        <AuthCallbackErrorToast />
        <AuthRequiredProvider session={session}>
          {children}
        </AuthRequiredProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
