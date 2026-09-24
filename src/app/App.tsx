import "./App.css";
import { LyricsInput } from "./components/LyricsInput";
import { SongView } from "./components/SongView";
import { useEditor } from "./useEditor";

function App() {
  const { state, actions } = useEditor();

  return (
    <main className="app">
      <h1>Silabeo</h1>
      <p className="subtitle">Editor de anotaciones sobre sílabas de canciones</p>

      <LyricsInput onConfirm={actions.setLyricsText} />

      <div className="track-toolbar" aria-label="Visibilidad de pistas">
        {state.tracks.map((track) => (
          <button
            key={track.id}
            type="button"
            aria-pressed={track.visible}
            onClick={() => actions.setTrackVisibility(track.id, !track.visible)}
          >
            {track.label}
          </button>
        ))}
      </div>

      <SongView
        song={state.song}
        merges={state.merges}
        tracks={state.tracks}
        cells={state.cells}
        onSetCellText={actions.setCellText}
        onToggleMerge={actions.toggleSyllableMerge}
      />
    </main>
  );
}

export default App;
