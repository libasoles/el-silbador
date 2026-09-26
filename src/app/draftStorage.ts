import { deserializeContent, serializeContent, type StoredSongContent } from "../data/songs";
import type { SongContent } from "../data/types";

const STORAGE_KEY = "silabeo:pending-draft";
// Long enough to check an inbox and follow the magic-link email, short enough that an
// abandoned draft doesn't resurrect itself over unrelated content on some later, unrelated visit.
const EXPIRY_MS = 30 * 60 * 1000;

export interface Draft {
  songId: string | null;
  content: SongContent;
}

interface StoredDraft {
  songId: string | null;
  savedAt: number;
  content: StoredSongContent;
}

/**
 * Persists the in-progress song to `localStorage` so it survives the full-page reload triggered
 * by following a magic-link sign-in email. Without this, that reload lands on a fresh app
 * instance with no in-memory editor state, so the unsaved edits that prompted the sign-in would
 * otherwise be lost.
 */
export function saveDraft(songId: string | undefined, content: SongContent): void {
  const stored: StoredDraft = {
    songId: songId ?? null,
    savedAt: Date.now(),
    content: serializeContent(content),
  };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("No se pudo guardar el borrador localmente.", error);
  }
}

/** Reads back a draft saved by `saveDraft` for the given song (`undefined` for a new, unsaved
 *  song), if one is stored, matches that song, and hasn't expired. */
export function readDraft(songId: string | undefined): Draft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredDraft;
    if (stored.songId !== (songId ?? null)) return null;
    if (Date.now() - stored.savedAt > EXPIRY_MS) return null;
    return { songId: stored.songId, content: deserializeContent(stored.content) };
  } catch (error) {
    console.error("No se pudo leer el borrador guardado.", error);
    return null;
  }
}

export function clearDraft(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private browsing, disabled cookies); nothing to clean up then.
  }
}
