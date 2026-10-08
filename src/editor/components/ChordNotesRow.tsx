import { chordToNoteNames } from "../../core/chordNotes";
import { getCell } from "../../core/state";
import type { CellsByTrack } from "../../core/types";

interface ChordNotesRowProps {
  label: string;
  slotIds: string[];
  slotRects: Record<string, { left: number; width: number }>;
  cells: CellsByTrack;
  /** The previous chord's notes, keyed by the slot of the chord being shown — used to bold
   *  notes this chord shares with the one before it. */
  previousChordNotes: ReadonlyMap<string, string[]>;
}

/** A read-only track: each cell shows the notes of the chord written in the same slot of the
 *  chords track (highest note on top), rather than text of its own. A note shared with the
 *  previous chord is bolded. */
export function ChordNotesRow({ label, slotIds, slotRects, cells, previousChordNotes }: ChordNotesRowProps) {
  return (
    <div className="track-row track-row--chord-notes" data-track="chordNotes" role="group" aria-label={label}>
      {slotIds.map((slotId) => {
        const notes = chordToNoteNames(getCell(cells, "chords", slotId));
        if (!notes) return null;
        const rect = slotRects[slotId];
        const style = rect ? { left: `${rect.left}px` } : undefined;
        const sharedWithPrevious = new Set(previousChordNotes.get(slotId));
        return (
          <div key={slotId} className="chord-notes-cell" data-slot-id={slotId} style={style}>
            {[...notes].reverse().map((note, index) => (
              <span
                key={index}
                className={
                  "chord-notes-cell__note" +
                  (sharedWithPrevious.has(note) ? " chord-notes-cell__note--shared" : "")
                }
              >
                {note}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
