import { beforeEach, describe, expect, it } from "vitest";
import { beforeSlotId, flattenSyllables } from "../model";
import { createInitialState, editorReducer, getCell, type Action } from "../state";
import type { EditorState } from "../types";

function reduce(state: EditorState, ...actions: Action[]): EditorState {
  return actions.reduce(editorReducer, state);
}

describe("pitch direction indicators", () => {
  let state: EditorState;
  let slots: string[];

  beforeEach(() => {
    state = reduce(createInitialState(), { type: "setLyricsText", text: "amor y paz" });
    slots = flattenSyllables(state.song[0]).map((syllable) => beforeSlotId(syllable.id));
    state = reduce(
      state,
      { type: "setCellText", trackId: "vocalNotes", slotId: slots[0], text: "re" },
      { type: "setCellText", trackId: "vocalNotes", slotId: slots[1], text: "re" },
    );
  });

  it("sets, keeps and clears the indicator from drag directions", () => {
    const drag = (direction: "up" | "down"): Action => ({ type: "dragPitchDirection", slotId: slots[1], direction });

    state = reduce(state, drag("down"));
    expect(state.pitchDirections[slots[1]]).toBe("down");

    state = reduce(state, drag("down"));
    expect(state.pitchDirections[slots[1]]).toBe("down");

    state = reduce(state, drag("up"));
    expect(state.pitchDirections[slots[1]]).toBeUndefined();

    state = reduce(state, drag("up"));
    expect(state.pitchDirections[slots[1]]).toBe("up");
  });

  it("ignores a drag on an empty note", () => {
    const next = reduce(state, { type: "dragPitchDirection", slotId: slots[2], direction: "up" });
    expect(next.pitchDirections).toEqual({});
  });

  it("clears the indicator when its note is emptied", () => {
    state = reduce(
      state,
      { type: "dragPitchDirection", slotId: slots[1], direction: "up" },
      { type: "setCellText", trackId: "vocalNotes", slotId: slots[1], text: "" },
    );
    expect(state.pitchDirections).toEqual({});
  });

  it("moves the indicator along with its note", () => {
    state = reduce(
      state,
      { type: "dragPitchDirection", slotId: slots[1], direction: "down" },
      { type: "moveCellText", trackId: "vocalNotes", fromSlotId: slots[1], toSlotId: slots[2] },
    );
    expect(state.pitchDirections).toEqual({ [slots[2]]: "down" });
  });

  it("does not move an indicator when a chord moves", () => {
    state = reduce(
      state,
      { type: "dragPitchDirection", slotId: slots[1], direction: "down" },
      { type: "setCellText", trackId: "chords", slotId: slots[1], text: "G" },
      { type: "moveCellText", trackId: "chords", fromSlotId: slots[1], toSlotId: slots[2] },
    );
    expect(state.pitchDirections).toEqual({ [slots[1]]: "down" });
  });

  it("drops a merged-away note's indicator when the anchor's own note wins", () => {
    const [first, second] = flattenSyllables(state.song[0]);
    state = reduce(
      state,
      { type: "dragPitchDirection", slotId: slots[1], direction: "up" },
      { type: "toggleSyllableMerge", lineId: state.song[0].id, aId: first.id, bId: second.id },
    );
    expect(getCell(state.cells, "vocalNotes", slots[0])).toBe("re");
    expect(state.pitchDirections).toEqual({});
  });

  it("is reset when the lyrics are replaced", () => {
    state = reduce(
      state,
      { type: "dragPitchDirection", slotId: slots[1], direction: "up" },
      { type: "setLyricsText", text: "otra" },
    );
    expect(state.pitchDirections).toEqual({});
  });
});
