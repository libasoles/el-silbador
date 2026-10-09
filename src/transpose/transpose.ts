/**
 * Chord transposition math, ported from the cancionero project's transpose widget
 * (assets/song-sheet.js). Deliberately self-contained: no imports from and no imports by the
 * syllabifier or any other editor module, so this feature can be dropped or removed without
 * touching anything else.
 */

import type { CellsByTrack } from "../core/types";

const SHARP_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_NAMES = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "B#": 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  F: 5,
  "E#": 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
};

/** An optional leading "(" lets parenthesized chords like "(G)" transpose too; it's kept as-is. */
const ROOT_RE = /^(\(?)([A-G])([#b]?)/;

/** Transposes the root of a chord fragment (e.g. "Am7" -> root "A" + suffix "m7"); the suffix is
 *  left untouched since it doesn't affect the note. */
function transposePart(part: string, semitones: number, useFlats: boolean): string {
  const match = ROOT_RE.exec(part);
  if (!match) return part;
  const root = match[2] + match[3];
  const idx = NOTE_INDEX[root];
  if (idx === undefined) return part;
  const suffix = part.slice(match[0].length);
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  return match[1] + names[newIdx] + suffix;
}

/** A chord may carry a bass note ("G/B"): each side is transposed independently since they're
 *  separate notes. */
export function transposeChord(text: string, semitones: number, useFlats: boolean): string {
  return text
    .split("/")
    .map((part) => transposePart(part, semitones, useFlats))
    .join("/");
}

/** Rewrites a chord line from its chords (as `chordLineTokens` reads them), each transposed and
 *  kept at the column it started at. A chord that grows pushes the next one right, always leaving
 *  at least one space between them. */
export function transposeChordLine(
  chords: readonly { column: number; chord: string }[],
  semitones: number,
  useFlats: boolean,
): string {
  let line = "";
  for (const { column, chord } of chords) {
    line = line.padEnd(line === "" ? column : Math.max(column, line.length + 1)) + transposeChord(chord, semitones, useFlats);
  }
  return line;
}

/** Picks sharps or flats to match whatever spelling the chords already use, so transposing
 *  doesn't change the "accent" of a key the user already recognizes (e.g. Bb rather than A#). */
export function decideUseFlats(chordTexts: string[]): boolean {
  let useFlats = false;
  let hasSharp = false;
  for (const text of chordTexts) {
    if (text.indexOf("b") !== -1 && ROOT_RE.test(text)) useFlats = true;
    if (text.indexOf("#") !== -1) hasSharp = true;
  }
  return hasSharp ? false : useFlats;
}

const SOLFEGE_SHARP_NAMES = ["do", "do#", "re", "re#", "mi", "fa", "fa#", "sol", "sol#", "la", "la#", "si"];
const SOLFEGE_FLAT_NAMES = ["do", "reb", "re", "mib", "mi", "fa", "solb", "sol", "lab", "la", "sib", "si"];

const SOLFEGE_INDEX: Record<string, number> = {
  do: 0,
  "si#": 0,
  "do#": 1,
  reb: 1,
  re: 2,
  "re#": 3,
  mib: 3,
  mi: 4,
  fab: 4,
  fa: 5,
  "mi#": 5,
  "fa#": 6,
  solb: 6,
  sol: 7,
  "sol#": 8,
  lab: 8,
  la: 9,
  "la#": 10,
  sib: 10,
  si: 11,
  dob: 11,
};

const SOLFEGE_ROOT_RE = /^(\(?)(do|re|mi|fa|sol|la|si)(#|b)?/i;

/** Transposes a melody note written in Spanish solfège (e.g. "Re#", "Lab"), used for the melody-
 *  notes track. Case of the matched root is preserved (capitalized stays capitalized); anything
 *  after the root (and text that isn't a recognizable solfège note) is left untouched. */
export function transposeNote(text: string, semitones: number, useFlats: boolean): string {
  const match = SOLFEGE_ROOT_RE.exec(text);
  if (!match) return text;
  const root = (match[2] + (match[3] ?? "")).toLowerCase();
  const idx = SOLFEGE_INDEX[root];
  if (idx === undefined) return text;
  const suffix = text.slice(match[0].length);
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  const names = useFlats ? SOLFEGE_FLAT_NAMES : SOLFEGE_SHARP_NAMES;
  const newName = names[newIdx]!;
  const capitalized = /^[A-Z]/.test(match[2]!)
    ? newName[0]!.toUpperCase() + newName.slice(1)
    : newName;
  return match[1] + capitalized + suffix;
}

/**
 * Produces a reader-only view of chord and melody cells at a selected key. The editor's source
 * cells remain untouched, so this can never turn a reader preference into a shared song edit.
 */
export function transposeCells(
  cells: CellsByTrack,
  semitones: number,
  useFlats = decideUseFlats(Object.values(cells.chords ?? {})),
): CellsByTrack {
  if (semitones === 0) return cells;

  const transposeTrack = (
    track: Record<string, string> | undefined,
    transpose: (text: string, semitones: number, useFlats: boolean) => string,
  ) =>
    Object.fromEntries(
      Object.entries(track ?? {}).map(([slotId, text]) => [
        slotId,
        transpose(text, semitones, useFlats),
      ]),
    );

  return {
    ...cells,
    chords: transposeTrack(cells.chords, transposeChord),
    vocalNotes: transposeTrack(cells.vocalNotes, transposeNote),
  };
}
