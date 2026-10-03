"use client";

import { useState, useSyncExternalStore } from "react";
import { parseChordSheet } from "../../core/chordSheet";
import { findChordShape } from "../../core/findChordShape";
import { createInitialState, editorReducer } from "../../core/state";
import type { SongContent } from "../../data/types";
import { TrackToggleButton } from "../../editor/App";
import "../../editor/App.css";
import { ChordDiagram } from "../../editor/components/ChordDiagram";
import {
  ChordDragTutorialExample,
  type ChordDragExampleDrag,
  type ChordDragExampleUnit,
} from "../../editor/components/ChordDragTutorialExample";
import "../../editor/components/Toast.css";
import { SongView } from "../../editor/components/SongView";
import { useEditor } from "../../editor/useEditor";
import { useIsMobile } from "../../editor/useIsMobile";
import { TransposeWidget } from "../../transpose/TransposeWidget";

/** The start of "Tonada de un viejo amor", as a chord sheet: each chord above its syllable. */
export const TONADA_EXCERPT = `    A           A7     D
Ya nunca te he de olvidar
       E7           A
en la arena me escribias
             A7    D
El viento lo fue borrando
    B7      E7              A
y estoy mas solo mirando el mar.`;

/** The song state the editor itself ends up with when this chord sheet is pasted into it. */
function contentFromChordSheet(sheet: string): SongContent {
  const { lyricsText, placements } = parseChordSheet(sheet);
  const pasted = editorReducer(createInitialState(), {
    type: "pasteText",
    text: lyricsText,
    startLineIndex: 0,
    startOffset: 0,
    placements,
  });
  return {
    title: "Tonada de un viejo amor",
    author: "",
    lyricsText: pasted.lyricsText,
    song: pasted.song,
    cells: pasted.cells,
    chordVariants: pasted.chordVariants,
    pitchDirections: pasted.pitchDirections,
    merges: pasted.merges,
  };
}

interface ArticleChordEditorProps {
  /** Lyrics with chords written above them, as they'd be pasted into the editor. */
  sheet: string;
  label: string;
  /** Sidebar controls to show next to the song, in the editor's own order. */
  tools?: ("trackToggles" | "transpose")[];
  /** The demo is about writing or moving chords, which mobile doesn't allow. */
  needsEditing?: boolean;
}

const subscribeToNothing = () => () => {};

/** A live, throwaway copy of the song editor: the real SongView and its real reducer, with no
 *  saving. Mobile gets the same read-only view the app gives it. */
export function ArticleChordEditor(props: ArticleChordEditorProps) {
  // Syllable ids come from a module-level counter, so a server render would never match the
  // client's. The editor only exists once the page is hydrated; until then its frame holds the place.
  const hydrated = useSyncExternalStore(subscribeToNothing, () => true, () => false);
  if (!hydrated) return <figure className="article-editor" aria-label={props.label} />;
  return <LiveChordEditor {...props} />;
}

function LiveChordEditor({ sheet, label, tools = [], needsEditing = false }: ArticleChordEditorProps) {
  const isMobile = useIsMobile();
  const [initialContent] = useState(() => contentFromChordSheet(sheet));
  const { state, actions } = useEditor(initialContent, isMobile);

  return (
    <figure className="article-editor" aria-label={label}>
      {tools.length > 0 ? (
        <div className="article-editor__tools">
          {tools.includes("trackToggles")
            ? state.tracks
                .filter((track) => track.id !== "vocalNotes")
                .map((track) => (
                  <TrackToggleButton
                    key={track.id}
                    track={track}
                    cells={state.cells}
                    onToggle={() => actions.setTrackVisibility(track.id, !track.visible)}
                  />
                ))
            : null}
          {tools.includes("transpose") ? (
            <TransposeWidget
              chordCells={state.cells.chords}
              noteCells={state.cells.vocalNotes}
              onTransposeCell={(slotId, text) => actions.setCellText("chords", slotId, text)}
              onTransposeNoteCell={(slotId, text) => actions.setCellText("vocalNotes", slotId, text)}
            />
          ) : null}
        </div>
      ) : null}
      <SongView
        song={state.song}
        lyricsText={state.lyricsText}
        merges={state.merges}
        tracks={state.tracks}
        cells={state.cells}
        chordVariants={state.chordVariants}
        pitchDirections={state.pitchDirections}
        showUnderline={state.showUnderline}
        showHelp={false}
        canEdit={!isMobile}
        onSetCellText={actions.setCellText}
        onSetChordVariant={actions.setChordVariant}
        onToggleMerge={actions.toggleSyllableMerge}
        onMoveCellText={actions.moveCellText}
        onDragPitchDirection={actions.dragPitchDirection}
        onReconcileLyricsText={actions.reconcileLyricsText}
        onPasteText={actions.pasteText}
      />
      {needsEditing && isMobile ? (
        <figcaption className="article-editor__note">
          En el celular el editor es de solo lectura: probá esto desde una computadora.
        </figcaption>
      ) : null}
    </figure>
  );
}

