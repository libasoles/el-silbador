import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

const STORAGE_PREFIX = "el-silbador:chord-diagrams:";
const choices = new Map<string, boolean>();
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function readPreference(songId: string | undefined) {
  if (!songId) return false;
  if (choices.has(songId)) return choices.get(songId)!;
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${songId}`) === "true";
  } catch {
    return false;
  }
}

function savePreference(songId: string, next: boolean) {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${songId}`, String(next));
    choices.delete(songId);
  } catch {
    // Restricted storage: keep this song's choice for the current visit.
    choices.set(songId, next);
  }
  for (const listener of listeners) listener();
}

/** A per-song reading preference in this browser, independent of ownership. */
export function useChordDiagramsToggle(songId: string | undefined, onShow: () => void) {
  const read = useCallback(() => readPreference(songId), [songId]);
  const saved = useSyncExternalStore(subscribe, read, () => false);
  const [draftChoice, setDraftChoice] = useState(false);
  const pendingDraftChoice = useRef<boolean | null>(null);
  const pressed = songId ? saved : draftChoice;
  useLayoutEffect(() => {
    if (songId && pendingDraftChoice.current !== null) {
      savePreference(songId, pendingDraftChoice.current);
      pendingDraftChoice.current = null;
    }
  }, [songId]);
  useLayoutEffect(() => {
    if (pressed) onShow();
  }, [pressed, songId, onShow]);
  return {
    pressed,
    toggle: () => {
      const next = !pressed;
      if (!songId) {
        pendingDraftChoice.current = next;
        setDraftChoice(next);
        return;
      }
      savePreference(songId, next);
    },
  };
}
