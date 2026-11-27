/**
 * Chord suggestions for a syllable's vocal note (the "rearmonización" popup). Pure theory: it
 * knows nothing about the editor. Pitch classes are 0–11 (do = 0). Only chords that exist in the
 * guitar-chords catalog are ever suggested, so every written chord has a diagram.
 */

import { chordToNoteNames } from "./chordNotes";
import { findChordShape } from "./findChordShape";

const SOLFEGE_PC: Record<string, number> = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };
const SOLFEGE_NAMES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];
const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

const MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10];

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A melody note written in solfège ("do", "fa#", "sib", "si♭") as a pitch class, or null. */
export function parseMelodyNote(text: string): number | null {
  const match = /^(do|re|mi|fa|sol|la|si)\s*(#|b|♯|♭)?$/i.exec(text.trim());
  if (!match) return null;
  const base = SOLFEGE_PC[match[1]!.toLowerCase()]!;
  const accidental = match[2];
  if (accidental === "#" || accidental === "♯") return mod12(base + 1);
  if (accidental === "b" || accidental === "♭") return mod12(base - 1);
  return base;
}

function chordPitchClasses(chord: string): number[] | null {
  const names = chordToNoteNames(chord);
  if (!names) return null;
  return names.map((name) => parseMelodyNote(name)!);
}

function chordRoot(chord: string): number | null {
  const pcs = chordPitchClasses(chord);
  return pcs ? pcs[0]! : null;
}

export interface SongKey {
  tonic: number;
  minor: boolean;
}

export function keyName(key: SongKey): string {
  return `${SOLFEGE_NAMES[key.tonic]} ${key.minor ? "menor" : "mayor"}`;
}

/** The form a key is stored in, e.g. "0:major" (see supabase/migrations/0015_song_key.sql). */
export function serializeKey(key: SongKey): string {
  return `${key.tonic}:${key.minor ? "minor" : "major"}`;
}

export function parseKey(text: string | null | undefined): SongKey | null {
  const match = /^(\d|1[01]):(major|minor)$/.exec(text ?? "");
  return match ? { tonic: Number(match[1]), minor: match[2] === "minor" } : null;
}

export const ALL_KEYS: SongKey[] = [false, true].flatMap((minor) =>
  Array.from({ length: 12 }, (_, tonic) => ({ tonic, minor })),
);

export function keyEquals(a: SongKey, b: SongKey): boolean {
  return a.tonic === b.tonic && a.minor === b.minor;
}

const KS_MAJOR = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88];
const KS_MINOR = [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];

function correlation(a: number[], b: number[]): number {
  const meanA = a.reduce((s, v) => s + v, 0) / a.length;
  const meanB = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < a.length; i++) {
    const da = a[i]! - meanA;
    const db = b[i]! - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  return denA === 0 || denB === 0 ? 0 : num / Math.sqrt(denA * denB);
}

export interface InferredKey {
  key: SongKey;
  /** Margin between the best and the second best key (0 to 2). Low = ambiguous. */
  confidence: number;
}

/** What the written chords say about a key, on top of the pitch-class profile: how many of them
 *  belong to its scale, and whether the song ends (and, less so, starts) on its tonic chord. The
 *  profile alone can't tell C from G in a song that lives on C, G and F, because both keys share
 *  most of their notes; the chords' own functions can. */
function harmonicEvidence(key: SongKey, chords: readonly string[]): number {
  if (chords.length === 0) return 0;
  const scale = new Set((key.minor ? MINOR_SCALE : MAJOR_SCALE).map((degree) => mod12(key.tonic + degree)));
  if (key.minor) scale.add(mod12(key.tonic + 11)); // the leading tone of a minor key's V
  const diatonic = chords.filter((chord) => chordPitchClasses(chord)!.every((pc) => scale.has(pc)));
  const isTonicChord = (chord: string) => {
    const pcs = chordPitchClasses(chord)!;
    return pcs[0] === key.tonic && pcs.includes(mod12(key.tonic + (key.minor ? 3 : 4)));
  };
  return (
    0.2 * (diatonic.length / chords.length) +
    (isTonicChord(chords[chords.length - 1]!) ? 0.12 : 0) +
    (isTonicChord(chords[0]!) ? 0.04 : 0)
  );
}

/** Krumhansl-Schmuckler key finding over the melody notes and the written chords. A relative
 *  major/minor pair that scores nearly the same is settled by the first and last chord. */
