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

  it("a chord's alternatePositions from guitar-chords follow its default shape", () => {
    const shape = findChordShape("C9")!;
    const positions = getChordPositions(shape);
    expect(positions.length).toBe(1 + shape.alternatePositions!.length);
    expect(positions[1].fingers).toEqual(shape.alternatePositions![0].fingers);
    expect(positions[1].name).toBe("C9");
  });

  it("Em7 rings the open G and high E strings", () => {
    const { fingers } = findChordShape("Em7")!;
    expect(fingers).toContainEqual([3, "o"]);
    expect(fingers).toContainEqual([1, "o"]);
    expect(fingers).not.toContainEqual([3, "x"]);
  });

  it("every catalog chord loads without throwing", () => {
    expect(CHORD_SHAPES.length).toBeGreaterThan(200);
    for (const shape of CHORD_SHAPES) {
      expect(() => getChordPositions(shape)).not.toThrow();
    }
  });
});