const MOVE_UNITS: ChordDragExampleUnit[] = [
  { syllable: "Ya", wordBoundaryAfter: true },
  { syllable: "nun" },
  { syllable: "ca", wordBoundaryAfter: true },
  { syllable: "te", wordBoundaryAfter: true },
  { syllable: "he", wordBoundaryAfter: true },
  { syllable: "de", wordBoundaryAfter: true },
  { syllable: "ol" },
  { syllable: "vi" },
  { syllable: "dar" },
];

/** Three chords that start one syllable off and get dragged to where the song really changes. */
const MOVE_DRAGS: ChordDragExampleDrag[] = [
  { id: "a", chord: "A", from: 0, to: 1, start: 0.05, end: 0.2 },
  { id: "a7", chord: "A7", from: 3, to: 5, start: 0.28, end: 0.46 },
  { id: "d", chord: "D", from: 7, to: 8, start: 0.54, end: 0.68 },
];

/** The same three misplaced chords, so the reader can repeat the animation by hand. */
export const MOVE_EXCERPT = `A        A7         D
Ya nunca te he de olvidar`;

export function MoveChordExample() {
  return (
    <div className="article-gesture">
      <ChordDragTutorialExample
        units={MOVE_UNITS}
        drags={MOVE_DRAGS}
        label="Ejemplo: tres acordes arrastrados a la sílaba correcta"
      />
    </div>
  );
}

const EDGE_UNITS: ChordDragExampleUnit[] = [
  { syllable: "y", wordBoundaryAfter: true },
  { syllable: "es" },
  { syllable: "toy", wordBoundaryAfter: true, wide: true },
  { syllable: "mas", wordBoundaryAfter: true },
  { syllable: "so" },
  { syllable: "lo", wordBoundaryAfter: true },
  { syllable: "mi" },
  { syllable: "ran" },
  { syllable: "do", wordBoundaryAfter: true },
  { syllable: "el", wordBoundaryAfter: true },
  { syllable: "mar.", wide: true },
];

/** B7 leaves the phrase to sound before the singing starts, A to sound once it's over. E7 stays. */
const EDGE_DRAGS: ChordDragExampleDrag[] = [
  { id: "e7", chord: "E7", from: 4, to: 4, start: 0, end: 0 },
  { id: "b7", chord: "B7", from: 2, to: "start", start: 0.05, end: 0.24 },
  { id: "a", chord: "A", from: 10, to: "end", start: 0.36, end: 0.52 },
];

export const EDGE_EXCERPT = `    B7      E7              A
y estoy mas solo mirando el mar.`;

export function EdgeChordExample() {
  return (
    <div className="article-gesture">
      <ChordDragTutorialExample
        units={EDGE_UNITS}
        drags={EDGE_DRAGS}
        label="Ejemplo: un acorde llevado antes de la frase y otro después"
      />
    </div>
  );
}

/** The same fingering diagram a click on a chord opens in the editor. */
export function ChordDiagramFigure({ chord }: { chord: string }) {
  const shape = findChordShape(chord);
  if (!shape) return null;
  return (
    <figure className="article-diagram" aria-label={`Diagrama de ${chord}`}>
      <div className="chord-tooltip__name">{chord}</div>
      <ChordDiagram shape={shape} />
    </figure>
  );
}
