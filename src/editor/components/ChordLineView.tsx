import { Fragment, useState } from "react";
import { chordToNoteNames } from "../../core/chordNotes";
import { getChordPositions } from "../../core/chordPositions";
import { chordLineTokens } from "../../core/chordSheet";
import { findChordShape } from "../../core/findChordShape";
import { useReaderChordPositions } from "../ReaderChordPositionsContext";
import { ChordTooltip } from "./ChordTooltip";

interface ChordLineViewProps {
  /** The line's raw text: chords spaced by column. */
  text: string;
  /** Props that name the line for a screen reader while editing (see `lineLabelProps`). */
  labelProps: object;
  readOnly: boolean;
  /** The chords track's visibility: a reader who hides the chords hides this line too. */
  chordsVisible: boolean;
  /** The chord-notes track's visibility: each chord shows its notes above it. */
  chordNotesVisible: boolean;
}

/** A line of only chords, with no lyrics under them (an intro, an ending). While editing it is
 *  text like any other line, in chord typography; when reading, each chord opens its diagram. */
export function ChordLineView({ text, labelProps, readOnly, chordsVisible, chordNotesVisible }: ChordLineViewProps) {
  const chords = chordLineTokens(text);
  const showNotes = readOnly && chordNotesVisible && chords.some(({ chord }) => chordToNoteNames(chord));
  const pieces: { text: string; chord: boolean }[] = [];
  let offset = 0;
  for (const { column, chord } of chords) {
    if (column > offset) pieces.push({ text: text.slice(offset, column), chord: false });
    pieces.push({ text: chord, chord: true });
    offset = column + chord.length;
  }
  if (offset < text.length) pieces.push({ text: text.slice(offset), chord: false });

  return (
    <div
      className={"line line--chord-line" + (showNotes ? " line--chord-line-notes" : "")}
      hidden={readOnly && !chordsVisible}
    >
      <div className="chord-line" {...labelProps} data-lyrics-line>
        {pieces.map((piece, index) =>
          !piece.chord ? (
            <Fragment key={index}>{piece.text}</Fragment>
          ) : readOnly ? (
            <ReadChord key={index} chord={piece.text} showNotes={showNotes} />
          ) : (
            <span key={index} className="chord-line__chord">
              {piece.text}
            </span>
          ),
        )}
      </div>
    </div>
  );
}

function ReadChord({ chord, showNotes }: { chord: string; showNotes: boolean }) {
  // The open diagram's anchor: the chord's own button, or null while it's closed.
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [localVariant, setLocalVariant] = useState(0);
  const remembered = useReaderChordPositions();
  const shape = findChordShape(chord);
  const positions = shape ? getChordPositions(shape) : [];
  const variant = shape ? (remembered?.get(shape.name) ?? localVariant) : localVariant;
  function setVariant(next: number) {
    setLocalVariant(next);
    if (shape) remembered?.set(shape.name, next);
  }
  const notes = showNotes ? chordToNoteNames(chord) : null;
  const notesCell = notes ? (
    <span className="chord-line__notes" aria-hidden="true">
      {[...notes].reverse().map((note, index) => (
        <span key={index} className="chord-notes-cell__note">
          {note}
        </span>
      ))}
    </span>
  ) : null;

  if (!shape) {
    return (
      <span className="chord-line__chord">
        {notesCell}
        {chord}
      </span>
    );
  }
  return (
    <>
      <button
        type="button"
        className="chord-line__chord chord-line__chord--button"
        aria-label={`Ver diagrama de ${chord}`}
        onClick={(event) => {
          const button = event.currentTarget;
          setAnchor((current) => (current ? null : button));
        }}
      >
        {notesCell}
        {chord}
      </button>
      {anchor ? (
        <ChordTooltip
          chordName={shape.name}
          shape={positions[Math.min(variant, positions.length - 1)] ?? shape}
          positionCount={positions.length}
          onPrevPosition={() => setVariant((variant - 1 + positions.length) % positions.length)}
          onNextPosition={() => setVariant((variant + 1) % positions.length)}
          anchorEl={anchor}
          onClose={() => setAnchor(null)}
        />
      ) : null}
    </>
  );
}
