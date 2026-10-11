import { CHORD_SHAPES, type ChordShape } from "./chordShapes";

/** Matches the chord chip's free text against the fingering database. Chip text is already
 *  well-formed (e.g. "Bb7", "F#m") from the chords track, so an exact match against the name or
 *  one of its aliases — after normalizing symbols — is enough; no fuzzy search needed. Case is
 *  preserved because it's meaningful: "m7" (minor 7th) and "M7"/"maj7" (major 7th) must not
 *  collide, e.g. "Em7" vs "Emaj7"'s "EM7" alias. */
function normalize(text: string): string {
  return text
    .replace(/[()]/g, "")
    .replace(/♭/g, "b")
    .replace(/♯/g, "#")
    .replace(/[△Δ]/g, "maj")
    .replace(/ø/g, "m7b5")
    .replace(/°/g, "dim")
    .replace(/\s+/g, "");
}

const SHAPES_BY_NORMALIZED_NAME = new Map<string, ChordShape>();
for (const shape of CHORD_SHAPES) {
  for (const candidate of [shape.name, ...(shape.aliases ?? [])]) {
    const normalized = normalize(candidate);
    SHAPES_BY_NORMALIZED_NAME.set(normalized, shape);
    // The catalog uses dim7 fingerings for bare dim too. Apply that convention to
    // every enharmonic alias, including those without an explicit bare-dim entry.
    if (normalized.endsWith("dim7")) {
      SHAPES_BY_NORMALIZED_NAME.set(normalized.slice(0, -1), shape);
    }
  }
}

/** Looks up the fingering shape for a chord chip's text, or null if none is known.
 *  Parentheses are notation-only (e.g. an optional "(G)") and remain in the displayed text. */
export function findChordShape(chordText: string): ChordShape | null {
  const normalized = normalize(chordText.trim());
  if (!normalized) return null;
  return SHAPES_BY_NORMALIZED_NAME.get(normalized) ?? null;
}
