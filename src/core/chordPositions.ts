import type { ChordShape, Finger } from "./chordShapes";

/**
 * Alternate fretboard positions for a chord. Many chords (major, minor, dom7, m7) can be played
 * in more than one place on the neck: in open position, or as a movable barre shape based on the
 * open E chord (barre on the 6th string) or the open A chord (barre on the 5th). `chordShapes.ts`
 * only stores one fingering per chord (the one shown by default); this module computes, from that
 * shape and the chord's name, a second "alternate" position using whichever barre shape isn't
 * already in use. Ported from the sibling cancionero project's chord-positions.js.
 */

const NOTE_INDEX: Record<string, number> = {
  C: 0,
  "B♯": 0,
  "C♯": 1,
  "D♭": 1,
  D: 2,
  "D♯": 3,
  "E♭": 3,
  E: 4,
  "F♭": 4,
  F: 5,
  "E♯": 5,
  "F♯": 6,
  "G♭": 6,
  G: 7,
  "G♯": 8,
  "A♭": 8,
  A: 9,
  "A♯": 10,
  "B♭": 10,
  B: 11,
  "C♭": 11,
};

type BarreFamily = "major" | "minor" | "dom7" | "m7";

/** Extra notes on top of the barre for each family's E-shape/A-shape template, as
 *  [string, fret-relative-to-the-barre]. Strings not listed are covered by the barre itself. */
const SHAPES: Record<BarreFamily, { E: [number, number][]; A: [number, number][] }> = {
  major: { E: [[3, 1], [4, 2], [5, 2]], A: [[2, 2], [3, 2], [4, 2]] },
  minor: { E: [[4, 2], [5, 2]], A: [[2, 1], [3, 2], [4, 2]] },
  dom7: { E: [[3, 1], [5, 2]], A: [[2, 2], [4, 2]] },
  m7: { E: [[5, 2]], A: [[2, 1], [4, 2]] },
};

function rootPitchClass(name: string): number | null {
  const match = /^([A-G][♯♭]?)/.exec(name ?? "");
  if (!match) return null;
  return NOTE_INDEX[match[1]] ?? null;
}

function barreFamilyOf(shape: ChordShape): BarreFamily | null {
  for (const family of shape.families ?? []) {
    if (family === "major" || family === "minor" || family === "dom7" || family === "m7") return family;
  }
  return null;
}

function buildAlternateShape(shape: ChordShape, family: BarreFamily, shapeKey: "E" | "A", fret: number): ChordShape {
  const items: { string: number; rel: number; mute?: boolean }[] = SHAPES[family][shapeKey].map(
    ([string, rel]) => ({ string, rel }),
  );
  if (shapeKey === "A") items.push({ string: 6, rel: 0, mute: true });

  const ranked = items
    .filter((item) => !item.mute)
    .slice()
    .sort((a, b) => (a.rel !== b.rel ? a.rel - b.rel : b.string - a.string));
  const labelByString = new Map<number, string>();
  ranked.forEach((item, index) => labelByString.set(item.string, String(index + 2)));

  const fingers: Finger[] = items
    .slice()
    .sort((a, b) => b.string - a.string)
    .map((item) => (item.mute ? [item.string, "x"] : [item.string, fret + item.rel, labelByString.get(item.string)]));

  return {
    ...shape,
    position: fret,
    barres: [{ fromString: shapeKey === "E" ? 6 : 5, toString: 1, fret }],
    fingers,
  };
}

function computeAlternate(shape: ChordShape): ChordShape | null {
  const family = barreFamilyOf(shape);
  if (!family) return null;

  const pitchClass = rootPitchClass(shape.name);
  if (pitchClass == null) return null;

  const fretForE = (pitchClass - 4 + 12) % 12;
  const fretForA = (pitchClass - 9 + 12) % 12;

  if (shape.barres && shape.barres.length > 0) {
    const usedShapeKey = shape.barres[0].fromString === 6 ? "E" : "A";
    const altShapeKey = usedShapeKey === "E" ? "A" : "E";
    const altFret = altShapeKey === "E" ? fretForE : fretForA;
    if (!altFret) return null;
    return buildAlternateShape(shape, family, altShapeKey, altFret);
  }

  const candidates: { shapeKey: "E" | "A"; fret: number }[] = [];
  if (fretForE) candidates.push({ shapeKey: "E", fret: fretForE });
  if (fretForA) candidates.push({ shapeKey: "A", fret: fretForA });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => (a.fret !== b.fret ? a.fret - b.fret : a.shapeKey === "E" ? -1 : 1));
  return buildAlternateShape(shape, family, candidates[0].shapeKey, candidates[0].fret);
}

/** Movable dim7 fingerings, rooted on the 6th or the 5th string. The chord is symmetric (every
 *  minor third repeats it), so each shape slides to any root. Ported from the sibling
 *  guitar-chords project's chord-positions.js. */
function dim7Shape(shape: ChordShape, pitchClass: number, rootString: 6 | 5): ChordShape {
  let rootFret = (pitchClass - (rootString === 6 ? 4 : 9) + 12) % 12;
  // These shapes need frets below the root, so the open-position cycle is skipped.
  if (rootFret < 2) rootFret += 12;
  const fingers: Finger[] =
    rootString === 6
      ? [[6, rootFret, "2"], [5, "x"], [4, rootFret - 1, "1"], [3, rootFret, "3"], [2, rootFret - 1, "1"], [1, "x"]]
      : [[6, "x"], [5, rootFret, "2"], [4, "x"], [3, rootFret - 1, "1"], [2, rootFret + 1, "3"], [1, rootFret - 1, "1"]];
  return { ...shape, alternatePositions: undefined, barres: [], position: rootFret - 1, fingers };
}

/**
 * Returns the fingering positions available for a chord: its default shape, plus — for major,
 * minor, dom7 and m7 chords — a second, movable-barre position, then any `alternatePositions`
 * stored with the chord. A dim7 chord gets its two movable shapes instead of the barre position.
 */
export function getChordPositions(shape: ChordShape): ChordShape[] {
  const base: ChordShape = { ...shape, alternatePositions: undefined };
  const pitchClass = rootPitchClass(shape.name);
  if (/dim7$/.test(shape.name) && pitchClass != null) {
    return [base, dim7Shape(shape, pitchClass, 6), dim7Shape(shape, pitchClass, 5)];
  }
  const alternate = computeAlternate(shape);
  const stored = (shape.alternatePositions ?? []).map((position) => ({
    ...base,
    barres: undefined,
    position: undefined,
    ...position,
  }));
  return [base, ...(alternate ? [alternate] : []), ...stored];
}
