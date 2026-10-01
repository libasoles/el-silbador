import { transposeChord, transposeNote, type TransposeOffset } from "./transpose";

/**
 * Re-applies a previously saved offset to whatever `chords`/`vocalNotes` cells are live right
 * now, rather than to a stale snapshot of their text — so content the song's owner added or
 * changed since the offset was saved comes out transposed too, using the same semitone shift and
 * sharp/flat spelling as everything else.
 */
export function replayTransposeOffset(
  chordCells: Record<string, string> | undefined,
  noteCells: Record<string, string> | undefined,
  offset: TransposeOffset,
): { chords: Record<string, string>; vocalNotes: Record<string, string> } {
  const chords: Record<string, string> = {};
  for (const [slotId, text] of Object.entries(chordCells ?? {})) {
    chords[slotId] =
      text.trim() === "" ? text : transposeChord(text, offset.semitones, offset.useFlats);
  }
  const vocalNotes: Record<string, string> = {};
  for (const [slotId, text] of Object.entries(noteCells ?? {})) {
    vocalNotes[slotId] =
      text.trim() === "" ? text : transposeNote(text, offset.semitones, offset.useFlats);
  }
  return { chords, vocalNotes };
}
