import { useEffect, useRef, useState } from "react";
import { saveSong } from "../data";
import type { SongContent } from "../data/types";

const DEBOUNCE_MS = 1000;

export type AutosaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Persists `content` to Supabase on a debounce, mirroring the resyllabify coordinator's
 * inactivity pattern (see resyllabifyCoordinator.ts) rather than a manual save button. The first
 * change after mount/song-load is skipped so opening an existing song (which replaces `content`
 * via loadContent) doesn't immediately re-save it unchanged.
 */
export function useAutosave(
  content: SongContent,
  songId: string | undefined,
  onCreated: (id: string) => void,
): AutosaveStatus {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const idRef = useRef(songId);
  const skipNext = useRef(true);

  useEffect(() => {
    idRef.current = songId;
    skipNext.current = true;
  }, [songId]);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      setStatus("saving");
      try {
        const saved = await saveSong({ id: idRef.current, content });
        if (cancelled) return;
        idRef.current = saved.id;
        if (!songId) onCreated(saved.id);
        setStatus("saved");
      } catch (error) {
        if (cancelled) return;
        console.error("No se pudo guardar la canción.", error);
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [content, songId, onCreated]);

  return status;
}
