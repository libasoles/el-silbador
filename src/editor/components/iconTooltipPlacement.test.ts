import { describe, expect, it } from "vitest";
import { getIconTooltipPlacement } from "./iconTooltipPlacement";

const viewport = { width: 360 };

describe("getIconTooltipPlacement", () => {
  it("opens on the preferred side when it fits", () => {
    expect(getIconTooltipPlacement({ left: 300, right: 330, width: 30 }, 120, viewport)).toEqual({
      side: "left",
      shift: 0,
    });
  });

  it("opens on the other side of a button at the screen's left edge", () => {
    expect(getIconTooltipPlacement({ left: 16, right: 46, width: 30 }, 120, viewport)).toEqual({
      side: "right",
      shift: 0,
    });
  });

  it("drops below, slid back on screen, when neither side fits", () => {
    expect(getIconTooltipPlacement({ left: 16, right: 46, width: 30 }, 320, viewport)).toEqual({
      side: "bottom",
      shift: 137,
    });
  });

  it("keeps a below-preferring tooltip below", () => {
    expect(
      getIconTooltipPlacement({ left: 150, right: 180, width: 30 }, 60, viewport, "bottom"),
    ).toEqual({ side: "bottom", shift: 0 });
  });

  it("keeps an above-preferring tooltip above, slid back on screen", () => {
    expect(
      getIconTooltipPlacement({ left: 16, right: 46, width: 30 }, 120, viewport, "top"),
    ).toEqual({ side: "top", shift: 37 });
  });
});
