import { describe, expect, it, vi } from "vitest";
import { getChordTooltipPosition, subscribeToAnchorPositionUpdates } from "./chordTooltipPositioning";

describe("subscribeToAnchorPositionUpdates", () => {
  it("repositions the portal tooltip when its trigger's scroll container moves", () => {
    const updatePosition = vi.fn();
    const scrollTarget = new EventTarget();
    const resizeTarget = new EventTarget();

    const unsubscribe = subscribeToAnchorPositionUpdates(updatePosition, scrollTarget, resizeTarget);
    scrollTarget.dispatchEvent(new Event("scroll"));

    expect(updatePosition).toHaveBeenCalledOnce();
    unsubscribe();
  });

  it("also repositions after a viewport resize and stops after cleanup", () => {
    const updatePosition = vi.fn();
    const scrollTarget = new EventTarget();
    const resizeTarget = new EventTarget();

    const unsubscribe = subscribeToAnchorPositionUpdates(updatePosition, scrollTarget, resizeTarget);
    resizeTarget.dispatchEvent(new Event("resize"));
    unsubscribe();
    scrollTarget.dispatchEvent(new Event("scroll"));

    expect(updatePosition).toHaveBeenCalledOnce();
  });
});

describe("getChordTooltipPosition", () => {
  it("stays above and centered on its trigger even when the card leaves the viewport", () => {
    const position = getChordTooltipPosition(
      { top: 4, left: -30, width: 24 },
      { width: 120, height: 150 },
    );

    expect(position).toEqual({ top: -154, left: -78 });
  });
});
