import { useEffect } from "react";
import "./App.css";
import { chordToNoteNames } from "../core/chordNotes";
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

      <div className="workspace">
        <aside className="track-toolbar" aria-label="Visibilidad de pistas">
          {state.tracks.map((track) => {
            const hasContent =
              track.id === "chordNotes"
                ? Object.values(state.cells.chords ?? {}).some((text) => chordToNoteNames(text) !== null)
                : Object.values(state.cells[track.id] ?? {}).some((text) => text.trim() !== "");
            const disabled = !hasContent;
            const disabledTitle =
              track.id === "chordNotes" ? "No hay notas que mostrar" : "No hay acordes que mostrar";
            const enabledTitle =
              track.id === "chordNotes"
                ? "Notas del acorde: muestra, debajo de cada acorde, las notas que lo forman (por ejemplo, do-mi-sol para un Do mayor). Útil para entender o tocar el acorde sin memorizar su nombre."
                : "Acordes: muestra u oculta la fila de acordes ubicada arriba de la letra. Los acordes se agregan pegando texto que ya los incluya o escribiéndolos manualmente sobre cada sílaba.";
            return (
              <button
                key={track.id}
                type="button"
                className="track-toolbar__toggle"
                aria-pressed={track.visible}
                aria-label={track.label}
                title={disabled ? disabledTitle : enabledTitle}
                disabled={disabled}
                onClick={() => actions.setTrackVisibility(track.id, !track.visible)}
              >
                <TrackIcon trackId={track.id} />
              </button>
            );
          })}
          <button
            type="button"
            className="track-toolbar__toggle"
            aria-pressed={state.showUnderline}
            aria-label="Subrayado"
            title={
              state.lyricsText.trim() === ""
                ? "No hay letra que subrayar"
                : "Subrayado: muestra u oculta la línea debajo de cada sílaba, que ayuda a visualizar dónde termina una sílaba y empieza la siguiente."
            }
            disabled={state.lyricsText.trim() === ""}
            onClick={() => actions.setShowUnderline(!state.showUnderline)}
          >
            <UnderlineIcon />
          </button>
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
