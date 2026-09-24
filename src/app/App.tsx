import "./App.css";
import { LyricsInput } from "./components/LyricsInput";
import { SongView } from "./components/SongView";
import { TrackIcon } from "./components/icons";
import { useEditor } from "./useEditor";

function App() {
  const { state, actions } = useEditor();

  return (
    <main className="app">
      <h1>Silabeo</h1>
      <p className="subtitle">Editor de anotaciones sobre sílabas de canciones</p>

      <LyricsInput onConfirm={actions.setLyricsText} onLoadExample={actions.loadYpacaraiExample} />

      <div className="workspace">
        <aside className="track-toolbar" aria-label="Visibilidad de pistas">
          {state.tracks.map((track) => (
            <button
              key={track.id}
              type="button"
              aria-pressed={track.visible}
              title={track.label}
              onClick={() => actions.setTrackVisibility(track.id, !track.visible)}
            >
              <TrackIcon trackId={track.id} />
              <span className="track-toolbar__label">{track.label}</span>
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
          onResyllabify={actions.resyllabify}
        />
      </div>
    </main>
  );
}

export default App;
