import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from "react";
import dynamic from "next/dynamic";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./App.css";
const neutralIllustration = "/03-neutral.svg";
import { chordToNoteNames } from "../core/chordNotes";
import type { CellsByTrack, TrackDef } from "../core/types";
import {
  deleteSong,
  forkSong,
  getSong,
  getSongBySlug,
  isCurrentUserAdmin,
  setSongPublic,
  setSongYoutubeUrl,
} from "../data";
import { profileQueryKeys, songQueryKeys } from "../data/queryKeys";
import type { SongContent, SongDetail } from "../data/types";
import { revalidatePublicSongs } from "../app/actions";
import type { TransposeWidget as TransposeWidgetComponent } from "../transpose/TransposeWidget";
import { trackEvent } from "./analytics";
import { useAuthRequired } from "./authRequiredContext";
import type { ConfirmDialog as ConfirmDialogComponent } from "./components/ConfirmDialog";
import { IconButtonTooltip } from "./components/IconButtonTooltip";
import { MelodyTutorialExample } from "./components/MelodyTutorialExample";
import { SongView } from "./components/SongView";
import type { YoutubeLinkDialog as YoutubeLinkDialogComponent } from "./components/YoutubeLinkDialog";
import {
  DownloadIcon,
  ForkIcon,
  MenuIcon,
  PrivacyLockedIcon,
  PrivacyUnlockedIcon,
  SaveIcon,
  SilbadorIcon,
  SpinnerIcon,
  NoteStackIcon,
  TrackIcon,
  TrashIcon,
  UnderlineIcon,
  XIcon,
  YoutubeIcon,
} from "./components/icons";
import { applyTheme, deriveTheme } from "./theme";
import { clearDraft, readDraft, saveDraft } from "./draftStorage";
import { useAutosave } from "./useAutosave";
import { useEditor } from "./useEditor";
import {
  clearPendingAuthAction,
  readPendingAuthAction,
} from "./pendingAuthActionStorage";
import { consumeJustForked, saveJustForked } from "./justForkedStorage";
import { pdfDocumentTitle } from "./pdfFilename";
import { useToast } from "./toastContext";
import { useIsMobile } from "./useIsMobile";

const DEFAULT_ACCENT_COLOR = "#9c4a3c";

type ConfirmDialogProps = ComponentProps<typeof ConfirmDialogComponent>;
type YoutubeLinkDialogProps = ComponentProps<typeof YoutubeLinkDialogComponent>;
type TransposeWidgetProps = ComponentProps<typeof TransposeWidgetComponent>;

const ConfirmDialog = dynamic<ConfirmDialogProps>(() =>
  import("./components/ConfirmDialog").then((mod) => ({
    default: mod.ConfirmDialog,
  })),
);

const YoutubeLinkDialog = dynamic<YoutubeLinkDialogProps>(() =>
  import("./components/YoutubeLinkDialog").then((mod) => ({
    default: mod.YoutubeLinkDialog,
  })),
);

const TransposeWidget = dynamic<TransposeWidgetProps>(() =>
  import("../transpose/TransposeWidget").then((mod) => ({
    default: mod.TransposeWidget,
  })),
);

const AUTOSAVE_STATUS_LABEL: Record<"saving" | "saved" | "error", string> = {
  saving: "Guardando…",
  saved: "Guardado",
  error: "No se pudo guardar",
};

/** Stand-in for the lyrics/annotation grid while an existing song's content is still being
    fetched. Never shown for a brand-new song, which has no content to wait on. The title,
    author, and toolbars render normally throughout — only the editor area itself is replaced. */
function SongViewSkeleton() {
  return (
    <Theme hasBackground={false}>
      <div className="song-wrapper song-view-skeleton">
        {[
          "Primera línea de ejemplo",
          "Segunda línea, un poco más larga",
          "Tercera línea",
        ].map((line, index) => (
          <Skeleton key={index}>
            <span className="song-view-skeleton__line">{line}</span>
          </Skeleton>
        ))}
      </div>
    </Theme>
  );
}

/** Shown instead of the editor when a song's slug can't be resolved: it doesn't exist, or it's
    private and the current viewer isn't signed in as its owner. RLS makes those two cases
    indistinguishable to the client (both come back as "no row"), so they share one message
    rather than leaking which one applies. */
function SongNotFound() {
  return (
    <div className="song-not-found">
      <img className="song-not-found__mark" src={neutralIllustration} alt="" />
      <p className="empty-state">
        No encontramos esta canción. Puede que no exista, o que sea privada y
        solo la pueda ver quien la creó.
      </p>
      <a className="song-not-found__link" href="/">
        Ir al cancionero
      </a>
    </div>
  );
}

