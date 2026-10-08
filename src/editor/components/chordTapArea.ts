interface ChordBox {
  left: number;
  width: number;
}

/** How far a chord's tap area reaches past each side of its own box, in px. */
export interface TapAreaReach {
  left: number;
  right: number;
}

/** WCAG 2.5.8's minimum target size, in CSS px. */
export const MIN_TAP_SIZE = 24;

/**
 * The invisible tap area around each tappable chord of a row: at least MIN_TAP_SIZE wide and
 * centered on the chord, so a finger doesn't need to land on a 13px glyph. Two chords whose areas
 * would overlap split the space between them in the middle, and an area never reaches into its
 * neighbor's own box.
 *
 * `boxes` are the chords' boxes on the row, in any order; the result follows the same order.
 */
export function chordTapAreas(boxes: readonly ChordBox[], minSize = MIN_TAP_SIZE): TapAreaReach[] {
  const areas = boxes.map((box) => {
    const right = box.left + box.width;
    const center = box.left + box.width / 2;
    return {
      box,
      start: Math.min(box.left, center - minSize / 2),
      end: Math.max(right, center + minSize / 2),
    };
  });

  const byLeft = [...areas].sort((a, b) => a.box.left - b.box.left);
  for (let i = 1; i < byLeft.length; i++) {
    const prev = byLeft[i - 1];
    const next = byLeft[i];
    if (prev.end <= next.start) continue;
    const prevRight = prev.box.left + prev.box.width;
    const nextLeft = next.box.left;
    // Boxes that already touch or overlap keep just their own box on that side.
    if (prevRight >= nextLeft) {
      prev.end = prevRight;
      next.start = nextLeft;
      continue;
    }
    const middle = (prev.end + next.start) / 2;
    const boundary = Math.min(Math.max(middle, prevRight), nextLeft);
    prev.end = Math.min(prev.end, boundary);
    next.start = Math.max(next.start, boundary);
  }

  return areas.map(({ box, start, end }) => ({
    left: box.left - start,
    right: end - (box.left + box.width),
  }));
}
