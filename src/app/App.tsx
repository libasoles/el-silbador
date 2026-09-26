import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Skeleton, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./App.css";
import { chordToNoteNames } from "../core/chordNotes";
import type { CellsByTrack, TrackDef } from "../core/types";
import { deleteSong, getSongBySlug } from "../data";
import { songQueryKeys } from "../data/queryKeys";
import type { SongContent } from "../data/types";
import { TransposeWidget } from "../transpose/TransposeWidget";
import { trackEvent } from "./analytics";
import { useAuthRequired } from "./authRequiredContext";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { IconButtonTooltip } from "./components/IconButtonTooltip";
import { SongView } from "./components/SongView";
import {
  DownloadIcon,
  SaveIcon,
  SilbadorIcon,
  SpinnerIcon,
  TrackIcon,
  TrashIcon,
  UnderlineIcon,
  XIcon,
} from "./components/icons";
import { applyTheme, deriveTheme } from "./theme";
import { clearDraft, readDraft, saveDraft } from "./draftStorage";
import { useAutosave } from "./useAutosave";
import { useEditor } from "./useEditor";
import { clearPendingAuthAction, readPendingAuthAction } from "./pendingAuthActionStorage";

const DEFAULT_ACCENT_COLOR = "#9c4a3c";

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
        {["Primera línea de ejemplo", "Segunda línea, un poco más larga", "Tercera línea"].map(
          (line, index) => (
            <Skeleton key={index}>
              <span className="song-view-skeleton__line">{line}</span>
            </Skeleton>
          ),
        )}
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
      <span className="song-not-found__mark" aria-hidden="true">
        <SilbadorIcon />
      </span>
      <p className="empty-state">
        No encontramos esta canción. Puede que no exista, o que sea privada y solo la pueda ver
        quien la creó.
      </p>
      <a className="song-not-found__link" href="/">
        Volver al cancionero
      </a>
    </div>
  );
}

