import { useState } from "react";
import "./TransposeWidget.css";
import {
  decideUseFlats,
  transposeChord,
  transposeNote,
  type TransposeOffset,
} from "./transpose";

interface TransposeWidgetProps {
  /** Chord text per slot id, as currently shown (cells.chords). */
  chordCells: Record<string, string> | undefined;
  /** Melody-note text per slot id, as currently shown (cells.vocalNotes). */
  noteCells: Record<string, string> | undefined;
  /** Writes a chord slot's transposed text back to wherever chords are stored. */
  onTransposeCell: (slotId: string, text: string) => void;
  /** Writes a melody-note slot's transposed text back to wherever notes are stored. */
  onTransposeNoteCell: (slotId: string, text: string) => void;
  /**
   * An offset the caller has just replayed onto the live cells (e.g. one read back from
   * localStorage for a read-only viewer) — adopted once, so the widget's own displayed offset
   * matches content that's already transposed instead of showing "0" over it. `undefined`/`null`
   * (no saved offset, or nothing to restore, e.g. the owner's own editing session) leaves the
   * widget at its normal zeroed start.
   */
  restoredOffset?: TransposeOffset | null;
  /** Called after every shift with the new cumulative offset, so the caller can persist it (e.g.
   *  to localStorage for a read-only viewer). Omitted wherever nothing should be persisted. */
  onOffsetChange?: (offset: TransposeOffset) => void;
}

/**
 * Transposes every chord up or down by semitones, same widget as cancionero's (assets/song-sheet.js).
 * The offset itself lives in this component's state; a caller that wants it to survive a reload
 * (e.g. a read-only viewer, via `transposeOffsetStorage`) passes it back in as `restoredOffset` and
 * is notified of further changes via `onOffsetChange` — this component never touches storage
 * itself, same separation as `justForkedStorage`/`draftStorage` living outside their UI.
 *
 * The melody-notes track is transposed alongside the chords, using the same sharp/flat choice, so
 * the two tracks stay in the same key.
 */
export function TransposeWidget({
  chordCells,
  noteCells,
  onTransposeCell,
  onTransposeNoteCell,
  restoredOffset,
  onOffsetChange,
}: TransposeWidgetProps) {
  const [offset, setOffset] = useState(0);
  const [useFlats, setUseFlats] = useState(false);
  // Tracks which `restoredOffset` (by reference) has already been adopted into state above, so
  // that adoption happens exactly once — right when the caller finishes replaying a saved offset
  // onto the live cells — rather than on every render. Adjusting state during render in response
  // to a changed prop, as React recommends, instead of in an effect: an effect would run one
  // render late, letting the "0" label flash before the restored offset ever reaches state.
  const [adoptedOffset, setAdoptedOffset] = useState<TransposeOffset | null | undefined>(undefined);
  if (restoredOffset && restoredOffset !== adoptedOffset) {
    setAdoptedOffset(restoredOffset);
    setOffset(restoredOffset.semitones);
    setUseFlats(restoredOffset.useFlats);
  }

  const chordEntries = Object.entries(chordCells ?? {}).filter(([, text]) => text.trim() !== "");
  const noteEntries = Object.entries(noteCells ?? {}).filter(([, text]) => text.trim() !== "");
  if (chordEntries.length === 0 && noteEntries.length === 0) return null;

  function shift(semitones: number) {
    const flats = offset === 0 ? decideUseFlats(chordEntries.map(([, text]) => text)) : useFlats;
    if (offset === 0) setUseFlats(flats);
    for (const [slotId, text] of chordEntries) {
      onTransposeCell(slotId, transposeChord(text, semitones, flats));
    }
    for (const [slotId, text] of noteEntries) {
      onTransposeNoteCell(slotId, transposeNote(text, semitones, flats));
    }
    const newOffset = offset + semitones;
    setOffset(newOffset);
    onOffsetChange?.({ semitones: newOffset, useFlats: flats });
  }

  const label = offset === 0 ? "0" : offset > 0 ? `+${offset}` : String(offset);

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
      <button
        type="button"
        className="transpose-widget__current"
        aria-label="Restablecer tono original"
        title="Restablecer tono original"
        aria-pressed={offset !== 0}
        disabled={offset === 0}
        onClick={() => shift(-offset)}
      >
        {label}
      </button>
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
