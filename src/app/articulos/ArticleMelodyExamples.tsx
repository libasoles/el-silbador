"use client";

import { Fragment } from "react";
import { ArrowDownIcon, ArrowUpIcon } from "../../editor/components/icons";
import { MelodyTutorialExample } from "../../editor/components/MelodyTutorialExample";

export function MelodyTypingExample() {
  return (
    <div className="article-gesture">
      <MelodyTutorialExample animateNotes />
    </div>
  );
}

export function MelodyJoinExample() {
  return (
    <div className="article-gesture">
      <MelodyTutorialExample joined />
    </div>
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

/** Looping drag demo: the "mi" of "na" is pulled up and gets ↑, then the "mi" of "che" is pulled
 *  down and gets ↓. Drawn like the editor's own melody row, at reading size. */
export function PitchDragExample() {
  const cells = PITCH_CELLS;
  return (
    <div className="article-gesture">
      <span
        className="melody-tutorial-example pitch-drag-example"
        role="img"
        aria-label="Ejemplo: una nota arrastrada hacia arriba recibe una flecha ↑ y otra arrastrada hacia abajo recibe una flecha ↓"
      >
        {cells.map((cell, index) => (
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
            {index < cells.length - 1 ? (
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
    </div>
  );
}
