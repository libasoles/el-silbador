import { describe, expect, it } from "vitest";
import { areSlotRectsReady, edgeDropZoneRect, haveEqualSlotRects } from "./lineViewLayout";

describe("areSlotRectsReady", () => {
  it("keeps annotations hidden until every slot in their row has measured geometry", () => {
    expect(
      areSlotRectsReady(["line-1:start", "line-1:syllable-a"], { "line-1:start": { left: -6, width: 14 } }),
    ).toBe(false);
    expect(
      areSlotRectsReady(["line-1:start", "line-1:syllable-a"], {
        "line-1:start": { left: -6, width: 14 },
        "line-1:syllable-a": { left: 0, width: 20 },
      }),
    ).toBe(true);
  });
});

describe("haveEqualSlotRects", () => {
  it("treats a fresh measurement with unchanged geometry as unchanged", () => {
    expect(
      haveEqualSlotRects(
        { "line-1:start": { left: -6, width: 14 }, "line-1:end": { left: 62, width: 14 } },
        { "line-1:start": { left: -6, width: 14 }, "line-1:end": { left: 62, width: 14 } },
      ),
    ).toBe(true);
  });
});

describe("edgeDropZoneRect", () => {
  it("uses the trailing slot's width and grows the leading highlight outward", () => {
    expect(edgeDropZoneRect("start", { left: -6, width: 14 })).toEqual({ left: -20, width: 14 });
  });
});
