import { useCallback, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { getSong, saveSong } from "../data";
import { songQueryKeys } from "../data/queryKeys";
import { trackEvent } from "./analytics";
import { clearDraft, readDraft, rememberedPendingCreationId } from "./draftStorage";
import {
  clearPendingAuthAction,
  readPendingAuthAction,
} from "./pendingAuthActionStorage";
import {
  resumePendingSong,
  type PendingSongResumerDeps,
  type ResumeOutcome,
} from "./resumePendingSong";
import { songEditPath } from "./songPaths";
import { SONG_SAVED_TOAST } from "./songSavedToast";
import { useToast } from "./toastContext";

const deps: PendingSongResumerDeps = {
  readPendingSong: () => {
    const draft = readDraft(undefined);
    return draft?.creationId ? { creationId: draft.creationId, content: draft.content } : null;
  },
  rememberedCreationId: rememberedPendingCreationId,
  saveSong,
  findSongSlug: (id) =>
    getSong(id).then(
      (song) => song.slug,
      (error: unknown) => {
        // PostgREST's "no rows" for `.single()`: the song was never saved. Anything else is a
        // real failure the resumer reports and retries.
        if ((error as { code?: string } | null)?.code === "PGRST116") return null;
        throw error;
      },
    ),
  clearPendingSong: () => {
    clearDraft();
    const pendingAction = readPendingAuthAction();
    if (pendingAction?.type === "save-song" && pendingAction.songSlug === null) {
      clearPendingAuthAction();
    }
  },
};

// Overlapping callers in one tab (the app-wide resumer and a Save click) share one attempt; only
// the first to receive it navigates and shows the toast.
const handledAttempts = new WeakSet<Promise<ResumeOutcome>>();

/**
 * Returns a function that saves this browser's pending new song (see `resumePendingSong`) and,
 * once saved, shows it at its own URL with the "Canción guardada" toast. The toast provider sits
 * above every route, so the toast survives that navigation. Callers must only call it with a
 * session.
 */
export function usePendingSongResume(): () => Promise<void> {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  // Read at call time: navigating must not recreate the function and resume again.
  const pathnameRef = useRef(pathname);
  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  return useCallback(async () => {
    const attempt = resumePendingSong(deps);
    if (handledAttempts.has(attempt)) return;
    handledAttempts.add(attempt);
    const outcome = await attempt;
    if (outcome.kind === "idle") return;
    if (outcome.kind === "failed") {
      console.error("No se pudo guardar la canción pendiente.", outcome.error);
      showToast({
        variant: "error",
        title: "No se pudo guardar tu canción, lo reintentamos",
        description: "Queda guardada en este navegador hasta que se pueda guardar.",
      });
      return;
    }

    trackEvent("song_saved", { song_id: outcome.id });
    queryClient.invalidateQueries({ queryKey: songQueryKeys.mineAll });
    queryClient.invalidateQueries({ queryKey: songQueryKeys.bySlug(outcome.slug) });
    // The author just wrote this song, so it reopens in the editor rather than read-only.
    const songPath = songEditPath(outcome.slug);
    // Leaving /nueva behind keeps Back from returning to an editor for a song that now exists.
    if (pathnameRef.current === "/nueva") router.replace(songPath);
    else if (pathnameRef.current !== songPath) router.push(songPath);
    showToast(SONG_SAVED_TOAST);
  }, [router, queryClient, showToast]);
}
