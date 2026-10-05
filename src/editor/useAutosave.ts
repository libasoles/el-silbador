import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { saveSong, setSongPerformers } from "../data";
import { songQueryKeys } from "../data/queryKeys";
import type { SongContent } from "../data/types";
import { sameArtistNames } from "../core/artistNames";
import { revalidatePublicSongs } from "../app/actions";

const DEBOUNCE_MS = 1000;

/** Everything one save writes: the song row, then (only if they changed) its performers. */
interface SaveSnapshot {
  content: SongContent;
  performers: string[];
}

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

export interface AutosaveHandle {
  status: SaveStatus;
  /** Saves immediately without waiting for `content` to change again, bypassing both the debounce
   *  and (for a brand-new song) the manual-first-save gate below. Used by the Save button both to
   *  recover from an "error" status and to perform a new song's required first save. */
  retry: () => void;
}

/**
 * Persists `content` to Supabase on a debounce, mirroring the resyllabify coordinator's
 * inactivity pattern (see resyllabifyCoordinator.ts) rather than a manual save button. The first
 * change after mount/song-load is skipped so opening an existing song (which replaces `content`
 * via loadContent) doesn't immediately re-save it unchanged.
 *
 * `ready` gates this: while an existing song's content and real id are still being resolved,
 * `content` only holds the editor's default/empty state, and no save may fire off that (it would
 * either resave a blank song over the real one, or — before the id is known — insert a duplicate
 * row instead of updating it). The "skip next change" latch is re-armed the moment `ready` flips
 * true, so the load itself (which replaces `content` via loadContent right as `ready` flips) is
 * swallowed rather than mistaken for a real edit.
 *
 * Saving only ever reaches the network while `authenticated` is true — otherwise changes just
 * accumulate as "dirty" so the Save button lights up, and it's that button's click (opening the
 * login/register modal) that gets the user authenticated in the first place. The moment
 * `authenticated` flips true, any pending dirty content saves immediately rather than waiting out
 * the usual debounce, so login visibly finishes the save the user asked for.
 *
 * `canPersist` (owner of this song, and not mobile) is deliberately a separate gate from
 * `authenticated` (real sign-in state). `canPersist` often resolves a moment after `ready` —
 * ownership isn't known until the song's owner id has been fetched — and if that resolution were
 * folded into `authenticated` instead, its false→true flip would look identical to "the user just
 * signed in" and fire an immediate, contentless save the instant ownership was confirmed. Instead
 * a `canPersist` flip re-arms the same "skip the next change" latch `ready` uses. While
 * `canPersist` is false — including the entire time spent viewing someone else's song — this hook
 * never marks anything dirty or reaches the network, no matter what `content` or `authenticated` do.
 *
 * `isNewSong` enforces the product rule that a brand-new song's *first* save must be an explicit
 * user action, never a silent debounced write moments after they start typing. While it's true and
 * no save has completed yet, edits only flip the status to "dirty" (lighting up the Save button)
 * instead of reaching the network; `retry()` — the Save button's click handler — is what actually
 * performs that first save, the same way it already bypasses the debounce for error recovery.
 * Signing in mid-edit (`justAuthenticated`) also bypasses the gate: that flow's own first save is
 * already the direct result of the user having clicked Save before `requireAuthentication` sent
 * them to sign in. Once any save under either path succeeds, the gate lifts for the rest of this
 * hook's lifetime and every later edit autosaves as usual — this rule only governs the first save.
 *
 * `performers` live outside `content` (their own tables, see
 * supabase/migrations/0011_artists_and_performers.sql) but save through this same flow: after the
 * song upsert, `setSongPerformers` runs only if they differ from the last list known to be stored,
 * which is the list present when the song loaded (the same moment the "skip next change" latch
 * swallows) until a save stores a new one. A new song's first save therefore creates the row and
 * then its performers. If that second write fails, the whole save is in "error", and the retry
 * writes both again.
 */
