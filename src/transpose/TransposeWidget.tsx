import { useState } from "react";
import "./TransposeWidget.css";
import { decideUseFlats, transposeChord } from "./transpose";

interface TransposeWidgetProps {
  /** Chord text per slot id, as currently shown (cells.chords). */
  chordCells: Record<string, string> | undefined;
  /** Writes a chord slot's transposed text back to wherever chords are stored. */
  onTransposeCell: (slotId: string, text: string) => void;
}

/**
 * Transposes every chord up or down by semitones, same widget as cancionero's (assets/song-sheet.js),
 * minus the localStorage persistence: the offset lives only in this component's state and resets
 * on reload, by design (see AGENTS note on decoupling this from the syllabifier).
 */
export function TransposeWidget({ chordCells, onTransposeCell }: TransposeWidgetProps) {
  const [offset, setOffset] = useState(0);
  const [useFlats, setUseFlats] = useState(false);

  const entries = Object.entries(chordCells ?? {}).filter(([, text]) => text.trim() !== "");
  if (entries.length === 0) return null;

  function shift(semitones: number) {
    const flats = offset === 0 ? decideUseFlats(entries.map(([, text]) => text)) : useFlats;
    if (offset === 0) setUseFlats(flats);
    for (const [slotId, text] of entries) {
      onTransposeCell(slotId, transposeChord(text, semitones, flats));
    }
    setOffset((current) => current + semitones);
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
