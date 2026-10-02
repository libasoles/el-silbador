import { describe, expect, it } from "vitest";
import {
  beforeSlotId,
  buildSong,
  chordSlotForColumn,
  columnForSlot,
  endSlotId,
  endSlotIds,
  flattenSyllables,
  gapSlotId,
  getLineCellSlots,
  isLineEdgeSlot,
  mergeKey,
  reconcileWordSyllables,
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
    // 6, 10 and 13 are the whitespace gaps after "Deliro", "con" and "la".
    expect(columns).toEqual([0, 2, 4, 6, 7, 10, 11, 13, 14, 17, 19]);
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

describe("word-gap slots", () => {
  it("adds one slot per whitespace gap, right after the word before it", () => {
    const [line] = buildSong("uno dos");
    const syllables = flattenSyllables(line);
    const lastOfUno = line.words[0].syllables.at(-1)!;
    expect(getLineCellSlots(line, new Set())).toEqual([
      startSlotId(line.id),
      ...syllables.slice(0, line.words[0].syllables.length).map((s) => beforeSlotId(s.id)),
      gapSlotId(lastOfUno.id),
      ...syllables.slice(line.words[0].syllables.length).map((s) => beforeSlotId(s.id)),
      endSlotId(line.id),
    ]);
  });

  it("has no gap slot where a melisma joins two words", () => {
    const [line] = buildSong("uno dos");
    const lastOfUno = line.words[0].syllables.at(-1)!;
    const firstOfDos = line.words[1].syllables[0];
    const slots = getLineCellSlots(line, new Set([mergeKey(lastOfUno.id, firstOfDos.id)]));
    expect(slots).not.toContain(gapSlotId(lastOfUno.id));
  });

  it("maps a chord written over the whitespace between words to that gap", () => {
    const text = "uno dos";
    const [line] = buildSong(text);
    const lastOfUno = line.words[0].syllables.at(-1)!;
    expect(chordSlotForColumn(line, text, 3)).toBe(gapSlotId(lastOfUno.id));
    expect(chordSlotForColumn(line, text, 4)).toBe(beforeSlotId(line.words[1].syllables[0].id));
  });
});

describe("reconcileWordSyllables", () => {
  const syl = (id: string, text: string) => ({ id, text });

  it("reuses the id of a syllable whose text changed in place", () => {
    const old = [syl("a", "sas")];

    const { syllables, droppedIds, carryOvers } = reconcileWordSyllables(old, ["as"]);

    expect(syllables).toEqual([syl("a", "as")]);
    expect(droppedIds).toEqual([]);
    expect(carryOvers).toEqual([]);
  });

  it("reuses ids positionally in the changed middle and carries leftovers to the last reused syllable", () => {
    const old = [syl("can", "can"), syl("cio", "cio"), syl("nes", "nes")];

    const { syllables, droppedIds, carryOvers } = reconcileWordSyllables(old, ["can", "ción"]);

    expect(syllables).toEqual([syl("can", "can"), syl("cio", "ción")]);
    expect(droppedIds).toEqual(["nes"]);
    expect(carryOvers).toEqual([{ fromId: "nes", toId: "cio" }]);
  });

  it("carries a trailing deleted syllable to the last kept syllable before it", () => {
    const old = [syl("ma", "ma"), syl("ri", "ri"), syl("po", "po"), syl("sa", "sa")];

    const { syllables, carryOvers } = reconcileWordSyllables(old, ["ma", "ri"]);

    expect(syllables.map((s) => s.id)).toEqual(["ma", "ri"]);
    expect(carryOvers).toEqual([
      { fromId: "po", toId: "ri" },
      { fromId: "sa", toId: "ri" },
    ]);
  });

  it("carries a deleted first syllable to the next kept syllable", () => {
    const old = [syl("a", "a"), syl("mor", "mor"), syl("ci", "ci"), syl("to", "to")];

    const { syllables, droppedIds, carryOvers } = reconcileWordSyllables(old, ["mor", "ci", "to"]);

    expect(syllables.map((s) => s.id)).toEqual(["mor", "ci", "to"]);
    expect(droppedIds).toEqual(["a"]);
    expect(carryOvers).toEqual([{ fromId: "a", toId: "mor" }]);
  });

  it("builds new syllables when the word gains syllables, reusing the old ids first", () => {
    const old = [syl("pes", "pes"), syl("ca", "ca"), syl("dor", "dor")];

    const { syllables, droppedIds, carryOvers } = reconcileWordSyllables(old, ["pes", "ca", "do", "res"]);

    expect(syllables.map((s) => s.text)).toEqual(["pes", "ca", "do", "res"]);
    expect(syllables.slice(0, 3).map((s) => s.id)).toEqual(["pes", "ca", "dor"]);
    expect(syllables[3].id).not.toBe("dor");
    expect(droppedIds).toEqual([]);
    expect(carryOvers).toEqual([]);
  });
});
