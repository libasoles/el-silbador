import type { SongContent } from "../data/types";

export interface PendingSongResumerDeps {
  /** The unexpired new song stored locally when its author clicked Save without a session. */
  readPendingSong: () => { creationId: string; content: SongContent } | null;
  /** The creation id this tab reserved or restored, if any, even after the local copy is gone. */
  rememberedCreationId: () => string | undefined;
  saveSong: (input: { id: string; content: SongContent }) => Promise<{ id: string; slug: string }>;
  /** The slug of an already-saved song, or `null` when no such row exists. */
  findSongSlug: (id: string) => Promise<string | null>;
  clearPendingSong: () => void;
}

export type ResumeOutcome =
  | { kind: "idle" }
  | { kind: "saved"; id: string; slug: string }
  | { kind: "failed"; error: unknown };

let inFlight: Promise<ResumeOutcome> | null = null;

/**
 * Completes the save of a new song that was started without a session, from whichever page the
 * signed-in author is on. Upserting on the reserved creation id keeps it idempotent when several
 * tabs resume at once. A failed save keeps the local copy, so a later call retries it.
 *
 * When the local copy is already gone because another tab saved it, this tab's remembered
 * creation id still finds that song, so every tab ends up on it. Overlapping calls in one tab
 * share a single attempt.
 */
export function resumePendingSong(deps: PendingSongResumerDeps): Promise<ResumeOutcome> {
  inFlight ??= resume(deps).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function resume(deps: PendingSongResumerDeps): Promise<ResumeOutcome> {
  const pending = deps.readPendingSong();
  if (pending) {
    try {
      const saved = await deps.saveSong({ id: pending.creationId, content: pending.content });
      deps.clearPendingSong();
      return { kind: "saved", id: saved.id, slug: saved.slug };
    } catch (error) {
      return { kind: "failed", error };
    }
  }

  const creationId = deps.rememberedCreationId();
  if (!creationId) return { kind: "idle" };
  let slug: string | null;
  try {
    slug = await deps.findSongSlug(creationId);
  } catch (error) {
    // The song may well be saved; say so through the retry path rather than silently leaving
    // this tab showing it as unsaved.
    return { kind: "failed", error };
  }
  if (!slug) return { kind: "idle" };
  deps.clearPendingSong();
  return { kind: "saved", id: creationId, slug };
}
