import type { PitchDirection } from "../core/types";

/** Pointer displacement of a finished drag, from where it started to where it was released. */
export interface DragDelta {
  dx: number;
  dy: number;
}

/** Shorter vertical drags are treated as an accidental nudge rather than an intent to mark a note. */
export const PITCH_DRAG_THRESHOLD_PX = 12;

/**
 * Reads a drag released outside any drop target as a pitch direction gesture: up or down when the
 * movement is mostly vertical and long enough, otherwise `null` (no gesture).
 */
export function pitchDirectionFromDrag({ dx, dy }: DragDelta): PitchDirection | null {
  if (Math.abs(dy) < PITCH_DRAG_THRESHOLD_PX || Math.abs(dy) <= Math.abs(dx)) return null;
  return dy < 0 ? "up" : "down";
}
