import { describe, expect, it } from "vitest";
import {
  buildSong,
  columnForSlot,
  endSlotId,
  endSlotIds,
  getLineCellSlots,
  isLineEdgeSlot,
  startSlotId,
  startSlotIds,
} from "../model";
import type { CellsByTrack } from "../types";

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

describe("startSlotIds / endSlotIds", () => {
  it("offers a single empty slot when the line has no leading or trailing chords yet", () => {
    const [line] = buildSong("Deliro con");
    expect(startSlotIds(line, {})).toEqual([startSlotId(line.id)]);
    expect(endSlotIds(line, {})).toEqual([endSlotId(line.id)]);
  });

  it("appends one more empty slot for every already-filled one, nearest-to-syllable first", () => {
    const [line] = buildSong("Deliro con");
    const cells: CellsByTrack = {
      chords: {
        [startSlotId(line.id)]: "C",
        [startSlotId(line.id, 1)]: "G",
        [endSlotId(line.id)]: "Am",
      },
    };
    expect(startSlotIds(line, cells)).toEqual([
      startSlotId(line.id),
      startSlotId(line.id, 1),
      startSlotId(line.id, 2),
    ]);
    expect(endSlotIds(line, cells)).toEqual([endSlotId(line.id), endSlotId(line.id, 1)]);
  });

  it("stops at the first empty index even if a further one is (stale) filled", () => {
    const [line] = buildSong("Deliro con");
    const cells: CellsByTrack = {
      chords: {
        [startSlotId(line.id, 2)]: "G",
      },
    };
    expect(startSlotIds(line, cells)).toEqual([startSlotId(line.id)]);
  });
});

describe("getLineCellSlots with cells", () => {
  it("renders the leading chain farthest-first and the trailing chain nearest-first", () => {
    const [line] = buildSong("Hola");
    const cells: CellsByTrack = {
      chords: {
        [startSlotId(line.id)]: "C",
        [startSlotId(line.id, 1)]: "G",
      },
    };
    const slots = getLineCellSlots(line, new Set(), cells);
    // Two leading chords means a third, still-empty, slot is appended as the next dropzone —
    // rendered farthest from the syllable, i.e. first.
    expect(slots[0]).toBe(startSlotId(line.id, 2));
    expect(slots[1]).toBe(startSlotId(line.id, 1));
    expect(slots[2]).toBe(startSlotId(line.id));
  });
});

describe("isLineEdgeSlot", () => {
  it("matches every index of a line's start/end slots and nothing else", () => {
    const [line] = buildSong("Hola");
    expect(isLineEdgeSlot(line.id, startSlotId(line.id))).toBe(true);
    expect(isLineEdgeSlot(line.id, startSlotId(line.id, 3))).toBe(true);
    expect(isLineEdgeSlot(line.id, endSlotId(line.id, 2))).toBe(true);
    expect(isLineEdgeSlot(line.id, "before:someSyllable")).toBe(false);
    expect(isLineEdgeSlot(line.id, startSlotId("other-line"))).toBe(false);
  });
});
