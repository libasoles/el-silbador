import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { getSession, onAuthStateChange } from "../data/auth";

/** Tracks the current Supabase session, live-updated across sign-in/sign-out/refresh. */
export function useAuth(): Session | null {
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((current) => {
        if (!cancelled) setSession(current);
      })
      .catch((error: unknown) => {
        console.error("No se pudo obtener la sesión.", error);
      });
    const unsubscribe = onAuthStateChange((next) => setSession(next));
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return session;
}
