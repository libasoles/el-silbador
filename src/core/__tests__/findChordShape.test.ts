import { describe, expect, it } from "vitest";
import { findChordShape } from "../findChordShape";

describe("findChordShape", () => {
  it.each(["C", "C#", "Db", "D", "D#", "Eb", "E", "F", "F#", "Gb", "G", "G#", "Ab", "A", "A#", "Bb", "B"])(
    "finds diminished diagrams written with ° for %s",
    (root) => {
      const shape = findChordShape(`${root}dim7`);
      expect(shape).not.toBeNull();
      expect(findChordShape(`${root}°`)).toBe(shape);
      expect(findChordShape(`${root}°7`)).toBe(shape);
    },
  );

  it("finds a chord written in parentheses without changing its display text", () => {
    expect(findChordShape("(G)")?.name).toBe("G");
    expect(findChordShape("(F#m7)")?.name).toBe("F♯m7");
  });
});
