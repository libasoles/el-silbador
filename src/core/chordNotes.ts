/**
 * Maps a chord symbol (e.g. "C", "Gm7", "F#dim") to the solfège names of the notes it's built
 * from — root, third, fifth, and (for a seventh chord) seventh — so they can be shown stacked
 * above the chord itself.
 */

const CHROMATIC_SOLFEGE = ["do", "do#", "re", "re#", "mi", "fa", "fa#", "sol", "sol#", "la", "la#", "si"];

const LETTER_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const ROOT_RE = /^([A-G])(#|b)?/;

type Quality = "major" | "minor" | "diminished" | "augmented";

const TRIAD_OFFSETS: Record<Quality, { third: number; fifth: number }> = {
  major: { third: 4, fifth: 7 },
  minor: { third: 3, fifth: 7 },
  diminished: { third: 3, fifth: 6 },
  augmented: { third: 4, fifth: 8 },
};

/** Lowercase "m" (not "maj") or "min", case-insensitively, marks a minor chord; a bare "M" is the
 *  (rarer) explicit-major spelling and must NOT be read as minor. */
function isMinor(rest: string): boolean {
  return /^min/i.test(rest) || /^m(?!aj)/.test(rest);
}

function chordQuality(rest: string): Quality {
  if (/^dim/i.test(rest)) return "diminished";
  if (/^aug/i.test(rest) || rest.startsWith("+")) return "augmented";
  if (isMinor(rest)) return "minor";
  return "major";
}

/** A "7" anywhere in the quality/extension text adds a seventh: a whole step below the root for
 *  a diminished chord (fully diminished 7th), a half step below for an explicit major 7th
 *  ("maj7"/"M7"), and a whole step below otherwise (dominant or minor 7th — same interval). */
function seventhOffset(rest: string, quality: Quality): number | null {
  if (!/7/.test(rest)) return null;
  if (quality === "diminished") return 9;
  if (/maj7/i.test(rest) || /^M7/.test(rest)) return 11;
  return 10;
}

/** Returns the chord's notes low to high (root, third, fifth, and seventh if present) as
 *  solfège syllables, or null when `chord` isn't a recognizable chord symbol (including "N.C."
 *  and empty text). */
export function chordToNoteNames(chord: string): string[] | null {
  const trimmed = chord.trim();
  const match = ROOT_RE.exec(trimmed);
  if (!match) return null;

  const [full, letter, accidental] = match;
  let rootIndex = LETTER_INDEX[letter]!;
  if (accidental === "#") rootIndex += 1;
  if (accidental === "b") rootIndex -= 1;

  const rest = trimmed.slice(full.length);
  const quality = chordQuality(rest);
  const { third, fifth } = TRIAD_OFFSETS[quality];
  const seventh = seventhOffset(rest, quality);

  const offsets = seventh === null ? [0, third, fifth] : [0, third, fifth, seventh];
  return offsets.map((offset) => CHROMATIC_SOLFEGE[((rootIndex + offset) % 12 + 12) % 12]!);
}

/** For each slot (given in document order) that holds a recognizable chord, this notes the
 *  *previous* such slot's notes — so a chord can highlight the notes it shares with the one
 *  before it. `chordAt` looks up the chord text written in a given slot. */
export function previousChordNotesBySlot(
  orderedSlotIds: string[],
  chordAt: (slotId: string) => string,
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  let previous: string[] | null = null;
  for (const slotId of orderedSlotIds) {
    const notes = chordToNoteNames(chordAt(slotId));
    if (!notes) continue;
    if (previous) result.set(slotId, previous);
    previous = notes;
  }
  return result;
}