export function inferKey(melodyNotes: readonly string[], chords: readonly string[]): InferredKey | null {
  const histogram = new Array<number>(12).fill(0);
  for (const text of melodyNotes) {
    const pc = parseMelodyNote(text);
    if (pc !== null) histogram[pc]! += 1;
  }
  const parsedChords = chords.filter((chord) => chordPitchClasses(chord) !== null);
  for (const chord of parsedChords) {
    for (const pc of chordPitchClasses(chord)!) histogram[pc]! += 1;
  }
  if (histogram.every((v) => v === 0)) return null;

  const scored: { key: SongKey; score: number }[] = [];
  for (let tonic = 0; tonic < 12; tonic++) {
    for (const minor of [false, true]) {
      const profile = minor ? KS_MINOR : KS_MAJOR;
      const rotated = histogram.map((_, pc) => profile[mod12(pc - tonic)]!);
      const key = { tonic, minor };
      scored.push({ key, score: correlation(histogram, rotated) + harmonicEvidence(key, parsedChords) });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  let best = scored[0]!;
  const second = scored[1]!;
  const margin = best.score - second.score;

  const relative = (a: SongKey, b: SongKey) =>
    a.minor !== b.minor && (a.minor ? mod12(a.tonic + 3) : mod12(a.tonic - 3)) === b.tonic;
  const rival = scored.find((entry) => relative(best.key, entry.key));
  if (rival && best.score - rival.score < 0.1 && parsedChords.length > 0) {
    const roots = [chordRoot(parsedChords[0]!), chordRoot(parsedChords[parsedChords.length - 1]!)];
    const points = (key: SongKey) => roots.filter((root) => root === key.tonic).length;
    if (points(rival.key) > points(best.key)) best = rival;
  }
  return { key: best.key, confidence: margin };
}

export type KeyedNotation = "sharp" | "flat";

const FLAT_MAJOR_TONICS = new Set([5, 10, 3, 8, 1, 6]);
const FLAT_MINOR_TONICS = new Set([2, 7, 0, 5, 10, 3]);

/** Sharps or flats for new chords: what the written chords already use, else what the key uses. */
export function notationFor(key: SongKey, writtenChords: readonly string[]): KeyedNotation {
  for (const chord of writtenChords) {
    if (/^[A-G][b♭]/.test(chord.trim())) return "flat";
    if (/^[A-G][#♯]/.test(chord.trim())) return "sharp";
  }
  const flats = key.minor ? FLAT_MINOR_TONICS : FLAT_MAJOR_TONICS;
  return flats.has(key.tonic) ? "flat" : "sharp";
}

function rootName(pc: number, notation: KeyedNotation): string {
  return (notation === "flat" ? FLAT_ROOTS : SHARP_ROOTS)[pc]!;
}

/** The chord's name if the catalog has a fingering for it (either spelling), else null. */
function catalogChord(root: number, suffix: string, notation: KeyedNotation): string | null {
  const preferred = `${rootName(root, notation)}${suffix}`;
  if (findChordShape(preferred)) return preferred;
  const other = `${rootName(root, notation === "flat" ? "sharp" : "flat")}${suffix}`;
  return findChordShape(other) ? other : null;
}

export type SuggestionMode = 1 | 2 | 3 | 4;

export interface Suggestion {
  /** The chord text to write on the syllable. */
  chord: string;
  /** Not diatonic to the key: offered only because it contains an out-of-key note. */
  outOfKey: boolean;
  /** Roman numeral of its degree, when it has one. */
  degree?: string;
}

export interface SuggestInput {
  key: SongKey;
  /** Pitch class of the syllable's vocal note. */
  note: number;
  mode: SuggestionMode;
  /** Nearest chords already written before and after the syllable (any tool). */
  previous?: string | null;
  next?: string | null;
  /** Metric syllables with a note between the previous and next chord, the active one included. */
  syllablesBetween?: number;
  /** Chords already in the song, to follow its sharps/flats. */
  writtenChords?: readonly string[];
}

interface Degree {
  root: number;
  /** Index in the scale, 0 to 6. */
  index: number;
  roman: string;
  triad: "" | "m" | "dim";
  /** Suffix families for 7/9/11/13 chords on this degree, lowest extension first. */
  extensions: string[];
}

const MAJOR_DEGREES: { roman: string; triad: Degree["triad"]; extensions: string[] }[] = [
  { roman: "I", triad: "", extensions: ["maj7", "maj9", "maj11", "maj13"] },
  { roman: "ii", triad: "m", extensions: ["m7", "m9", "m11", "m13"] },
  { roman: "iii", triad: "m", extensions: ["m7", "m9", "m11", "m13"] },
  { roman: "IV", triad: "", extensions: ["maj7", "maj9", "maj11", "maj13"] },
  { roman: "V", triad: "", extensions: ["7", "9", "11", "13"] },
  { roman: "vi", triad: "m", extensions: ["m7", "m9", "m11", "m13"] },
  { roman: "vii°", triad: "dim", extensions: ["m7b5"] },
];
const MINOR_DEGREES: typeof MAJOR_DEGREES = [
  { roman: "i", triad: "m", extensions: ["m7", "m9", "m11", "m13"] },
  { roman: "ii°", triad: "dim", extensions: ["m7b5"] },
  { roman: "III", triad: "", extensions: ["maj7", "maj9", "maj11", "maj13"] },
  { roman: "iv", triad: "m", extensions: ["m7", "m9", "m11", "m13"] },
  { roman: "v", triad: "m", extensions: ["m7", "m9", "m11", "m13"] },
  { roman: "VI", triad: "", extensions: ["maj7", "maj9", "maj11", "maj13"] },
  { roman: "VII", triad: "", extensions: ["7", "9", "11", "13"] },
];

function degreesOf(key: SongKey): Degree[] {
  const scale = key.minor ? MINOR_SCALE : MAJOR_SCALE;
  const table = key.minor ? MINOR_DEGREES : MAJOR_DEGREES;
  return table.map((entry, index) => ({ ...entry, index, root: mod12(key.tonic + scale[index]!) }));
}

export function isInKey(key: SongKey, note: number): boolean {
  return (key.minor ? MINOR_SCALE : MAJOR_SCALE).some((step) => mod12(key.tonic + step) === note);
}

function containsPc(chord: string, pc: number): boolean {
  return chordPitchClasses(chord)?.includes(pc) ?? false;
}

// Functional preference when movement ties: I, IV, V, ii, vi, iii (then the rest).
const FUNCTION_RANK_MAJOR = ["I", "IV", "V", "ii", "vi", "iii"];
const FUNCTION_RANK_MINOR = ["i", "iv", "v", "VII", "VI", "III"];

/** Pitch classes of `chord` not shared with `neighbour`: fewer = less movement. */
function movement(chord: string, neighbours: string[]): number {
  const pcs = chordPitchClasses(chord)!;
  let total = 0;
  for (const neighbour of neighbours) {
    const other = chordPitchClasses(neighbour);
    if (other) total += pcs.filter((pc) => !other.includes(pc)).length;
  }
  return total;
}

function sortSuggestions(
  suggestions: Suggestion[],
  key: SongKey,
  neighbours: string[],
): Suggestion[] {
  const rank = key.minor ? FUNCTION_RANK_MINOR : FUNCTION_RANK_MAJOR;
  const functionRank = (s: Suggestion) => {
    const index = s.degree ? rank.indexOf(s.degree) : -1;
    return index === -1 ? rank.length : index;
  };
  return suggestions
    .map((s, order) => ({ s, order }))
    .sort(
      (a, b) =>
        Number(a.s.outOfKey) - Number(b.s.outOfKey) ||
        movement(a.s.chord, neighbours) - movement(b.s.chord, neighbours) ||
        functionRank(a.s) - functionRank(b.s) ||
        a.order - b.order,
    )
    .map(({ s }) => s);
}

function triadSuffix(triad: Degree["triad"]): string {
  return triad === "dim" ? "dim" : triad;
}

function allTriads(notation: KeyedNotation): { chord: string; root: number }[] {
  const result: { chord: string; root: number }[] = [];
  for (let root = 0; root < 12; root++) {
    for (const suffix of ["", "m"]) {
      const chord = catalogChord(root, suffix, notation);
      if (chord) result.push({ chord, root });
    }
  }
  return result;
}

/** Is `note` a usable 7th/9th/13th over the triad: not already in it and not a semitone above
 *  one of its notes (which would clash)? */
function extendsTriad(triadPcs: number[], root: number, note: number): boolean {
  if (triadPcs.includes(note)) return false;
  const interval = mod12(note - root);
  if (![9, 10, 11, 2].includes(interval)) return false;
  return !triadPcs.some((pc) => mod12(note - pc) === 1);
}

function mode1(input: SuggestInput, notation: KeyedNotation): Suggestion[] {
  const { key, note } = input;
  const out: Suggestion[] = [];
  if (isInKey(key, note)) {
    for (const degree of degreesOf(key)) {
      if (degree.triad === "dim") continue;
      const chord = catalogChord(degree.root, triadSuffix(degree.triad), notation);
      if (chord && containsPc(chord, note)) out.push({ chord, outOfKey: false, degree: degree.roman });
    }
  } else {
    for (const { chord } of allTriads(notation)) {
      if (containsPc(chord, note)) out.push({ chord, outOfKey: true });
    }
  }
  return out;
}

function mode2(input: SuggestInput, notation: KeyedNotation): Suggestion[] {
  const { key, note } = input;
  const out: Suggestion[] = [];
  if (isInKey(key, note)) {
    for (const degree of degreesOf(key)) {
      if (degree.triad === "dim") continue;
      const chord = catalogChord(degree.root, triadSuffix(degree.triad), notation);
      if (chord && extendsTriad(chordPitchClasses(chord)!, degree.root, note)) {
        out.push({ chord, outOfKey: false, degree: degree.roman });
      }
    }
  } else {
    for (const { chord, root } of allTriads(notation)) {
      if (extendsTriad(chordPitchClasses(chord)!, root, note)) out.push({ chord, outOfKey: true });
    }
  }
  return out;
}

const OUT_OF_KEY_FAMILIES = [
  ["maj7", "maj9", "maj11", "maj13"],
  ["m7", "m9", "m11", "m13"],
  ["7", "9", "11", "13"],
];

function mode3(input: SuggestInput, notation: KeyedNotation): Suggestion[] {
  const { key, note } = input;
  const out: Suggestion[] = [];
  const lowestContaining = (root: number, extensions: string[]): string | null => {
    for (const suffix of extensions) {
      const chord = catalogChord(root, suffix, notation);
      if (chord && containsPc(chord, note)) return chord;
    }
    return null;
  };
  if (isInKey(key, note)) {
    for (const degree of degreesOf(key)) {
      const chord = lowestContaining(degree.root, degree.extensions);
      if (chord) out.push({ chord, outOfKey: false, degree: degree.roman });
    }
  } else {
    for (let root = 0; root < 12; root++) {
      for (const extensions of OUT_OF_KEY_FAMILIES) {
        const chord = lowestContaining(root, extensions);
        if (chord) out.push({ chord, outOfKey: true });
      }
    }
  }
  return out;
}

/** ii-V-I towards `target` (the next chord, or the tonic), cut to what fits between the written
 *  chords. Without a previous chord it starts from the tonic. */
function mode4(input: SuggestInput, notation: KeyedNotation): Suggestion[] {
  const { key } = input;
  const previousRoot = input.previous ? chordRoot(input.previous) : null;
  const nextRoot = input.next ? chordRoot(input.next) : null;
  if (previousRoot === null && nextRoot === null) return [];
  const count = Math.max(1, Math.min(3, input.syllablesBetween ?? 3));
  const minorTarget = nextRoot !== null ? /^[A-G][#b♯♭]?m(?!aj)/.test(input.next!.trim()) : key.minor;
  const target = nextRoot ?? key.tonic;

  const build = (root: number, suffix: string, degree: string): Suggestion | null => {
    const chord = catalogChord(root, suffix, notation) ?? null;
    return chord ? { chord, outOfKey: false, degree } : null;
  };
  const tonicChord = build(key.tonic, key.minor ? "m7" : "maj7", key.minor ? "i" : "I");

  let line: (Suggestion | null)[];
  if (previousRoot === null) {
    // Starts from the tonic, then moves towards the next chord.
    line = [
      tonicChord,
      build(mod12(target + 2), minorTarget ? "m7b5" : "m7", "ii"),
      build(mod12(target + 7), "7", "V"),
    ];
  } else if (nextRoot === null) {
    line = [
      build(mod12(target + 2), key.minor ? "m7b5" : "m7", "ii"),
      build(mod12(target + 7), "7", "V"),
      tonicChord,
    ];
  } else {
    // The next chord is the I that is already written: only ii and V lead into it.
    line = [
      build(mod12(target + 2), minorTarget ? "m7b5" : "m7", "ii"),
      build(mod12(target + 7), "7", "V"),
    ];
  }
  const chords = line.filter((s): s is Suggestion => s !== null);
  if (previousRoot === null) return chords.slice(0, count);
  return chords.slice(Math.max(0, chords.length - count));
}

/** Whether a mode has anything to suggest (an unavailable mode is disabled, never hidden). */
export function modeAvailable(input: Omit<SuggestInput, "mode">, mode: SuggestionMode): boolean {
  return suggestChords({ ...input, mode }).length > 0;
}

/** The chords offered for the syllable's note in the given mode, best first. A mode-4
 *  progression keeps its musical order instead of being sorted. */
export function suggestChords(input: SuggestInput): Suggestion[] {
  const notation = notationFor(input.key, input.writtenChords ?? []);
  if (input.mode === 4) return mode4(input, notation);
  const raw =
    input.mode === 1 ? mode1(input, notation) : input.mode === 2 ? mode2(input, notation) : mode3(input, notation);
  const neighbours = [input.previous, input.next].filter((c): c is string => !!c);
  return sortSuggestions(raw, input.key, neighbours);
}
