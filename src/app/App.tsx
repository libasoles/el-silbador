import { useEffect } from "react";
import "./App.css";
import { SongView } from "./components/SongView";
import { TrackGlyph } from "./components/icons";
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
          {state.tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              className="track-toolbar__toggle"
              aria-pressed={track.visible}
              aria-label={track.label}
              title={track.label}
              onClick={() => actions.setTrackVisibility(track.id, !track.visible)}
            >
              <TrackGlyph trackId={track.id} />
            </button>
          ))}
        </aside>

        <SongView
          song={state.song}
          merges={state.merges}
          tracks={state.tracks}
          cells={state.cells}
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
