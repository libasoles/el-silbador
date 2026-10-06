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
  const viewport = { width: 360, height: 640 };

  it("sits above its trigger, centered, when there is room", () => {
    const position = getChordTooltipPosition(
      { top: 300, left: 150, width: 24, height: 20 },
      { width: 120, height: 150 },
      viewport,
    );

    expect(position).toEqual({ top: 142, left: 102 });
  });

  it("opens below a trigger near the top of the screen", () => {
    const position = getChordTooltipPosition(
      { top: 60, left: 150, width: 24, height: 20 },
      { width: 120, height: 150 },
      viewport,
    );

    expect(position).toEqual({ top: 88, left: 102 });
  });

  it("slides sideways to stay on screen next to a trigger at the edge", () => {
    const nearLeft = getChordTooltipPosition(
      { top: 300, left: 10, width: 24, height: 20 },
      { width: 120, height: 150 },
      viewport,
    );
    const nearRight = getChordTooltipPosition(
      { top: 300, left: 330, width: 24, height: 20 },
      { width: 120, height: 150 },
      viewport,
    );

    expect(nearLeft.left).toBe(8);
    expect(nearRight.left).toBe(234);
  });

  it("stays attached to a trigger that has scrolled out of view", () => {
    const position = getChordTooltipPosition(
      { top: -40, left: -30, width: 24, height: 20 },
      { width: 120, height: 150 },
      viewport,
    );

    expect(position).toEqual({ top: -12, left: -30 });
  });
});
