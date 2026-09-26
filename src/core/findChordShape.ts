import { CHORD_SHAPES, type ChordShape } from "./chordShapes";

/** Matches the chord chip's free text against the fingering database. Chip text is already
 *  well-formed (e.g. "Bb7", "F#m") from the chords track, so an exact match against the name or
 *  one of its aliases — after normalizing symbols/case — is enough; no fuzzy search needed. */
function normalize(text: string): string {
  return text
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    .replace(/[△Δ]/g, "maj")
    .replace(/ø/g, "m7b5")
    .toLowerCase()
    .replace(/\s+/g, "");
}

const SHAPES_BY_NORMALIZED_NAME = new Map<string, ChordShape>();
for (const shape of CHORD_SHAPES) {
  for (const candidate of [shape.name, ...(shape.aliases ?? [])]) {
    SHAPES_BY_NORMALIZED_NAME.set(normalize(candidate), shape);
  }
}

/** Looks up the fingering shape for a chord chip's text, or null if none is known. */
export function findChordShape(chordText: string): ChordShape | null {
  const normalized = normalize(chordText.trim());
  if (!normalized) return null;
  return SHAPES_BY_NORMALIZED_NAME.get(normalized) ?? null;
}
