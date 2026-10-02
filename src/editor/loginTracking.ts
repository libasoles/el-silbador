import { useEffect, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import { trackEvent } from "./analytics";

/** True when the URL fragment is a Supabase implicit-flow magic-link callback carrying a session. */
export function isMagicLinkCallback(hash: string): boolean {
  const parameters = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash);
  return parameters.has("access_token");
}

/**
 * Sends GA's `login` event once per completed magic-link login. Supabase also reports restored
 * sessions on every page load, so the session alone can't tell a fresh login from a reload; the
 * callback fragment in the URL (read before Supabase strips it) is what marks the arrival.
 */
export function useLoginTracking(session: Session | null | undefined): void {
  const arrivedViaMagicLink = useRef(false);
  const tracked = useRef(false);

  useEffect(() => {
    arrivedViaMagicLink.current = isMagicLinkCallback(window.location.hash);
  }, []);

  useEffect(() => {
    if (!session || tracked.current || !arrivedViaMagicLink.current) return;
    tracked.current = true;
    trackEvent("login", { method: "magic_link" });
  }, [session]);
}
