import { useEffect } from "react";
import type { Session } from "@supabase/supabase-js";
import { usePendingSongResume } from "./usePendingSongResume";

/**
 * Mounted once for the whole app, so a new song saved locally before signing in is finished on
 * whichever page the author comes back to signed in — the magic link may land anywhere, the
 * index included, and so may any later visit. Also runs in a tab that only receives the session
 * from another tab.
 */
export function PendingSongResumer({ session }: { session: Session | null | undefined }) {
  const resume = usePendingSongResume();
  const userId = session?.user.id;

  useEffect(() => {
    if (userId) void resume();
  }, [userId, resume]);

  return null;
}
