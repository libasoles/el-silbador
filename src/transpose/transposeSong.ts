import { chordLineTokens } from "../core/chordSheet";
import type { CellsByTrack, Song } from "../core/types";
import { decideUseFlats, transposeCells, transposeChordLine } from "./transpose";

/** The chords of each chord line of `song`, by line id. */
export function chordLinesOf(song: Song): Record<string, { column: number; chord: string }[]> {
  return Object.fromEntries(
    song.flatMap((line) => (line.chordLine !== undefined ? [[line.id, chordLineTokens(line.chordLine)]] : [])),
  );
}

/**
 * A reader-only view of a song at a selected key: its chord and melody cells and its chord lines,
 * all spelled with the same sharps or flats. The song itself is left untouched.
 */
export function transposeForReader(song: Song, cells: CellsByTrack, semitones: number): { song: Song; cells: CellsByTrack } {
  if (semitones === 0) return { song, cells };
  const chordLines = chordLinesOf(song);
  const useFlats = decideUseFlats([
    ...Object.values(cells.chords ?? {}),
    ...Object.values(chordLines).flatMap((chords) => chords.map(({ chord }) => chord)),
  ]);
  return {
    song: song.map((line) =>
      line.chordLine !== undefined
        ? { ...line, chordLine: transposeChordLine(chordLines[line.id]!, semitones, useFlats) }
        : line,
    ),
    cells: transposeCells(cells, semitones, useFlats),
  };
}