interface AppProps {
  /** Base color the underline, chord, and highlight colors are all derived from. */
  accentColor?: string;
  /** Slug of the song being edited, from the /cancion/:slug route. Absent for a new, unsaved song. */
  songSlug?: string;
  /** Called once autosave creates the row for a new song, so the URL can adopt its slug. */
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
      ? Object.values(cells.chords ?? {}).some((text) => chordToNoteNames(text) !== null)
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

function App({ accentColor = DEFAULT_ACCENT_COLOR, songSlug, onSongCreated, onDeleted }: AppProps) {
  const queryClient = useQueryClient();
  const { state, actions } = useEditor();
  const [loadError, setLoadError] = useState<{ songSlug: string } | null>(null);
  const { session, requireAuthentication } = useAuthRequired();
  const authenticated = Boolean(session);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  // The song's real database id, resolved from `songSlug` once `getSongBySlug` returns (or set
  // directly once autosave creates a brand-new song). Needed because writes (save/delete) still
  // key off the stable id rather than the slug.
  const [songDbId, setSongDbId] = useState<string | undefined>(undefined);

  // Following a magic-link sign-in email reloads the page from scratch, so any content typed
  // before authenticating would otherwise vanish. If it was stashed in localStorage first (see
  // handleSaveClick below), restore it here and let the usual autosave-on-sign-in flow persist it.
  const [restoredDraft] = useState(() => readDraft(songSlug));
  // Only an existing song (songSlug set, no restored draft) has content worth waiting on; a new
  // song, or one whose draft was already restored, starts "loaded" with its editor state in place.
  const [contentLoaded, setContentLoaded] = useState(() => !songSlug || Boolean(restoredDraft));
  // `undefined` while an existing song's owner is still unknown (fetch in flight); a brand-new
  // song has no owner yet, so it's implicitly "mine" until it's first saved.
  const [ownerId, setOwnerId] = useState<string | undefined>(undefined);
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

  useEffect(() => {
    if (!songSlug) return;
    // Still needed even when a draft was restored: the draft carries the freshest content, but
    // not the song's real id, which autosave needs to update (rather than duplicate) the row.
    let cancelled = false;
    getSongBySlug(songSlug)
      .then((detail) => {
        if (cancelled) return;
        setSongDbId(detail.id);
        setOwnerId(detail.ownerId);
        if (!restoredDraft) actions.loadContent(detail.content);
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
    // `actions` is a stable ref from useEditor and `restoredDraft` never changes after mount;
    // only `songSlug` should retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songSlug, actions]);

  const content: SongContent = useMemo(
    () => ({
      title: state.title,
      author: state.author,
      lyricsText: state.lyricsText,
      song: state.song,
      cells: state.cells,
      merges: state.merges,
    }),
    [state.title, state.author, state.lyricsText, state.song, state.cells, state.merges],
  );
  // Ready to autosave once the editor actually holds this song's content, and (for an existing
  // song) once its real id has been resolved from the slug — otherwise a save could either
  // persist the default/empty state or insert a duplicate row instead of updating one.
  const ready = contentLoaded && (!songSlug || songDbId !== undefined);
  const { status: autosaveStatus, retry: retrySave } = useAutosave(
    content,
    songDbId,
    ready,
    authenticated,
    (id, slug) => {
      setSongDbId(id);
      onSongCreated?.(id, slug);
    },
  );
  const pendingChanges = autosaveStatus === "dirty" || autosaveStatus === "error";
  const saving = autosaveStatus === "saving";
  // A brand-new song (no songId) or one restored from a pre-auth draft was necessarily started by
  // this browser, so it's implicitly the user's own; an existing song is only "mine" once its
  // fetched owner matches the signed-in user (forking a song creates a new row owned by the
  // forker, so a viewed fork satisfies this the same way any other owned song does).
  const isOwnSong =
    !songSlug || Boolean(restoredDraft) || (ownerId !== undefined && ownerId === session?.user.id);

  useEffect(() => {
    if (autosaveStatus === "saved") trackEvent("song_saved", { song_id: songDbId });
  }, [autosaveStatus, songDbId]);

  // The save intent survives the magic-link reload. Mark it complete only after autosave has
  // actually persisted the restored draft, so a failed save remains available for recovery.
  useEffect(() => {
    if (!authenticated || autosaveStatus !== "saved") return;
    const pendingAction = readPendingAuthAction();
    if (pendingAction?.type === "save-song" && pendingAction.songSlug === (songSlug ?? null)) {
      clearPendingAuthAction();
    }
  }, [authenticated, autosaveStatus, songSlug]);

  const handleExportPdf = () => {
    trackEvent("export_pdf", { song_id: songDbId });
    window.print();
  };

  const handleConfirmDelete = async () => {
    if (!songDbId) return;
    await deleteSong(songDbId);
    queryClient.invalidateQueries({ queryKey: songQueryKeys.mineAll });
    setDeleteDialogOpen(false);
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
    if (autosaveStatus === "error") retrySave();
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

      <IconButtonTooltip className="app-close-tooltip" tooltip="Volver al índice">
        <a className="app-close" href="/" aria-label="Volver al índice">
          <XIcon size={26} />
        </a>
      </IconButtonTooltip>

      {notFound ? (
        <SongNotFound />
      ) : (
        <>
          <TransposeWidget
            chordCells={state.cells.chords}
            onTransposeCell={(slotId, text) => actions.setCellText("chords", slotId, text)}
          />

          <div className="title-block">
            <input
              type="text"
              className="title-input"
              placeholder="Título"
              value={state.title}
              onChange={(event) => actions.setTitle(event.target.value)}
              aria-label="Título"
            />
            {(state.title.trim() !== "" || state.author.trim() !== "") && (
              <input
                type="text"
                className="author-input"
                placeholder="Autor o intérprete"
                value={state.author}
                onChange={(event) => actions.setAuthor(event.target.value)}
                aria-label="Autor o intérprete"
              />
            )}
          </div>

          {(autosaveStatus === "saving" || autosaveStatus === "saved" || autosaveStatus === "error") && (
            <p className={`autosave-status autosave-status--${autosaveStatus}`}>
              {AUTOSAVE_STATUS_LABEL[autosaveStatus]}
            </p>
          )}

          <div className="workspace">
            <aside className="track-toolbar" aria-label="Visibilidad de pistas">
              {state.tracks
                .filter((track) => track.id !== "vocalNotes")
                .map((track) => (
                  <TrackToggleButton
                    key={track.id}
                    track={track}
                    cells={state.cells}
                    onToggle={() =>
                      actions.setTrackVisibility(track.id, !track.visible)
                    }
                  />
                ))}
              <IconButtonTooltip
                tooltip={
                  state.lyricsText.trim() === ""
                    ? "No hay letra que subrayar"
                    : "Subrayado"
                }
              >
                <button
                  type="button"
                  className="track-toolbar__toggle"
                  aria-pressed={state.showUnderline}
                  aria-label="Subrayado"
                  disabled={state.lyricsText.trim() === ""}
                  onClick={() => actions.setShowUnderline(!state.showUnderline)}
                >
                  <UnderlineIcon />
                </button>
              </IconButtonTooltip>
              {state.tracks
                .filter((track) => track.id === "vocalNotes")
                .map((track) => (
                  <TrackToggleButton
                    key={track.id}
                    track={track}
                    cells={state.cells}
                    onToggle={() =>
                      actions.setTrackVisibility(track.id, !track.visible)
                    }
                  />
                ))}
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
                showUnderline={state.showUnderline}
                onSetCellText={actions.setCellText}
                onToggleMerge={actions.toggleSyllableMerge}
                onMoveCellText={actions.moveCellText}
                onReconcileLyricsText={actions.reconcileLyricsText}
                onPasteText={actions.pasteText}
              />
            )}

            <aside className="action-toolbar" aria-label="Acciones">
              {isOwnSong && (
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
              <IconButtonTooltip
                tooltip={songDbId ? "Eliminar canción" : "No hay canción guardada para eliminar"}
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
        </>
      )}
    </main>
  );
}

export default App;
