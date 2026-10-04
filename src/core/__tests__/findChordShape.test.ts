import { describe, expect, it } from "vitest";
import { findChordShape } from "../findChordShape";

describe("findChordShape", () => {
  it("finds a chord written in parentheses without changing its display text", () => {
    expect(findChordShape("(G)")?.name).toBe("G");
    expect(findChordShape("(F#m7)")?.name).toBe("F♯m7");
  });
});
