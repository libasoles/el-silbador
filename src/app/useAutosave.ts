import { useEffect, useRef, useState } from "react";
import { saveSong } from "../data";
import type { SongContent } from "../data/types";

const DEBOUNCE_MS = 1000;

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface AutosaveHandle {
  status: SaveStatus;
  /** Re-attempts a save immediately without waiting for `content` to change again — used by the
   *  Save button to recover from an "error" status. */
  retry: () => void;
}

/**
 * Persists `content` to Supabase on a debounce, mirroring the resyllabify coordinator's
 * inactivity pattern (see resyllabifyCoordinator.ts) rather than a manual save button. The first
 * change after mount/song-load is skipped so opening an existing song (which replaces `content`
 * via loadContent) doesn't immediately re-save it unchanged.
 *
 * `contentLoaded` gates this: while an existing song's content is still being fetched, `content`
 * only holds the editor's default/empty state, and no save may fire off that. The "skip next
 * change" latch is re-armed the moment `contentLoaded` flips true, so the load itself (which
 * replaces `content` via loadContent right as `contentLoaded` flips) is swallowed rather than
 * mistaken for a real edit.
 *
 * Saving only ever reaches the network while `authenticated` is true — otherwise changes just
 * accumulate as "dirty" so the Save button lights up, and it's that button's click (opening the
 * login/register modal) that gets the user authenticated in the first place. The moment
 * `authenticated` flips true, any pending dirty content saves immediately rather than waiting out
 * the usual debounce, so login visibly finishes the save the user asked for.
 */
export function useAutosave(
  content: SongContent,
  songId: string | undefined,
  authenticated: boolean,
  contentLoaded: boolean,
  onCreated: (id: string) => void,
): AutosaveHandle {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [retryTick, setRetryTick] = useState(0);
  const idRef = useRef(songId);
  const skipNext = useRef(true);
  const wasAuthenticated = useRef(authenticated);
  const lastRetryTick = useRef(retryTick);
  const wasContentLoaded = useRef(contentLoaded);

  useEffect(() => {
    idRef.current = songId;
    skipNext.current = true;
  }, [songId]);

  useEffect(() => {
    if (contentLoaded && !wasContentLoaded.current) {
      skipNext.current = true;
    }
    wasContentLoaded.current = contentLoaded;
  }, [contentLoaded]);

  useEffect(() => {
    if (!contentLoaded) return;

    const justAuthenticated = authenticated && !wasAuthenticated.current;
    const isRetry = retryTick !== lastRetryTick.current;
    wasAuthenticated.current = authenticated;
    lastRetryTick.current = retryTick;

    if (skipNext.current && !isRetry) {
      skipNext.current = false;
      return;
    }
    skipNext.current = false;

    if (!authenticated) {
      const timer = setTimeout(() => setStatus("dirty"), 0);
      return () => clearTimeout(timer);
    }

    let cancelled = false;
    const timer = setTimeout(
      async () => {
        setStatus("saving");
        const wasNew = !idRef.current;
        try {
          const saved = await saveSong({ id: idRef.current, content });
          if (cancelled) return;
          idRef.current = saved.id;
          if (wasNew) onCreated(saved.id);
          setStatus("saved");
        } catch (error) {
          if (cancelled) return;
          console.error("No se pudo guardar la canción.", error);
          setStatus("error");
        }
      },
      justAuthenticated || isRetry ? 0 : DEBOUNCE_MS,
    );

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [content, songId, onCreated, authenticated, retryTick, contentLoaded]);

  return { status, retry: () => setRetryTick((tick) => tick + 1) };
}
