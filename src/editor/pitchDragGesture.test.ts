import { describe, expect, it } from "vitest";
import { pitchDirectionFromDrag } from "./pitchDragGesture";

describe("pitchDirectionFromDrag", () => {
  it("maps an upward drag to up and a downward drag to down", () => {
    expect(pitchDirectionFromDrag({ dx: 2, dy: -30 })).toBe("up");
    expect(pitchDirectionFromDrag({ dx: -2, dy: 30 })).toBe("down");
  });

  it("ignores drags shorter than the threshold", () => {
    expect(pitchDirectionFromDrag({ dx: 0, dy: 11 })).toBeNull();
    expect(pitchDirectionFromDrag({ dx: 0, dy: -11 })).toBeNull();
  });

  it("ignores drags that are not mostly vertical", () => {
    expect(pitchDirectionFromDrag({ dx: 40, dy: 20 })).toBeNull();
    expect(pitchDirectionFromDrag({ dx: -20, dy: 20 })).toBeNull();
  });
});
