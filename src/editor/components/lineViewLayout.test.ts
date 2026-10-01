import { describe, expect, it } from "vitest";
import { edgeDropZoneRect, haveEqualSlotRects } from "./lineViewLayout";

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
  it("expands a leading dropzone outward so its highlight cannot overlap the first syllable", () => {
    expect(edgeDropZoneRect("start", { left: -6, width: 14 })).toEqual({ left: -46, width: 40 });
  });
});
