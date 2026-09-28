import { describe, expect, it } from "vitest";
import { buildSong, columnForSlot, endSlotId, getLineCellSlots, startSlotId } from "../model";

describe("columnForSlot", () => {
  it("returns 0 for a line's start slot", () => {
    const [line] = buildSong("Deliro con la falsía");
    expect(columnForSlot(line, startSlotId(line.id))).toBe(0);
  });

  it("returns the column of each syllable's before-slot, matching the line's plain text", () => {
    const [line] = buildSong("Deliro con la falsía");
    const slots = getLineCellSlots(line, new Set());
    // Drop the start/end bookends; every syllable slot in between should report where its own
    // text begins in "Deliro con la falsía".
    const syllableSlots = slots.filter(
      (slotId) => slotId !== startSlotId(line.id) && slotId !== endSlotId(line.id),
    );
    const columns = syllableSlots.map((slotId) => columnForSlot(line, slotId));
    expect(columns).toEqual([0, 2, 4, 7, 11, 14, 17, 19]);
  });

  it("returns the full line length for the end slot", () => {
    const [line] = buildSong("Deliro con");
    expect(columnForSlot(line, endSlotId(line.id))).toBe("Deliro con".length);
  });
});
