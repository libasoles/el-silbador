"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { parseChordSheet } from "../../core/chordSheet";
import { findChordShape } from "../../core/findChordShape";
import { beforeSlotId, flattenSyllables, mergeKey } from "../../core/model";
import { createInitialState, editorReducer } from "../../core/state";
import type { BisGroup, PitchDirection } from "../../core/types";
import type { SongContent } from "../../data/types";
import { TrackToggleButton, UnderlineToggleButton } from "../../editor/App";
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

/** The song state the editor itself ends up with when this chord sheet is pasted into it, plus
 *  the melody written under it (see `ArticleChordEditorProps.melody`). */
function contentFromChordSheet(
  sheet: string,
  melody: string[] = [],
  bisGroups: BisGroup[] = [],
): SongContent {
  const { lyricsText, placements } = parseChordSheet(sheet);
  const pasted = editorReducer(createInitialState(), {
    type: "pasteText",
    text: lyricsText,
    startLineIndex: 0,
    startOffset: 0,
    placements,
  });
  const vocalNotes: Record<string, string> = {};
  const pitchDirections: Record<string, PitchDirection> = {};
  const merges = new Set(pasted.merges);
  pasted.song.forEach((line, lineIndex) => {
    const syllables = flattenSyllables(line);
    let anchorId = "";
    (melody[lineIndex] ?? "").split(/\s+/).filter(Boolean).forEach((token, index) => {
      const syllable = syllables[index];
      if (!syllable) return;
      if (token === "+") {
        merges.add(mergeKey(syllables[index - 1]!.id, syllable.id));
        return;
      }
      anchorId = syllable.id;
      if (token === "_") return;
      const direction = token.endsWith("↑") ? "up" : token.endsWith("↓") ? "down" : null;
      vocalNotes[beforeSlotId(anchorId)] = direction ? token.slice(0, -1) : token;
      if (direction) pitchDirections[beforeSlotId(anchorId)] = direction;
    });
  });
  return {
    title: "",
    author: "",
    lyricsText: pasted.lyricsText,
    song: pasted.song,
    cells: { ...pasted.cells, vocalNotes },
    chordVariants: pasted.chordVariants,
    pitchDirections,
    merges,
    bisGroups,
  };
}

interface ArticleChordEditorProps {
  /** Lyrics with chords written above them, as they'd be pasted into the editor. */
  sheet: string;
  label: string;
  /** One entry per lyric line: the melody note under each syllable, in order, separated by
   *  spaces. A note may end in ↑ or ↓ (higher or lower than the previous one), `_` leaves a
   *  syllable without a note and `+` joins the syllable to the one before it. */
  melody?: string[];
  /** Lines that repeat together, by lyric line index; the last one must end in `BIS`. */
  bisGroups?: BisGroup[];
  /** Starts with the underline and the melody notes showing, even when there are no notes yet. */
  showMelody?: boolean;
  /** Sidebar controls to show next to the song, in the editor's own order. */
  tools?: ("trackToggles" | "underline" | "transpose")[];
}

const subscribeToNothing = () => () => {};

/** A live, throwaway copy of the song editor: the real SongView and its real reducer, with no
 *  saving. Unlike the app, it stays editable on mobile: these demos are there to be tried. */
export function ArticleChordEditor(props: ArticleChordEditorProps) {
  // Syllable ids come from a module-level counter, so a server render would never match the
  // client's. The editor only exists once the page is hydrated; until then its frame holds the place.
  const hydrated = useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  );
  if (!hydrated)
    return <figure className="article-editor" aria-label={props.label} />;
  return <LiveChordEditor {...props} />;
}

function LiveChordEditor({
  sheet,
  label,
  melody,
  bisGroups,
  showMelody = false,
  tools = [],
}: ArticleChordEditorProps) {
  const isMobile = useIsMobile();
  const [initialContent] = useState(() => contentFromChordSheet(sheet, melody, bisGroups));
  const { state, actions } = useEditor(initialContent, isMobile);
  const hasTrackToggles = tools.includes("trackToggles");
  const hasSideTools = hasTrackToggles || tools.includes("underline");

  // The underline (and with it the melody row) is a view setting the editor loads switched off
  // on mobile and whenever a song has no notes yet; these demos are about that row.
  useEffect(() => {
    if (!showMelody) return;
    actions.setShowUnderline(true);
    actions.setTrackVisibility("vocalNotes", true);
  }, [showMelody, actions]);

  const toggleUnderline = () => {
    const next = !state.showUnderline;
    actions.setShowUnderline(next);
    actions.setTrackVisibility("vocalNotes", next);
  };

  return (
    <figure
      className={
        hasSideTools
          ? "article-editor article-editor--with-track-toggles"
          : "article-editor"
      }
      aria-label={label}
    >
      {tools.length > 0 ? (
        <div className="article-editor__tools">
          {hasTrackToggles
            ? state.tracks
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
                ))
            : null}
          {tools.includes("underline") ? (
            <UnderlineToggleButton
              pressed={state.showUnderline}
              disabled={state.lyricsText.trim() === ""}
              onToggle={toggleUnderline}
            />
          ) : null}
          {tools.includes("transpose") ? (
            <TransposeWidget
              chordCells={state.cells.chords}
              noteCells={state.cells.vocalNotes}
              onTransposeCell={(slotId, text) =>
                actions.setCellText("chords", slotId, text)
              }
              onTransposeNoteCell={(slotId, text) =>
                actions.setCellText("vocalNotes", slotId, text)
              }
            />
          ) : null}
        </div>
      ) : null}
      <SongView
        song={state.song}
        lyricsText={state.lyricsText}
        bisGroups={state.bisGroups}
        merges={state.merges}
        tracks={state.tracks}
        cells={state.cells}
        chordVariants={state.chordVariants}
        pitchDirections={state.pitchDirections}
        showUnderline={state.showUnderline}
        showHelp={false}
        placeholder={null}
        canEdit
        onSetCellText={actions.setCellText}
        onSetChordVariant={actions.setChordVariant}
        onToggleMerge={actions.toggleSyllableMerge}
        onMoveCellText={actions.moveCellText}
        onDragPitchDirection={actions.dragPitchDirection}
        onReconcileLyricsText={actions.reconcileLyricsText}
        onToggleBis={actions.toggleBis}
        onPasteText={actions.pasteText}
      />
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

export const EXAMPLE_LINE = `
   A           A7     D
Ya nunca te he de olvidar
`;

export const EMPTY_LINE = ` `;

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