interface AppProps {
  /** Base color the underline, chord, and highlight colors are all derived from. */
  accentColor?: string;
  /** Slug of the song being edited, from the /cancion/:slug route. Absent for a new, unsaved song. */
  songSlug?: string;
  /** The song's full detail as already fetched anonymously on the server (see
   *  `SongPage`/`SongPageClient`), when public. Seeds every piece of state this component would
   *  otherwise wait on a client fetch for, so the first render already has real content instead of
   *  a skeleton — critical on mobile, where mounting the full editor tree once with this seed
   *  (instead of an empty one now and a full remount once auth resolves) avoids briefly doubling
   *  the DOM/listener footprint of a long song and crashing the tab. `null` covers "doesn't exist"
   *  and "private, not mine" the same way, since RLS makes them indistinguishable. */
  initialSong?: SongDetail | null;
  /** Called after every successful save with the song's id and current slug, so the URL can adopt
      it — fires both when autosave first creates the row and whenever a title edit later
      regenerates an existing song's slug. */
  onSongCreated?: (id: string, slug: string) => void;
  /** Called once the song is deleted, so the caller can navigate away from its now-gone slug. */
  onDeleted?: () => void;
}

interface TrackToggleButtonProps {
  track: TrackDef;
  cells: CellsByTrack;
  onToggle: () => void;
}

function TrackToggleButton({ track, cells, onToggle }: TrackToggleButtonProps) {
  const hasContent =
    track.id === "chordNotes"
      ? Object.values(cells.chords ?? {}).some(
          (text) => chordToNoteNames(text) !== null,
        )
      : Object.values(cells[track.id] ?? {}).some((text) => text.trim() !== "");
  // Editable tracks must be activatable while empty so the user can open a row and add its
  // first annotation. The derived chord-notes track remains unavailable until a chord exists.
  const disabled = track.id === "chordNotes" && !hasContent;
  const disabledTooltip =
    track.id === "chordNotes"
      ? "No hay notas que mostrar"
      : `No hay ${track.label.toLowerCase()} que mostrar`;
  return (
    <IconButtonTooltip tooltip={disabled ? disabledTooltip : track.label}>
      <button
        type="button"
        className="track-toolbar__toggle"
        aria-pressed={track.visible}
        aria-label={track.label}
        disabled={disabled}
        onClick={onToggle}
      >
        <TrackIcon trackId={track.id} />
      </button>
    </IconButtonTooltip>
  );
}

