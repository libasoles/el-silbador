import { describe, expect, it } from "vitest";
import {
  beforeSlotId,
  buildSong,
  chordSlotForColumn,
  columnForSlot,
  endSlotId,
  flattenSyllables,
  gapSlotId,
  getLineCellSlots,
  mergeKey,
  startSlotId,
} from "../model";

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
