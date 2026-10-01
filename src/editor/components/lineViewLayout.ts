export interface SlotRect {
  left: number;
  width: number;
}

/** The leading slot's annotation is onset-aligned, so its narrow measured cell can reach into
 * the first syllable. Mirror the trailing slot's own width, but grow outward instead. */
export function edgeDropZoneRect(edge: "start" | "end", rect: SlotRect): SlotRect {
  if (edge === "end") return rect;
  return {
    // Its right edge stops at the annotation's left edge, rather than inheriting the measured
    // cell's right edge, which can extend into the lyric's first syllable.
    left: rect.left - rect.width,
    width: rect.width,
  };
}

/** Measurements are recreated on each pass; only commit them when their geometry changed. */
export function haveEqualSlotRects(
  previous: Record<string, SlotRect>,
  next: Record<string, SlotRect>,
): boolean {
  const previousKeys = Object.keys(previous);
  const nextKeys = Object.keys(next);
  return (
    previousKeys.length === nextKeys.length &&
    nextKeys.every((key) => previous[key]?.left === next[key]?.left && previous[key]?.width === next[key]?.width)
  );
}
