import "./App.css";
import { SongView } from "./components/SongView";
import { TrackGlyph } from "./components/icons";
import { useEditor } from "./useEditor";

function App() {
  const { state, actions } = useEditor();

  return (
    <main className="app">
      <h1>Silabeo</h1>

      <div className="document-actions">
        <button type="button" onClick={actions.loadYpacaraiExample}>
          Cargar "Recuerdos de Ypacaraí"
        </button>
      </div>

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
        />
      </div>
    </main>
  );
}

export default App;
