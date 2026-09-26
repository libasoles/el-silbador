import { useEffect, useMemo, useState } from "react";
import { Skeleton, Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "./App.css";
import { chordToNoteNames } from "../core/chordNotes";
import type { CellsByTrack, TrackDef } from "../core/types";
import { getSong } from "../data";
import type { SongContent } from "../data/types";
import { TransposeWidget } from "../transpose/TransposeWidget";
import { trackEvent } from "./analytics";
import { AuthModal } from "./components/AuthModal";
import { IconButtonTooltip } from "./components/IconButtonTooltip";
import { SongView } from "./components/SongView";
import {
  DownloadIcon,
  SaveIcon,
  SilbadorIcon,
  SpinnerIcon,
  TrackIcon,
  UnderlineIcon,
  XIcon,
} from "./components/icons";
import { applyTheme, deriveTheme } from "./theme";
import { clearDraft, readDraft, saveDraft } from "./draftStorage";
import { useAuth } from "./useAuth";
import { useAutosave } from "./useAutosave";
import { useEditor } from "./useEditor";

const DEFAULT_ACCENT_COLOR = "#9c4a3c";

const AUTOSAVE_STATUS_LABEL: Record<"saving" | "saved" | "error", string> = {
  saving: "Guardando…",
  saved: "Guardado",
  error: "No se pudo guardar",
};

function noop() {}

/** Stand-in for the title/author fields and the lyrics workspace while an existing song's
    content is still being fetched. Never shown for a brand-new song, which has no content to
    wait on. */
function SongPageSkeleton() {
  return (
    <Theme hasBackground={false}>
      <div className="title-block">
        <Skeleton>
          <span className="title-input">Título de ejemplo</span>
        </Skeleton>
        <Skeleton>
          <span className="author-input">Autor de ejemplo</span>
        </Skeleton>
      </div>
      <div className="workspace">
        <div className="song-view-skeleton">
          {["Primera línea de ejemplo", "Segunda línea, un poco más larga", "Tercera línea"].map(
            (line, index) => (
              <Skeleton key={index}>
                <span className="song-view-skeleton__line">{line}</span>
              </Skeleton>
            ),
          )}
        </div>
      </div>
    </Theme>
  );
}

interface AppProps {
  /** Base color the underline, chord, and highlight colors are all derived from. */
  accentColor?: string;
  /** Id of the song being edited, from the /canciones/:id route. Absent for a new, unsaved song. */
  songId?: string;
  /** Called once autosave creates the row for a new song, so the URL can adopt its id. */
  onSongCreated?: (id: string) => void;
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

function App({ accentColor = DEFAULT_ACCENT_COLOR, songId, onSongCreated }: AppProps) {
  const { state, actions } = useEditor();
  const [loadError, setLoadError] = useState<{ songId: string; message: string } | null>(null);
  const session = useAuth();
  const authenticated = Boolean(session);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Following a magic-link sign-in email reloads the page from scratch, so any content typed
  // before authenticating would otherwise vanish. If it was stashed in localStorage first (see
  // handleSaveClick below), restore it here and let the usual autosave-on-sign-in flow persist it.
  const [restoredDraft] = useState(() => readDraft(songId));
  // Only an existing song (songId set, no restored draft) has content worth waiting on; a new
  // song, or one whose draft was already restored, starts "loaded" with its editor state in place.
  const [contentLoaded, setContentLoaded] = useState(() => !songId || Boolean(restoredDraft));
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
    // A restored draft is already the freshest version of this song (it was captured right
    // before the user went to confirm their sign-in), so it takes priority over re-fetching
    // whatever was last saved on the server.
    if (!songId || restoredDraft) return;
    let cancelled = false;
    getSong(songId)
      .then((detail) => {
        if (!cancelled) {
          actions.loadContent(detail.content);
          setContentLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError({ songId, message: error instanceof Error ? error.message : String(error) });
          setContentLoaded(true);
        }
      });
    return () => {
      cancelled = true;
    };
    // `actions` is a stable ref from useEditor and `restoredDraft` never changes after mount;
    // only `songId` should retrigger the fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, actions]);

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
  const { status: autosaveStatus, retry: retrySave } = useAutosave(
    content,
    songId,
    authenticated,
    onSongCreated ?? noop,
  );
  const pendingChanges = autosaveStatus === "dirty" || autosaveStatus === "error";
  const saving = autosaveStatus === "saving";

  useEffect(() => {
    if (autosaveStatus === "saved") trackEvent("song_saved", { song_id: songId });
  }, [autosaveStatus, songId]);

  const handleExportPdf = () => {
    trackEvent("export_pdf", { song_id: songId });
    window.print();
  };

  const handleSaveClick = () => {
    if (!authenticated) {
      trackEvent("auth_modal_open");
      // The modal's overlay blocks further editing while it's open, so `content` here is what
      // the user will still be looking at when they follow the magic-link email — stash it so
      // it can be restored after the reload that link triggers.
      saveDraft(songId, content);
      setAuthModalOpen(true);
      return;
    }
    if (autosaveStatus === "error") retrySave();
  };

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

      <IconButtonTooltip tooltip="Volver al índice">
        <a className="app-close" href="/" aria-label="Volver al índice">
          <XIcon size={26} />
        </a>
      </IconButtonTooltip>

      <TransposeWidget
        chordCells={state.cells.chords}
        onTransposeCell={(slotId, text) => actions.setCellText("chords", slotId, text)}
      />

      {!contentLoaded ? (
        <SongPageSkeleton />
      ) : (
        <>
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

          {loadError && loadError.songId === songId ? (
            <p className="autosave-status autosave-status--error">
              No se pudo cargar la canción: {loadError.message}
            </p>
          ) : (
            (autosaveStatus === "saving" || autosaveStatus === "saved" || autosaveStatus === "error") && (
              <p className={`autosave-status autosave-status--${autosaveStatus}`}>
                {AUTOSAVE_STATUS_LABEL[autosaveStatus]}
              </p>
            )
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

            <aside className="action-toolbar" aria-label="Acciones">
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
            </aside>
          </div>
        </>
      )}

      {authModalOpen && !authenticated && (
        <AuthModal onClose={() => setAuthModalOpen(false)} />
      )}
    </main>
  );
}

export default App;
