import { describe, expect, it } from "vitest";
import { haveEqualSlotRects } from "./lineViewLayout";

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
