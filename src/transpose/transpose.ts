/**
 * Chord transposition math, ported from the cancionero project's transpose widget
 * (assets/song-sheet.js). Deliberately self-contained: no imports from and no imports by the
 * syllabifier or any other editor module, so this feature can be dropped or removed without
 * touching anything else.
 */

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

const ROOT_RE = /^([A-G])([#b]?)/;

/** Transposes the root of a chord fragment (e.g. "Am7" -> root "A" + suffix "m7"); the suffix is
 *  left untouched since it doesn't affect the note. */
function transposePart(part: string, semitones: number, useFlats: boolean): string {
  const match = ROOT_RE.exec(part);
  if (!match) return part;
  const root = match[1] + match[2];
  const idx = NOTE_INDEX[root];
  if (idx === undefined) return part;
  const suffix = part.slice(match[0].length);
  const newIdx = (((idx + semitones) % 12) + 12) % 12;
  const names = useFlats ? FLAT_NAMES : SHARP_NAMES;
  return names[newIdx] + suffix;
}

/** A chord may carry a bass note ("G/B"): each side is transposed independently since they're
 *  separate notes. */
export function transposeChord(text: string, semitones: number, useFlats: boolean): string {
  return text
    .split("/")
    .map((part) => transposePart(part, semitones, useFlats))
    .join("/");
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