function App({
  accentColor = DEFAULT_ACCENT_COLOR,
  songSlug,
  initialSong,
  onSongCreated,
  onDeleted,
}: AppProps) {
  const queryClient = useQueryClient();
  const [loadError, setLoadError] = useState<{ songSlug: string } | null>(null);
  const { session, requireAuthentication } = useAuthRequired();
  const authenticated = Boolean(session);
  const { showToast, showTutorial } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [forking, setForking] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [songIsPublic, setSongIsPublic] = useState(
    () => initialSong?.isPublic ?? false,
  );
  const [togglingPublic, setTogglingPublic] = useState(false);
  const [songYoutubeUrl, setSongYoutubeUrlState] = useState<string | null>(
    () => initialSong?.youtubeUrl ?? null,
  );
  const [youtubeDialogOpen, setYoutubeDialogOpen] = useState(false);
  // Administrators may set a YouTube link before a new song is first saved. For other authors,
  // the control becomes available once their song has a database id.
  const [pendingYoutubeUrl, setPendingYoutubeUrl] = useState<
    string | null | undefined
  >(undefined);
  // Fork relationships are stored by database id, but navigation uses slugs. Resolve the source
  // song separately so the title-area link always points to its canonical URL.
  const [forkedFrom, setForkedFrom] = useState<string | null>(
    () => initialSong?.forkedFrom ?? null,
  );
  const [forkSourceSlug, setForkSourceSlug] = useState<string | null>(null);
  // The song's real database id, resolved from `songSlug` once `getSongBySlug` returns (or set
  // directly once autosave creates a brand-new song). Needed because writes (save/delete) still
  // key off the stable id rather than the slug.
  const [songDbId, setSongDbId] = useState<string | undefined>(
    () => initialSong?.id,
  );
  // Latest `songDbId`, readable from the load effect below without adding it to that effect's
  // dependencies (it intentionally only reruns for `songSlug` changes — see the effect's comment).
  const songDbIdRef = useRef(songDbId);
  songDbIdRef.current = songDbId;

  // Following a magic-link sign-in email reloads the page from scratch, so any content typed
  // before authenticating would otherwise vanish. If it was stashed in localStorage first (see
  // handleSaveClick below), restore it here and let the usual autosave-on-sign-in flow persist it.
  // `App` is server-rendered once (for the client hydration it produces — see
  // SongPageClient/NuevaPage), and `localStorage` doesn't exist on the server.
  const [restoredDraft] = useState(() =>
    typeof window === "undefined" ? null : readDraft(songSlug),
  );
  // A local draft always wins over the server's anonymous fetch: it's strictly newer (typed after
  // that fetch resolved). Passed to `useEditor` as this mount's one-time seed for the reducer's
  // initial state, so the very first render already shows real content instead of a skeleton —
  // avoiding a second, later mount of the full (potentially large) `SongView`/`LineView` tree,
  // which on mobile is what briefly doubles memory pressure enough to crash the tab (see
  // `SongPageClient`).
  // Read here (rather than at its other call site below) because it gates the underline-toggle
  // default that `useEditor` applies when loading content.
  const isMobile = useIsMobile();
  const { state, actions } = useEditor(
    (restoredDraft ?? initialSong)?.content,
    isMobile,
  );

  // A song can change without remounting the editor during client navigation. Treat that the
  // same as opening a fresh page: its mobile tools must start tucked away.
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [songSlug]);
  // Only an existing song (songSlug set, no restored draft, no server-fetched content) has content
  // worth waiting on; anything else starts "loaded" with its editor state already in place.
  const [contentLoaded, setContentLoaded] = useState(
    () => !songSlug || Boolean(restoredDraft) || Boolean(initialSong),
  );
  // `undefined` while an existing song's owner is still unknown (fetch in flight); a brand-new
  // song has no owner yet, so it's implicitly "mine" until it's first saved.
  const [ownerId, setOwnerId] = useState<string | undefined>(
    () => initialSong?.ownerId,
  );
  useEffect(() => {
    if (restoredDraft) {
      actions.loadContent(restoredDraft.content);
      clearDraft();
    }
    // Runs once per mount: restoring is a one-time hydration, and `restoredDraft` itself never
    // changes after that initial read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    applyTheme(deriveTheme(accentColor));
  }, [accentColor]);

  // Administrators may attach a YouTube link before a new song has been saved, so their role is
  // resolved separately from the auth session.
  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) {
      setIsAdmin(false);
      return;
    }
    let cancelled = false;
    queryClient
      .fetchQuery({
        queryKey: profileQueryKeys.role(userId),
        queryFn: () => isCurrentUserAdmin(),
        staleTime: 60_000,
      })
      .then((admin) => {
        if (!cancelled) setIsAdmin(admin);
      })
      .catch((error: unknown) => {
        console.error("No se pudo verificar el rol del usuario.", error);
      });
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, queryClient]);

  useEffect(() => {
    if (!songSlug) {
      setForkedFrom(null);
      return;
    }
    // Still needed even when a draft was restored: the draft carries the freshest content, but
    // not the song's real id, which autosave needs to update (rather than duplicate) the row.
    let cancelled = false;
    // A title edit regenerates this same song's slug (see
    // supabase/migrations/0006_regenerate_slug_on_title_change.sql), which swaps the URL and
    // reruns this effect with the new `songSlug` even though it's still the very song already
    // open here. Compare against the resolved detail's id (not just "is a song already open")
    // so switching to a genuinely different song, e.g. via the back button, still loads it.
    const isSameSongAlreadyOpen = (detailId: string) =>
      detailId === songDbIdRef.current;

    // A cache hit (from an earlier visit this session, or from the persisted cache surviving a
    // reload) paints synchronously instead of showing the skeleton for a network round trip.
    // `fetchQuery` — rather than the reactive `useQuery` — is deliberate: it resolves once and is
    // never subscribed to again, so a later background revalidation of this same query (e.g. from
    // Library re-fetching after a save) can't fire `actions.loadContent` a second time and clobber
    // whatever the user has typed since this song loaded.
    const cachedDetail = queryClient.getQueryData<
      Awaited<ReturnType<typeof getSongBySlug>>
    >(songQueryKeys.bySlug(songSlug));
    if (cachedDetail) {
      setSongDbId(cachedDetail.id);
      setOwnerId(cachedDetail.ownerId);
      setSongIsPublic(cachedDetail.isPublic);
      setSongYoutubeUrlState(cachedDetail.youtubeUrl);
      setForkedFrom(cachedDetail.forkedFrom);
      if (!restoredDraft && !isSameSongAlreadyOpen(cachedDetail.id))
        actions.loadContent(cachedDetail.content);
      setContentLoaded(true);
    }

    queryClient
      .fetchQuery({
        queryKey: songQueryKeys.bySlug(songSlug),
        queryFn: () => getSongBySlug(songSlug),
        staleTime: 60_000,
      })
      .then((detail) => {
        if (cancelled) return;
        setSongDbId(detail.id);
        setOwnerId(detail.ownerId);
        setSongIsPublic(detail.isPublic);
        setSongYoutubeUrlState(detail.youtubeUrl);
        setForkedFrom(detail.forkedFrom);
        // Only the first resolution (cache or network, whichever wins) may load content into the
        // editor — see the comment above.
        if (
          !restoredDraft &&
          !cachedDetail &&
          !isSameSongAlreadyOpen(detail.id)
        ) {
          actions.loadContent(detail.content);
        }
        setContentLoaded(true);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          // Logged for developers only: shown to the user as a generic "not found" (see
          // SongNotFound above), since RLS means "doesn't exist" and "private, not yours" are
          // indistinguishable here and neither should be exposed as raw error text.
          console.error(`No se pudo cargar la canción "${songSlug}".`, error);
          setLoadError({ songSlug });
          setContentLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // `actions` and `queryClient` are stable refs, and `restoredDraft` never changes after mount;
    // only `songSlug` should retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songSlug, actions, queryClient]);

  useEffect(() => {
    if (!forkedFrom) {
      setForkSourceSlug(null);
      return;
    }

    let cancelled = false;
    // Do not leave the prior source link visible while a newly opened fork resolves its source.
    setForkSourceSlug(null);
    queryClient
      .fetchQuery({
        queryKey: songQueryKeys.detail(forkedFrom),
        queryFn: () => getSong(forkedFrom),
        staleTime: 60_000,
      })
      .then((source) => {
        if (!cancelled) setForkSourceSlug(source.slug);
      })
      .catch((error: unknown) => {
        // The source might have become private after this fork was made. In that case RLS makes
        // it unavailable to this viewer, so omit a link that would only lead to a not-found page.
        console.error(
          "No se pudo cargar la canción de origen del fork.",
          error,
        );
        if (!cancelled) setForkSourceSlug(null);
      });

    return () => {
      cancelled = true;
    };
  }, [forkedFrom, queryClient]);

  const content: SongContent = useMemo(
    () => ({
      title: state.title,
      author: state.author,
      lyricsText: state.lyricsText,
      song: state.song,
      cells: state.cells,
      chordVariants: state.chordVariants,
      merges: state.merges,
    }),
    [
      state.title,
      state.author,
      state.lyricsText,
      state.song,
      state.cells,
      state.chordVariants,
      state.merges,
    ],
  );
  // Ready to autosave once the editor actually holds this song's content, and (for an existing
  // song) once its real id has been resolved from the slug — otherwise a save could either
  // persist the default/empty state or insert a duplicate row instead of updating one.
  const ready = contentLoaded && (!songSlug || songDbId !== undefined);
  // `useAutosave` uses this callback after every successful save, including a later save whose
  // title edit regenerated the slug. Keeping it stable is essential: the hook's debounce effect
  // must only restart for a content/save-input change, not for its own status updates causing
  // this component to render again.
  const handleSongCreated = useCallback(
    (id: string, slug: string) => {
      setSongDbId(id);
      onSongCreated?.(id, slug);
    },
    [onSongCreated],
  );
  // A brand-new song (no songId) or one restored from a pre-auth draft was necessarily started by
  // this browser, so it's implicitly the user's own; an existing song is only "mine" once its
  // fetched owner matches the signed-in user (forking a song creates a new row owned by the
  // forker, so a viewed fork satisfies this the same way any other owned song does).
  const isOwnSong =
    !songSlug ||
    Boolean(restoredDraft) ||
    (ownerId !== undefined && ownerId === session?.user.id);
  // Mobile is read-only by product rule: no title/author/content editing and no forking, even for
  // the song's owner. Favoriting, chord/underline toggles, PDF export and transposition stay
  // available on mobile and must not be gated here.
  const canEditOnThisDevice = isOwnSong && !isMobile;
  const { status: autosaveStatus, retry: retrySave } = useAutosave(
    content,
    songDbId,
    ready,
    authenticated,
    // Never even attempt to persist a viewer's edits to a song they don't own — the DB's RLS
    // policy would reject the write anyway, and without this the debounce would surface a
    // perpetual "No se pudo guardar" error on every keystroke instead of silently doing nothing.
    // Mobile is read-only, so autosave must stay off there too, even for the song's owner. Kept as
    // its own argument (not folded into `authenticated`) so ownership resolving late doesn't look
    // like a sign-in edge and fire an immediate, contentless save — see useAutosave's docstring.
    isOwnSong && !isMobile,
    // A song with no slug from the route was never fetched — it was started fresh in this
    // browser — so its first save must be the explicit Save click, not the debounce.
    !songSlug,
    handleSongCreated,
  );
  const pendingChanges =
    autosaveStatus === "dirty" || autosaveStatus === "error";
  const saving = autosaveStatus === "saving";

  useEffect(() => {
    if (autosaveStatus === "saved")
      trackEvent("song_saved", { song_id: songDbId });
  }, [autosaveStatus, songDbId]);

  // The save intent survives the magic-link reload. Mark it complete only after autosave has
  // actually persisted the restored draft, so a failed save remains available for recovery.
  useEffect(() => {
    if (!authenticated || autosaveStatus !== "saved") return;
    const pendingAction = readPendingAuthAction();
    if (
      pendingAction?.type === "save-song" &&
      pendingAction.songSlug === (songSlug ?? null)
    ) {
      clearPendingAuthAction();
      showToast({
        variant: "success",
        title: "Sesión iniciada",
        description: "Guardamos los cambios pendientes.",
      });
    }
  }, [authenticated, autosaveStatus, songSlug, showToast]);

  // If this mount is the landing page of a hard-navigation fork redirect (see performFork below),
  // confirm it here — the toast queue that triggered the fork didn't survive that navigation, so
  // the confirmation has to come from the page the user actually lands on instead.
  useEffect(() => {
    if (!songSlug) return;
    if (consumeJustForked(songSlug)) {
      showToast({
        variant: "success",
        title: "Canción versionada",
        description:
          "Creamos una copia lista para editar, sin afectar la original.",
      });
    }
  }, [songSlug, showToast]);

  const performFork = async (songId: string) => {
    setForking(true);
    try {
      const forked = await forkSong(songId);
      queryClient.invalidateQueries({ queryKey: songQueryKeys.mineAll });
      saveJustForked(forked.slug);
      // A hard navigation (rather than the SPA router) so the fork's editor/autosave state starts
      // completely fresh, instead of reusing this mounted App instance's in-progress state.
      window.location.assign(`/cancion/${forked.slug}`);
    } catch (error) {
      console.error("No se pudo versionar la canción.", error);
      setForking(false);
    }
  };

  // The fork intent survives the magic-link reload the same way "save-song" does (see below):
  // once signed in, resume forking the song that was being viewed when auth was requested.
  useEffect(() => {
    if (!authenticated || !songDbId) return;
    const pendingAction = readPendingAuthAction();
    if (
      pendingAction?.type === "fork-song" &&
      pendingAction.songId === songDbId
    ) {
      clearPendingAuthAction();
      void performFork(songDbId);
    }
    // `performFork` is recreated every render but only reads stable refs/props; only
    // `authenticated`/`songDbId` should retrigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated, songDbId]);

  const handleTogglePublicClick = async () => {
    if (!songDbId) return;
    setTogglingPublic(true);
    try {
      const updated = await setSongPublic(songDbId, !songIsPublic);
      setSongIsPublic(updated.isPublic);
      queryClient.invalidateQueries({ queryKey: songQueryKeys.public() });
      await revalidatePublicSongs();
      // Going private can drop this song out of other users' favorites (RLS hides it from the
      // join in listFavorites), so refresh whichever favorites lists are cached too.
      queryClient.invalidateQueries({ queryKey: songQueryKeys.favoritesAll });
      showToast({
        variant: "success",
        title: updated.isPublic
          ? "Canción publicada"
          : "Canción marcada como privada",
        description: updated.isPublic
          ? "Ya podés compartir el enlace."
          : "Ya no aparece en el cancionero público.",
      });
    } catch (error) {
      console.error("No se pudo cambiar la visibilidad de la canción.", error);
      showToast({
        variant: "error",
        title: "No se pudo cambiar la visibilidad",
        description: "Intentá de nuevo en unos segundos.",
      });
    } finally {
      setTogglingPublic(false);
    }
  };

  const handleSaveYoutubeUrl = async (url: string | null) => {
    // No row to write to yet (a brand-new, still-unsaved song): hold the value locally and let
    // the effect below persist it once autosave creates the row.
    if (!songDbId) {
      setSongYoutubeUrlState(url);
      setPendingYoutubeUrl(url);
      return;
    }
    const updated = await setSongYoutubeUrl(songDbId, url);
    setSongYoutubeUrlState(updated.youtubeUrl);
    showToast({
      variant: "success",
      title: updated.youtubeUrl ? "Link agregado" : "Link quitado",
      description: updated.youtubeUrl
        ? "El video se muestra debajo de la letra."
        : "Ya no se muestra ningún video debajo de la letra.",
    });
  };

  // Flushes a YouTube link entered before this song had a database id (see handleSaveYoutubeUrl)
  // as soon as autosave creates that row.
  useEffect(() => {
    if (!songDbId || pendingYoutubeUrl === undefined) return;
    const url = pendingYoutubeUrl;
    setPendingYoutubeUrl(undefined);
    setSongYoutubeUrl(songDbId, url)
      .then((updated) => setSongYoutubeUrlState(updated.youtubeUrl))
      .catch((error: unknown) => {
        console.error("No se pudo guardar el link de YouTube.", error);
        showToast({
          variant: "error",
          title: "No se pudo guardar el link de YouTube",
          description: "Volvé a intentarlo desde el botón de YouTube.",
        });
      });
  }, [songDbId, pendingYoutubeUrl, showToast]);

  const handleForkClick = () => {
    if (!songDbId) return;
    if (!authenticated) {
      requireAuthentication({ type: "fork-song", songId: songDbId });
      return;
    }
    void performFork(songDbId);
  };

  const handleExportPdf = () => {
    trackEvent("export_pdf", { song_id: songDbId });
    const previousDocumentTitle = document.title;
    document.title = pdfDocumentTitle(state.title, state.author);
    try {
      window.print();
    } finally {
      document.title = previousDocumentTitle;
    }
  };

  const handleConfirmDelete = async () => {
    if (!songDbId) return;
    await deleteSong(songDbId);
    queryClient.invalidateQueries({ queryKey: songQueryKeys.mineAll });
    if (songSlug)
      queryClient.removeQueries({ queryKey: songQueryKeys.bySlug(songSlug) });
    setDeleteDialogOpen(false);
    showToast({
      variant: "success",
      title: "Canción eliminada",
      description: "Borramos la canción de tu cancionero.",
    });
    onDeleted?.();
  };

  const handleSaveClick = () => {
    if (!authenticated) {
      // The modal's overlay blocks further editing while it's open, so `content` here is what
      // the user will still be looking at when they follow the magic-link email — stash it so
      // it can be restored after the reload that link triggers.
      saveDraft(songSlug, content);
      requireAuthentication({ type: "save-song", songSlug: songSlug ?? null });
      return;
    }
    // Always forces an immediate save rather than waiting on the debounce — this is also the
    // only way a brand-new song's required-manual first save ever reaches the network.
    retrySave();
  };

  const handleTrackToggle = (track: TrackDef) => {
    const nextVisible = !track.visible;
    actions.setTrackVisibility(track.id, nextVisible);
    if (track.id === "chordNotes" && nextVisible) {
      showTutorial({
        tutorialId: "chord-notes-shared",
        title: "Notas compartidas",
        description:
          "Las notas en negrita significan que también están en el acorde anterior.",
        icon: <NoteStackIcon boldNotes={["sol"]} />,
      });
    }
  };

  const showMelodyJoinTutorial = () => {
    showTutorial({
      tutorialId: "melody-notes-join-syllables",
      title: "Una nota para dos sílabas",
      description: (
        <>
          Podés hacer click entre dos sílabas para unirlas y asignarles una sola
          nota.
          <MelodyTutorialExample joined />
        </>
      ),
    });
  };

  const handleUnderlineToggle = () => {
    const next = !state.showUnderline;
    actions.setShowUnderline(next);
    const vocalNotes = state.tracks.find((track) => track.id === "vocalNotes");
    if (vocalNotes && vocalNotes.visible !== next) {
      actions.setTrackVisibility("vocalNotes", next);
    }
    if (next) {
      showTutorial({
        tutorialId: "melody-notes-write",
        title: "Notas de la melodía",
        description: (
          <>
            Podés hacer click debajo de una sílaba para escribir las notas de
            la melodía.
            <MelodyTutorialExample animateNotes />
          </>
        ),
      });
      showMelodyJoinTutorial();
    }
  };

  const notFound = loadError !== null && loadError.songSlug === songSlug;

  const saveTooltip = saving
    ? "Guardando…"
    : !pendingChanges
      ? "No hay cambios que guardar"
      : !authenticated
        ? "Iniciá sesión para guardar"
        : autosaveStatus === "error"
          ? "No se pudo guardar. Tocá para reintentar."
          : "Guardar canción";

  return (
    <main className="app">
      <a className="app-mark" href="/" aria-label="Volver al índice">
        <SilbadorIcon />
      </a>

      <IconButtonTooltip
        className="app-close-tooltip"
        tooltip="Volver al índice"
      >
        <a className="app-close" href="/" aria-label="Volver al índice">
          <XIcon size={26} />
        </a>
      </IconButtonTooltip>

      {notFound ? (
        <SongNotFound />
      ) : (
        <>
          <div className="title-block">
            <div className="title-row">
              {forkSourceSlug && (
                <IconButtonTooltip
                  className="fork-source-tooltip"
                  tooltip="Ver la canción de la que se derivó esta versión"
                >
                  <a
                    className="fork-source-link"
                    href={`/cancion/${forkSourceSlug}`}
                    aria-label="Ver la canción de origen"
                  >
                    <ForkIcon />
                  </a>
                </IconButtonTooltip>
              )}
              <input
                type="text"
                className="title-input"
                placeholder="Título"
                value={state.title}
                onChange={(event) => actions.setTitle(event.target.value)}
                readOnly={!canEditOnThisDevice}
                aria-label="Título"
              />
            </div>
            {(state.title.trim() !== "" || state.author.trim() !== "") && (
              <input
                type="text"
                className="author-input"
                placeholder="Autor o intérprete"
                value={state.author}
                onChange={(event) => actions.setAuthor(event.target.value)}
                readOnly={!canEditOnThisDevice}
                aria-label="Autor o intérprete"
              />
            )}
            <TransposeWidget
              chordCells={state.cells.chords}
              noteCells={state.cells.vocalNotes}
              onTransposeCell={(slotId, text) =>
                actions.setCellText("chords", slotId, text)
              }
              onTransposeNoteCell={(slotId, text) =>
                actions.setCellText("vocalNotes", slotId, text)
              }
            />
          </div>

          {(autosaveStatus === "saving" ||
            autosaveStatus === "saved" ||
            autosaveStatus === "error") && (
            <p className={`autosave-status autosave-status--${autosaveStatus}`}>
              {AUTOSAVE_STATUS_LABEL[autosaveStatus]}
            </p>
          )}
          <p className="print-site-url">elsilbador.com.ar</p>

          <div className="workspace">
            {isMobile && (
              <aside className="mobile-sidebar-menu" aria-label="Herramientas">
                <IconButtonTooltip tooltip="Herramientas">
                  <button
                    type="button"
                    className="mobile-sidebar-menu__trigger"
                    aria-expanded={mobileSidebarOpen}
                    aria-controls="mobile-sidebar-menu-controls"
                    aria-label={
                      mobileSidebarOpen
                        ? "Cerrar herramientas"
                        : "Abrir herramientas"
                    }
                    onClick={() => setMobileSidebarOpen((open) => !open)}
                  >
                    <MenuIcon />
                  </button>
                </IconButtonTooltip>
                {mobileSidebarOpen && (
                  <div
                    id="mobile-sidebar-menu-controls"
                    className="mobile-sidebar-menu__controls"
                  >
                    {state.tracks
                      .filter((track) => track.id !== "vocalNotes")
                      .map((track) => (
                        <TrackToggleButton
                          key={track.id}
                          track={track}
                          cells={state.cells}
                          onToggle={() => handleTrackToggle(track)}
                        />
                      ))}
                    <IconButtonTooltip
                      tooltip={
                        state.lyricsText.trim() === ""
                          ? "No hay letra que subrayar"
                          : "Subrayado y notas de la melodía"
                      }
                    >
                      <button
                        type="button"
                        className="track-toolbar__toggle"
                        aria-pressed={state.showUnderline}
                        aria-label="Subrayado y notas de la melodía"
                        disabled={state.lyricsText.trim() === ""}
                        onClick={handleUnderlineToggle}
                      >
                        <UnderlineIcon />
                      </button>
                    </IconButtonTooltip>
                    <IconButtonTooltip
                      tooltip={
                        state.lyricsText.trim() === ""
                          ? "No hay letra que exportar"
                          : "Exportar a PDF"
                      }
                    >
                      <button
                        type="button"
                        className="action-toolbar__button"
                        aria-label="Exportar a PDF"
                        disabled={state.lyricsText.trim() === ""}
                        onClick={() => {
                          setMobileSidebarOpen(false);
                          handleExportPdf();
                        }}
                      >
                        <DownloadIcon />
                      </button>
                    </IconButtonTooltip>
                  </div>
                )}
              </aside>
            )}

            <aside className="track-toolbar" aria-label="Visibilidad de pistas">
              {state.tracks
                .filter((track) => track.id !== "vocalNotes")
                .map((track) => (
                  <TrackToggleButton
                    key={track.id}
                    track={track}
                    cells={state.cells}
                    onToggle={() => handleTrackToggle(track)}
                  />
                ))}
              <IconButtonTooltip
                tooltip={
                  state.lyricsText.trim() === ""
                    ? "No hay letra que subrayar"
                    : "Subrayado y notas de la melodía"
                }
              >
                <button
                  type="button"
                  className="track-toolbar__toggle"
                  aria-pressed={state.showUnderline}
                  aria-label="Subrayado y notas de la melodía"
                  disabled={state.lyricsText.trim() === ""}
                  onClick={handleUnderlineToggle}
                >
                  <UnderlineIcon />
                </button>
              </IconButtonTooltip>
              {(isAdmin || (songDbId && isOwnSong)) && !isMobile && (
                <IconButtonTooltip
                  tooltip={
                    songYoutubeUrl
                      ? "Editar link de YouTube"
                      : "Agregar link de YouTube"
                  }
                >
                  <button
                    type="button"
                    className="track-toolbar__toggle"
                    aria-pressed={songYoutubeUrl !== null}
                    aria-label={
                      songYoutubeUrl
                        ? "Editar link de YouTube"
                        : "Agregar link de YouTube"
                    }
                    onClick={() => setYoutubeDialogOpen(true)}
                  >
                    <YoutubeIcon />
                  </button>
                </IconButtonTooltip>
              )}
            </aside>

            {!contentLoaded ? (
              <SongViewSkeleton />
            ) : (
              <SongView
                song={state.song}
                lyricsText={state.lyricsText}
                merges={state.merges}
                tracks={state.tracks}
                cells={state.cells}
                chordVariants={state.chordVariants}
                showUnderline={state.showUnderline}
                youtubeUrl={songYoutubeUrl}
                canEdit={canEditOnThisDevice}
                onSetCellText={actions.setCellText}
                onSetChordVariant={actions.setChordVariant}
                onToggleMerge={actions.toggleSyllableMerge}
                onMoveCellText={actions.moveCellText}
                onReconcileLyricsText={actions.reconcileLyricsText}
                onPasteText={actions.pasteText}
              />
            )}

            <aside className="action-toolbar" aria-label="Acciones">
              {songDbId && (isAdmin || isOwnSong) && !isMobile && (
                <IconButtonTooltip
                  tooltip={
                    togglingPublic
                      ? "Actualizando…"
                      : songIsPublic
                        ? "Pública — tocá para hacerla privada"
                        : "Privada — tocá para hacerla pública"
                  }
                >
                  <button
                    type="button"
                    className={
                      songIsPublic
                        ? "action-toolbar__button action-toolbar__button--inactive"
                        : "action-toolbar__button"
                    }
                    aria-label={
                      songIsPublic ? "Hacer privada" : "Hacer pública"
                    }
                    aria-pressed={!songIsPublic}
                    disabled={togglingPublic}
                    onClick={handleTogglePublicClick}
                  >
                    {togglingPublic ? (
                      <SpinnerIcon />
                    ) : songIsPublic ? (
                      <PrivacyUnlockedIcon />
                    ) : (
                      <PrivacyLockedIcon />
                    )}
                  </button>
                </IconButtonTooltip>
              )}
              {songDbId && !isOwnSong && !isMobile && (
                <IconButtonTooltip
                  className="action-toolbar__fork-tooltip"
                  tooltip={forking ? "Versionando…" : "Versionar canción"}
                >
                  <button
                    type="button"
                    className="action-toolbar__button action-toolbar__button--fork"
                    aria-label="Versionar canción"
                    disabled={forking}
                    onClick={handleForkClick}
                  >
                    {forking ? <SpinnerIcon /> : <ForkIcon />}
                  </button>
                </IconButtonTooltip>
              )}
              {isOwnSong && !isMobile && (
                <IconButtonTooltip tooltip={saveTooltip}>
                  <button
                    type="button"
                    className={
                      autosaveStatus === "error"
                        ? "action-toolbar__button action-toolbar__button--error"
                        : "action-toolbar__button"
                    }
                    aria-label="Guardar canción"
                    disabled={saving || !pendingChanges}
                    onClick={handleSaveClick}
                  >
                    {saving ? <SpinnerIcon /> : <SaveIcon />}
                  </button>
                </IconButtonTooltip>
              )}
              {!isMobile && (
                <IconButtonTooltip
                  tooltip={
                    state.lyricsText.trim() === ""
                      ? "No hay letra que exportar"
                      : "Exportar a PDF"
                  }
                >
                  <button
                    type="button"
                    className="action-toolbar__button"
                    aria-label="Exportar a PDF"
                    disabled={state.lyricsText.trim() === ""}
                    onClick={handleExportPdf}
                  >
                    <DownloadIcon />
                  </button>
                </IconButtonTooltip>
              )}
              {isOwnSong && !isMobile && (
                <IconButtonTooltip
                  tooltip={
                    songDbId
                      ? "Eliminar canción"
                      : "No hay canción guardada para eliminar"
                  }
                >
                  <button
                    type="button"
                    className="action-toolbar__button"
                    aria-label="Eliminar canción"
                    disabled={!songDbId}
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <TrashIcon size={24} strokeWidth={2} />
                  </button>
                </IconButtonTooltip>
              )}
            </aside>
          </div>

          <ConfirmDialog
            open={deleteDialogOpen}
            title="Eliminar canción"
            description="Esta acción no se puede deshacer. ¿Querés eliminar esta canción?"
            confirmLabel="Eliminar"
            onConfirm={handleConfirmDelete}
            onCancel={() => setDeleteDialogOpen(false)}
          />

          {(isAdmin || (songDbId && isOwnSong)) && !isMobile && (
            <YoutubeLinkDialog
              open={youtubeDialogOpen}
              currentUrl={songYoutubeUrl}
              onOpenChange={setYoutubeDialogOpen}
              onSave={handleSaveYoutubeUrl}
            />
          )}
        </>
      )}
    </main>
  );
}

export default App;
