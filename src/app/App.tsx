import { useEffect } from "react";
import "./App.css";
import { SongView } from "./components/SongView";
import { TrackIcon, UnderlineIcon } from "./components/icons";
import { applyTheme, deriveTheme } from "./theme";
import { useEditor } from "./useEditor";

const DEFAULT_ACCENT_COLOR = "#9c4a3c";

interface AppProps {
  /** Base color the underline, chord, and highlight colors are all derived from. */
  accentColor?: string;
}

function App({ accentColor = DEFAULT_ACCENT_COLOR }: AppProps) {
  const { state, actions } = useEditor();

  useEffect(() => {
    applyTheme(deriveTheme(accentColor));
  }, [accentColor]);

  return (
    <main className="app">
      <h1>Silabeo</h1>

      <div className="workspace">
        <aside className="track-toolbar" aria-label="Visibilidad de pistas">
          <button
            type="button"
            className="track-toolbar__toggle"
            aria-pressed={state.showUnderline}
            aria-label="Subrayado"
            title="Subrayado"
            onClick={() => actions.setShowUnderline(!state.showUnderline)}
          >
            <UnderlineIcon />
          </button>
          {state.tracks.map((track) => {
            const hasContent = Object.values(state.cells[track.id] ?? {}).some(
              (text) => text.trim() !== "",
            );
            const disabled = !hasContent;
            return (
              <button
                key={track.id}
                type="button"
                className="track-toolbar__toggle"
                aria-pressed={track.visible}
                aria-label={track.label}
                title={disabled ? "No hay acordes que mostrar" : track.label}
                disabled={disabled}
                onClick={() => actions.setTrackVisibility(track.id, !track.visible)}
              >
                <TrackIcon trackId={track.id} />
              </button>
            );
          })}
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
      </div>
    </main>
  );
}

export default App;
