import { useState } from "react";
import "./TransposeWidget.css";
import { decideUseFlats, transposeChord, transposeChordLine, transposeNote } from "./transpose";

interface TransposeWidgetProps {
  /** Chord text per slot id, as currently shown (cells.chords). */
  chordCells: Record<string, string> | undefined;
  /** Melody-note text per slot id, as currently shown (cells.vocalNotes). */
  noteCells: Record<string, string> | undefined;
  /** Writes a chord slot's transposed text back to wherever chords are stored. */
  onTransposeCell: (slotId: string, text: string) => void;
  /** Writes a melody-note slot's transposed text back to wherever notes are stored. */
  onTransposeNoteCell: (slotId: string, text: string) => void;
  /** The chords of each chord line, by line id (see `chordLineTokens`). */
  chordLines?: Record<string, { column: number; chord: string }[]>;
  /** Writes the transposed text of chord lines back, by line id. */
  onTransposeChordLines?: (texts: Record<string, string>) => void;
  /** Reader mode owns the offset outside this widget so it can be restored from localStorage. */
  readerOffset?: number;
  /** Called only when a reader uses one of the +/- controls. */
  onReaderOffsetChange?: (offset: number) => void;
}

/**
 * Transposes every chord up or down by semitones, same widget as cancionero's (assets/song-sheet.js),
 * The melody-notes track is transposed alongside the chords, using the same sharp/flat choice, so
 * the two tracks stay in the same key.
 */
export function TransposeWidget({
  chordCells,
  noteCells,
  onTransposeCell,
  onTransposeNoteCell,
  chordLines = {},
  onTransposeChordLines,
  readerOffset,
  onReaderOffsetChange,
}: TransposeWidgetProps) {
  const [offset, setOffset] = useState(0);
  const [useFlats, setUseFlats] = useState(false);

  const chordEntries = Object.entries(chordCells ?? {}).filter(([, text]) => text.trim() !== "");
  const noteEntries = Object.entries(noteCells ?? {}).filter(([, text]) => text.trim() !== "");
  const chordLineEntries = Object.entries(chordLines).filter(([, chords]) => chords.length > 0);
  if (chordEntries.length === 0 && noteEntries.length === 0 && chordLineEntries.length === 0) return null;

  function shift(semitones: number) {
    if (readerOffset !== undefined) {
      onReaderOffsetChange?.(readerOffset + semitones);
      return;
    }
    const flats =
      offset === 0
        ? decideUseFlats([
            ...chordEntries.map(([, text]) => text),
            ...chordLineEntries.flatMap(([, chords]) => chords.map(({ chord }) => chord)),
          ])
        : useFlats;
    if (offset === 0) setUseFlats(flats);
    for (const [slotId, text] of chordEntries) {
      onTransposeCell(slotId, transposeChord(text, semitones, flats));
    }
    for (const [slotId, text] of noteEntries) {
      onTransposeNoteCell(slotId, transposeNote(text, semitones, flats));
    }
    if (chordLineEntries.length > 0) {
      onTransposeChordLines?.(
        Object.fromEntries(
          chordLineEntries.map(([lineId, chords]) => [lineId, transposeChordLine(chords, semitones, flats)]),
        ),
      );
    }
    setOffset((current) => current + semitones);
  }

  const displayedOffset = readerOffset ?? offset;
  const label =
    displayedOffset === 0
      ? "0"
      : displayedOffset > 0
        ? `+${displayedOffset}`
        : String(displayedOffset);

  return (
    <div className="transpose-widget" aria-label="Transponer tonalidad">
      <button
        type="button"
        className="transpose-widget__step"
        aria-label="Bajar medio tono"
        onClick={() => shift(-1)}
      >
        −
      </button>
      <output
        className="transpose-widget__current"
        data-active={displayedOffset !== 0 || undefined}
        aria-label={`Desplazamiento de tonalidad: ${label} semitonos`}
      >
        {label}
      </output>
      <button
        type="button"
        className="transpose-widget__step"
        aria-label="Subir medio tono"
        onClick={() => shift(1)}
      >
        +
      </button>
    </div>
  );
}
