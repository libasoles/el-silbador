import { deserializeContent, serializeContent, type StoredSongContent } from "../data/songs";
import type { SongContent } from "../data/types";

const STORAGE_KEY = "silabeo:pending-draft";
// A new song only exists in this browser until it is first saved, so it waits a whole day for the
// author to come back signed in (see PendingSongResumer).
const NEW_SONG_EXPIRY_MS = 24 * 60 * 60 * 1000;
// An existing song's draft overwrites what the server holds once restored. Keep it short enough
// that an abandoned edit doesn't resurrect itself over that content on some unrelated later visit.
const EXISTING_SONG_EXPIRY_MS = 30 * 60 * 1000;

export interface Draft {
  songId: string | null;
  /** Stable database id reserved before authentication so every tab upserts the same new song. */
  creationId?: string;
  content: SongContent;
}

interface StoredDraft {
  songId: string | null;
  creationId?: string;
  savedAt: number;
  content: StoredSongContent;
}

// The creation id this tab reserved or restored. Another tab may complete the save and remove the
// local copy first; this tab still needs the id to find the saved song and show it.
let rememberedCreationId: string | undefined;

/**
 * Persists the in-progress song to `localStorage` so it survives the full-page reload triggered
 * by following a magic-link sign-in email. Without this, that reload lands on a fresh app
 * instance with no in-memory editor state, so the unsaved edits that prompted the sign-in would
 * otherwise be lost.
 *
 * Rewriting a new song's draft passes back its `creationId` so the reserved id stays the same.
 */
export function saveDraft(
  songId: string | undefined,
  content: SongContent,
  creationId: string | undefined = songId ? undefined : crypto.randomUUID(),
): Draft {
  const stored: StoredDraft = {
    songId: songId ?? null,
    // A fresh song has no server id yet. Reserve one now, before opening the magic link, so the
    // original tab and every tab that follows that link all upsert the same row.
    ...(creationId ? { creationId } : {}),
    savedAt: Date.now(),
    content: serializeContent(content),
  };
  if (creationId) rememberedCreationId = creationId;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("No se pudo guardar el borrador localmente.", error);
  }
  return { songId: songId ?? null, ...(creationId ? { creationId } : {}), content };
}

/** Reads back a draft saved by `saveDraft` for the given song (`undefined` for a new, unsaved
 *  song), if one is stored, matches that song, and hasn't expired. An expired draft is removed. */
export function readDraft(songId: string | undefined): Draft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredDraft;
    const expiry = stored.songId === null ? NEW_SONG_EXPIRY_MS : EXISTING_SONG_EXPIRY_MS;
    if (Date.now() - stored.savedAt > expiry) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    if (stored.songId !== (songId ?? null)) return null;
    if (typeof stored.creationId === "string") rememberedCreationId = stored.creationId;
    return {
      songId: stored.songId,
      ...(typeof stored.creationId === "string" ? { creationId: stored.creationId } : {}),
      content: deserializeContent(stored.content),
    };
  } catch (error) {
    console.error("No se pudo leer el borrador guardado.", error);
    return null;
  }
}

/** The creation id this tab reserved or restored, even if another tab already removed the
 *  local copy after saving it. */
export function rememberedPendingCreationId(): string | undefined {
  return rememberedCreationId;
}

export function clearDraft(): void {
  rememberedCreationId = undefined;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage may be unavailable (private browsing, disabled cookies); nothing to clean up then.
  }
}
