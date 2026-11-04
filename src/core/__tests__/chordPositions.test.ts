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

  it("a dim7 chord gets the stored shape plus its 6th- and 5th-string movable shapes", () => {
    const positions = getChordPositions(findChordShape("Cdim7")!);
    expect(positions.length).toBe(3);
    expect(positions[1].fingers[0]).toEqual([6, 8, "2"]);
    expect(positions[2].fingers[1]).toEqual([5, 3, "2"]);
  });

  it("C offers its open shape, the barre shape and the stored 332010 alternate", () => {
    const positions = getChordPositions(findChordShape("C")!);
    expect(positions.length).toBe(3);
    expect(positions[2].fingers).toEqual([[6, 3, "3"], [5, 2, "2"], [4, "o"], [3, "o"], [2, 1, "1"], [1, "o"]]);
    expect(positions[2].name).toBe("C");
  });

  it("Em7 rings the open G and high E strings", () => {
    const { fingers } = findChordShape("Em7")!;
    expect(fingers).toContainEqual([3, "o"]);
    expect(fingers).toContainEqual([1, "o"]);
    expect(fingers).not.toContainEqual([3, "x"]);
  });

  it("all 224 chords load without throwing", () => {
    expect(CHORD_SHAPES.length).toBe(224);
    for (const shape of CHORD_SHAPES) {
      expect(() => getChordPositions(shape)).not.toThrow();
    }
  });
});
