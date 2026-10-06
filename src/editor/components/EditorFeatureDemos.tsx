import { Fragment } from "react";
import { ArrowLeft } from "lucide-react";
import {
  ChordDragTutorialExample,
  type ChordDragExampleDrag,
  type ChordDragExampleUnit,
} from "./ChordDragTutorialExample";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import "./EditorFeatureDemos.css";

/** Looping, read-only animations of editor gestures, drawn like the editor itself. Shared by the
 *  articles and by the mobile notice that shows what the desktop editor can do. */

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

export function MoveChordDemo() {
  return (
    <ChordDragTutorialExample
      units={MOVE_UNITS}
      drags={MOVE_DRAGS}
      label="Ejemplo: tres acordes arrastrados a la sílaba correcta"
    />
  );
}

interface PitchDragCell {
  syllable: string;
  note: string;
  drag?: "up" | "down";
  wordEnd?: boolean;
}

const PITCH_CELLS: PitchDragCell[] = [
  { syllable: "U", note: "do" },
  { syllable: "na", note: "mi", drag: "up", wordEnd: true },
  { syllable: "no", note: "sol" },
  { syllable: "che", note: "mi", drag: "down" },
];

/** The "mi" of "na" is pulled up and gets ↑, then the "mi" of "che" is pulled down and gets ↓.
 *  Drawn like the editor's own melody row. */
export function PitchDragDemo() {
  return (
    <span
      className="melody-tutorial-example pitch-drag-example"
      role="img"
      aria-label="Ejemplo: una nota arrastrada hacia arriba recibe una flecha ↑ y otra arrastrada hacia abajo recibe una flecha ↓"
    >
      {PITCH_CELLS.map((cell, index) => (
        <Fragment key={`${cell.syllable}-${index}`}>
          <span className="melody-tutorial-example__unit pitch-drag-example__unit">
            <span className="melody-tutorial-example__lyrics">
              <span className="melody-tutorial-example__lyric">{cell.syllable}</span>
            </span>
            <span
              className={
                "melody-tutorial-example__note" +
                (cell.drag ? ` pitch-drag-example__note--${cell.drag}` : "")
              }
            >
              {cell.note}
            </span>
            <span className="pitch-drag-example__arrow-slot">
              {cell.drag ? (
                <span className={`pitch-drag-example__arrow pitch-drag-example__arrow--${cell.drag}`}>
                  {cell.drag === "up" ? <ArrowUpIcon size="1em" strokeWidth={2} /> : <ArrowDownIcon size="1em" strokeWidth={2} />}
                </span>
              ) : null}
            </span>
          </span>
          {index < PITCH_CELLS.length - 1 ? (
            <span
              className={
                "melody-tutorial-example__gap" +
                (cell.wordEnd ? " melody-tutorial-example__gap--word-boundary" : "")
              }
            />
          ) : null}
        </Fragment>
      ))}
    </span>
  );
}

/** The cursor rests on the second line, Tab is pressed, and the line turns into a BIS: bold, with
 *  the editor's own "← BIS" marker at its end. */
export function BisTabDemo() {
  return (
    <span
      className="bis-tab-example"
      role="img"
      aria-label="Ejemplo: con el cursor en la segunda línea, presionar Tab la marca con BIS"
    >
      <span className="bis-tab-example__line">Ya nunca te he de olvidar</span>
      <span className="bis-tab-example__line bis-tab-example__line--bis">
        en la arena me escribias
        <span className="bis-tab-example__caret" />
        <span className="bis-tab-example__marker">
          <ArrowLeft aria-hidden="true" size="0.85em" />
          BIS
        </span>
      </span>
      <kbd className="bis-tab-example__key">Tab</kbd>
    </span>
  );
}
