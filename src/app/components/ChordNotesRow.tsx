import { chordToNoteNames } from "../../core/chordNotes";
import { getCell } from "../../core/state";
import type { CellsByTrack } from "../../core/types";

interface ChordNotesRowProps {
  label: string;
  slotIds: string[];
  slotRects: Record<string, { left: number; width: number }>;
  cells: CellsByTrack;
}

/** A read-only track: each cell shows the notes of the chord written in the same slot of the
 *  chords track (highest note on top), rather than text of its own. */
export function ChordNotesRow({ label, slotIds, slotRects, cells }: ChordNotesRowProps) {
  return (
    <div className="track-row track-row--chord-notes" data-track="chordNotes" role="row" aria-label={label}>
      {slotIds.map((slotId) => {
        const notes = chordToNoteNames(getCell(cells, "chords", slotId));
        if (!notes) return null;
        const rect = slotRects[slotId];
        const style = rect ? { left: `${rect.left}px` } : undefined;
        return (
          <div key={slotId} className="chord-notes-cell" data-slot-id={slotId} style={style}>
            {[...notes].reverse().map((note, index) => (
              <span key={index} className="chord-notes-cell__note">
                {note}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