export function useAutosave(
  content: SongContent,
  performers: string[],
  songId: string | undefined,
  ready: boolean,
  authenticated: boolean,
  canPersist: boolean,
  isNewSong: boolean,
  onSlugResolved: (id: string, slug: string) => void,
): AutosaveHandle {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [retryTick, setRetryTick] = useState(0);
  const idRef = useRef(songId);
  const previousSongIdRef = useRef(songId);
  const skipNext = useRef(true);
  const wasAuthenticated = useRef(authenticated);
  const lastRetryTick = useRef(retryTick);
  const wasReady = useRef(ready);
  const wasCanPersist = useRef(canPersist);
  // A new song has no id until its first request returns. Serialize requests so overlapping
  // effects cannot each insert a separate row during that gap.
  const saveInFlightRef = useRef(false);
  const queuedSnapshotRef = useRef<SaveSnapshot | null>(null);
  // The performers last known to be stored for this song; see the doc comment above.
  const storedPerformersRef = useRef(performers);
  const mountedRef = useRef(true);
  // Only a brand-new song (no id yet, from the route) needs its first save gated behind a manual
  // action. Read once at mount: `isNewSong` is derived from the route slug and never flips true
  // mid-session, so nothing later needs to re-arm this.
  const requiresManualFirstSave = useRef(isNewSong);
  // Route callbacks may be recreated by their parent. They are navigation side effects, not
  // document input, so a changed callback must not re-arm the content debounce.
  const onSlugResolvedRef = useRef(onSlugResolved);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    onSlugResolvedRef.current = onSlugResolved;
  }, [onSlugResolved]);

  useEffect(() => {
    const switchedExistingSong =
      previousSongIdRef.current !== undefined &&
      songId !== undefined &&
      previousSongIdRef.current !== songId;
    idRef.current = songId;
    // Loading another existing song replaces the document and must not write that loaded content
    // back immediately. The first id assigned to a newly-created song is a save result, though,
    // so it must not consume the next real edit.
    if (switchedExistingSong) skipNext.current = true;
    previousSongIdRef.current = songId;
  }, [songId]);

  useEffect(() => {
    if (ready && !wasReady.current) {
      skipNext.current = true;
    }
    wasReady.current = ready;
  }, [ready]);

  useEffect(() => {
    if (canPersist && !wasCanPersist.current) {
      skipNext.current = true;
    }
    wasCanPersist.current = canPersist;
  }, [canPersist]);

  useEffect(() => {
    // Never even marks the content dirty while viewing a song that isn't yours (or on mobile):
    // `canPersist` is the sole gate for that, kept independent of `authenticated` above.
    if (!ready || !canPersist) return;

    const justAuthenticated = authenticated && !wasAuthenticated.current;
    const isRetry = retryTick !== lastRetryTick.current;
    wasAuthenticated.current = authenticated;
    lastRetryTick.current = retryTick;

    if (skipNext.current && !isRetry) {
      skipNext.current = false;
      // Whatever arrives with the loaded song is what the database already holds.
      storedPerformersRef.current = performers;
      return;
    }
    skipNext.current = false;

    if (!authenticated) {
      const timer = setTimeout(() => setStatus("dirty"), 0);
      return () => clearTimeout(timer);
    }

    // A brand-new song's first save must come from an explicit Save click (`retry`), not from
    // this debounce — see the `isNewSong` doc above. `justAuthenticated` still goes through: that
    // save is the completion of a click that already happened before sign-in.
    if (requiresManualFirstSave.current && !isRetry && !justAuthenticated) {
      const timer = setTimeout(() => setStatus("dirty"), 0);
      return () => clearTimeout(timer);
    }

    const persist = async (snapshot: SaveSnapshot): Promise<void> => {
      if (!mountedRef.current) return;
      if (saveInFlightRef.current) {
        // The first request will assign `idRef`; save only the newest document after it finishes.
        queuedSnapshotRef.current = snapshot;
        return;
      }

      saveInFlightRef.current = true;
      setStatus("saving");
      let completed = false;
      try {
        const saved = await saveSong({ id: idRef.current, content: snapshot.content });
        // Keep the id even if a render change interrupted this effect: any later save must update
        // this row rather than insert another one.
        idRef.current = saved.id;
        requiresManualFirstSave.current = false;
        if (!sameArtistNames(snapshot.performers, storedPerformersRef.current)) {
          await setSongPerformers(saved.id, snapshot.performers);
          storedPerformersRef.current = snapshot.performers;
        }
        if (!mountedRef.current) return;
        // Fires on every save, not just the first: a title edit regenerates an existing song's
        // slug too (see useAutosave.ts's caller), and the caller needs to keep the URL in sync.
        onSlugResolvedRef.current(saved.id, saved.slug);
        queryClient.invalidateQueries({ queryKey: songQueryKeys.mineAll });
        queryClient.invalidateQueries({ queryKey: songQueryKeys.bySlug(saved.slug) });
        queryClient.invalidateQueries({ queryKey: songQueryKeys.public() });
        await revalidatePublicSongs();
        queryClient.invalidateQueries({ queryKey: songQueryKeys.favoritesAll });
        if (!mountedRef.current) return;
        completed = true;
        setStatus("saved");
      } catch (error) {
        if (!mountedRef.current) return;
        console.error("No se pudo guardar la canción.", error);
        setStatus("error");
      } finally {
        saveInFlightRef.current = false;
        const queued = queuedSnapshotRef.current;
        queuedSnapshotRef.current = null;
        // A change during the first request saves as an update now that `idRef` is known.
        if (
          completed &&
          queued &&
          (queued.content !== snapshot.content || queued.performers !== snapshot.performers) &&
          mountedRef.current
        ) {
          void persist(queued);
        }
      }
    };

    const timer = setTimeout(
      () => void persist({ content, performers }),
      justAuthenticated || isRetry ? 0 : DEBOUNCE_MS,
    );

    return () => clearTimeout(timer);
  }, [content, performers, ready, authenticated, canPersist, retryTick, queryClient]);

  return { status, retry: () => setRetryTick((tick) => tick + 1) };
}
