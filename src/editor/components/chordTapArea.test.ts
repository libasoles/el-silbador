import { describe, expect, it } from "vitest";
import { chordTapAreas } from "./chordTapArea";

describe("chordTapAreas", () => {
  it("widens a narrow chord to 24px, centered on it", () => {
    expect(chordTapAreas([{ left: 100, width: 14 }])).toEqual([{ left: 5, right: 5 }]);
  });

  it("leaves a chord already 24px wide or more as it is", () => {
    expect(chordTapAreas([{ left: 100, width: 30 }])).toEqual([{ left: 0, right: 0 }]);
  });

  it("gives chords far apart their full 24px", () => {
    expect(chordTapAreas([{ left: 0, width: 14 }, { left: 100, width: 14 }])).toEqual([
      { left: 5, right: 5 },
      { left: 5, right: 5 },
    ]);
  });

  it("splits the space between two close chords in the middle, without overlapping", () => {
    // Boxes [0, 14] and [18, 32]: both want 5px more on the facing side, but only 4px are free.
    const [first, second] = chordTapAreas([{ left: 0, width: 14 }, { left: 18, width: 14 }]);

    expect(first).toEqual({ left: 5, right: 2 });
    expect(second).toEqual({ left: 2, right: 5 });
    expect(0 + 14 + first.right).toBeLessThanOrEqual(18 - second.left);
  });

  it("never reaches into a neighbor's own box", () => {
    const [first, second] = chordTapAreas([{ left: 0, width: 14 }, { left: 14, width: 14 }]);

    expect(first.right).toBe(0);
    expect(second.left).toBe(0);
  });

  it("works on chords given out of order", () => {
    const [later, earlier] = chordTapAreas([{ left: 18, width: 14 }, { left: 0, width: 14 }]);

    expect(earlier).toEqual({ left: 5, right: 2 });
    expect(later).toEqual({ left: 2, right: 5 });
  });
});
