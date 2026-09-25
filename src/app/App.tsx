import { type ReactNode, useEffect } from "react";
import "./App.css";
import { chordToNoteNames } from "../core/chordNotes";
import type { CellsByTrack, TrackDef } from "../core/types";
import { TransposeWidget } from "../transpose/TransposeWidget";
import { SongView } from "./components/SongView";
import { DownloadIcon, TrackIcon, UnderlineIcon } from "./components/icons";
import { applyTheme, deriveTheme } from "./theme";
import { useEditor } from "./useEditor";

const DEFAULT_ACCENT_COLOR = "#9c4a3c";

interface AppProps {
  /** Base color the underline, chord, and highlight colors are all derived from. */
  accentColor?: string;
}

interface TrackToggleButtonProps {
  track: TrackDef;
  cells: CellsByTrack;
  onToggle: () => void;
}

interface IconButtonTooltipProps {
  tooltip: string;
  children: ReactNode;
}

function IconButtonTooltip({ tooltip, children }: IconButtonTooltipProps) {
  return (
    <span className="icon-button-tooltip" data-tooltip={tooltip}>
      {children}
    </span>
  );
}

function TrackToggleButton({ track, cells, onToggle }: TrackToggleButtonProps) {
  const hasContent =
    track.id === "chordNotes"
      ? Object.values(cells.chords ?? {}).some((text) => chordToNoteNames(text) !== null)
      : Object.values(cells[track.id] ?? {}).some((text) => text.trim() !== "");
  const disabled = !hasContent;
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

function App({ accentColor = DEFAULT_ACCENT_COLOR }: AppProps) {
  const { state, actions } = useEditor();

  useEffect(() => {
    applyTheme(deriveTheme(accentColor));
  }, [accentColor]);

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <main className="app">
      <div className="app-header">
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
              placeholder="Autor"
              value={state.author}
              onChange={(event) => actions.setAuthor(event.target.value)}
              aria-label="Autor"
            />
          )}
        </div>
        <TransposeWidget
          chordCells={state.cells.chords}
          onTransposeCell={(slotId, text) => actions.setCellText("chords", slotId, text)}
        />
      </div>

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
    </main>
  );
}

export default App;
