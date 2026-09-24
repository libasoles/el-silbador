/** Chord placements for YPACARAI_LYRICS, transcribed from the user's own cancionero
 * (recuerdos-de-ypacarai.html). `line`/`syllable` are 0-indexed positions into the flattened
 * syllable sequence of that lyrics line, matching how `buildSong` hyphenates YPACARAI_LYRICS. */
export interface ChordPlacement {
  line: number;
  syllable: number;
  chord: string;
}

export const YPACARAI_CHORDS: ChordPlacement[] = [
  { line: 0, syllable: 0, chord: "C" },
  { line: 1, syllable: 7, chord: "G7" },
  { line: 2, syllable: 4, chord: "Dm" },
  { line: 3, syllable: 3, chord: "F" },
  { line: 3, syllable: 6, chord: "G7" },
  { line: 5, syllable: 2, chord: "C7" },
  { line: 5, syllable: 8, chord: "F" },
  { line: 6, syllable: 4, chord: "Fm" },
  { line: 6, syllable: 10, chord: "C" },
  { line: 7, syllable: 2, chord: "Em" },
  { line: 7, syllable: 9, chord: "Dm" },
  { line: 8, syllable: 2, chord: "G7" },
  { line: 8, syllable: 9, chord: "C" },
  { line: 10, syllable: 3, chord: "F" },
  { line: 10, syllable: 8, chord: "Fm" },
  { line: 11, syllable: 2, chord: "C" },
  { line: 11, syllable: 10, chord: "A7" },
  { line: 12, syllable: 4, chord: "Dm" },
  { line: 13, syllable: 3, chord: "G7" },
  { line: 13, syllable: 6, chord: "C" },
  { line: 13, syllable: 8, chord: "C7" },
  { line: 14, syllable: 3, chord: "F" },
  { line: 14, syllable: 9, chord: "Fm" },
  { line: 15, syllable: 2, chord: "Em" },
  { line: 15, syllable: 7, chord: "A7" },
  { line: 16, syllable: 4, chord: "Dm" },
  { line: 17, syllable: 2, chord: "G7" },
  { line: 17, syllable: 5, chord: "C" },
];

/** Chords that land after a line's last syllable (pickup into the next line). */
export const YPACARAI_END_OF_LINE_CHORDS: { line: number; chord: string }[] = [{ line: 3, chord: "C" }];
