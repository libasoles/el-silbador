export interface SlotRect {
  left: number;
  width: number;
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
