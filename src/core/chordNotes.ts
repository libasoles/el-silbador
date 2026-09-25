/**
 * Maps a chord symbol (e.g. "C", "Gm7", "F#dim") to the solfège names of the triad it's built
 * from — root, third, fifth — so they can be shown stacked above the chord itself.
 */

const CHROMATIC_SOLFEGE = ["do", "do#", "re", "re#", "mi", "fa", "fa#", "sol", "sol#", "la", "la#", "si"];

const LETTER_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

const ROOT_RE = /^([A-G])(#|b)?/;

/** Lowercase "m" (not "maj") or "min", case-insensitively, marks a minor chord; a bare "M" is the
 *  (rarer) explicit-major spelling and must NOT be read as minor. */
function isMinor(rest: string): boolean {
  return /^min/i.test(rest) || /^m(?!aj)/.test(rest);
}

function tertianOffsets(rest: string): { third: number; fifth: number } {
  if (/^dim/i.test(rest)) return { third: 3, fifth: 6 };
  if (/^aug/i.test(rest) || rest.startsWith("+")) return { third: 4, fifth: 8 };
  if (isMinor(rest)) return { third: 3, fifth: 7 };
  return { third: 4, fifth: 7 };
}

/** Returns the chord's triad notes low to high (root, third, fifth) as solfège syllables, or
 *  null when `chord` isn't a recognizable chord symbol (including "N.C." and empty text). */
export function chordToNoteNames(chord: string): string[] | null {
  const trimmed = chord.trim();
  const match = ROOT_RE.exec(trimmed);
  if (!match) return null;

  const [full, letter, accidental] = match;
  let rootIndex = LETTER_INDEX[letter]!;
  if (accidental === "#") rootIndex += 1;
  if (accidental === "b") rootIndex -= 1;

  const { third, fifth } = tertianOffsets(trimmed.slice(full.length));

  return [rootIndex, rootIndex + third, rootIndex + fifth].map(
    (index) => CHROMATIC_SOLFEGE[((index % 12) + 12) % 12]!,
  );
}
