import { describe, it, expect } from "vitest";
import { CHORD_SHAPES } from "../chordShapes";
import { getChordPositions } from "../chordPositions";
import { findChordShape } from "../findChordShape";

describe("chord positions sanity", () => {
  it("G major has an open position and a barre alternate", () => {
    const shape = findChordShape("G")!;
    const positions = getChordPositions(shape);
    expect(positions.length).toBe(2);
    expect(positions[0].barres ?? []).toEqual([]);
    expect(positions[1].barres?.length).toBeGreaterThan(0);
  });

  it("F major (already barre) gets an alternate at a different fret", () => {
    const shape = findChordShape("F")!;
    const positions = getChordPositions(shape);
    expect(positions.length).toBe(2);
    expect(positions[1].position).not.toBe(positions[0].position);
  });

  it("a dim7 chord has only one position (no barre-family computation)", () => {
    const shape = findChordShape("Cdim7")!;
    const positions = getChordPositions(shape);
    expect(positions.length).toBe(1);
  });

  it("all 224 chords load without throwing", () => {
    expect(CHORD_SHAPES.length).toBe(224);
    for (const shape of CHORD_SHAPES) {
      expect(() => getChordPositions(shape)).not.toThrow();
    }
  });
});
