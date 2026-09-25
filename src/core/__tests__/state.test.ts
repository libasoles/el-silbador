import { beforeEach, describe, expect, it, vi } from "vitest";
import { beforeSlotId, flattenSyllables, getLineCellSlots, getLineUnits } from "../model";
import { YPACARAI_LYRICS } from "../fixtures/ypacarai";
import { createInitialState, editorReducer, getCell, type Action } from "../state";
import type { EditorState } from "../types";

function reduce(state: EditorState, ...actions: Action[]): EditorState {
  return actions.reduce(editorReducer, state);
}

describe("setLyricsText", () => {
  it("hyphenates every word of every line, preserving line order", () => {
    const state = reduce(createInitialState(), {
      type: "setLyricsText",
      text: YPACARAI_LYRICS,
    });

    expect(state.song).toHaveLength(YPACARAI_LYRICS.split("\n").length);
    expect(state.song[0].words.map((w) => w.syllables.map((s) => s.text))).toEqual([
      ["U", "na"],
      ["no", "che"],
      ["ti", "bia"],
      ["nos"],
      ["co", "no", "ci", "mos"],
    ]);
    expect(state.song[1].words[5].syllables.map((s) => s.text)).toEqual(["Y", "pa", "ca", "ra", "í"]);
  });
});

describe("cell tracks (pista Acordes)", () => {
  let state: EditorState;
  let firstLineSlots: string[];

  beforeEach(() => {
    state = reduce(createInitialState(), { type: "setLyricsText", text: "amor y paz" });
    firstLineSlots = getLineCellSlots(state.song[0], state.merges);
  });

  it("addresses pre, between, and post cells independently", () => {
    const [pre, between1, between2, post] = firstLineSlots;

    state = reduce(
      state,
      { type: "setCellText", trackId: "chords", slotId: pre, text: "G7" },
      { type: "setCellText", trackId: "chords", slotId: between1, text: "Dm" },
      { type: "setCellText", trackId: "chords", slotId: between2, text: "C" },
      { type: "setCellText", trackId: "chords", slotId: post, text: "F" },
    );

    expect(getCell(state.cells, "chords", pre)).toBe("G7");
    expect(getCell(state.cells, "chords", between1)).toBe("Dm");
    expect(getCell(state.cells, "chords", between2)).toBe("C");
    expect(getCell(state.cells, "chords", post)).toBe("F");
  });

  it("moveCellText moves text and empties the origin", () => {
    const [pre, , , post] = firstLineSlots;
    state = reduce(state, { type: "setCellText", trackId: "chords", slotId: pre, text: "G7" });
    state = reduce(state, { type: "moveCellText", trackId: "chords", fromSlotId: pre, toSlotId: post });

    expect(getCell(state.cells, "chords", pre)).toBe("");
    expect(getCell(state.cells, "chords", post)).toBe("G7");
  });
});

describe("toggleSyllableMerge", () => {
  let state: EditorState;

  beforeEach(() => {
    state = reduce(createInitialState(), { type: "setLyricsText", text: "canción" });
  });

  it("toggles a melisma on and off between adjacent syllables", () => {
    const [aId, bId] = flattenSyllables(state.song[0]).map((s) => s.id);
    const lineId = state.song[0].id;

    state = reduce(state, { type: "toggleSyllableMerge", lineId, aId, bId });
    expect(getLineUnits(state.song[0], state.merges)).toHaveLength(1);

    state = reduce(state, { type: "toggleSyllableMerge", lineId, aId, bId });
    expect(getLineUnits(state.song[0], state.merges)).toHaveLength(2);
  });

  it("merging keeps the first cell's content and discards the second's", () => {
    const [aId, bId] = flattenSyllables(state.song[0]).map((s) => s.id);
    const lineId = state.song[0].id;

    state = reduce(
      state,
      { type: "setCellText", trackId: "chords", slotId: beforeSlotId(aId), text: "G7" },
      { type: "setCellText", trackId: "chords", slotId: beforeSlotId(bId), text: "Dm" },
      { type: "toggleSyllableMerge", lineId, aId, bId },
    );

    expect(getCell(state.cells, "chords", beforeSlotId(aId))).toBe("G7");
    expect(getCell(state.cells, "chords", beforeSlotId(bId))).toBe("");
  });

  it("fixture: merging the syllables of Ypacaraí collapses them into one annotation unit", () => {
    state = reduce(createInitialState(), {
      type: "setLyricsText",
      text: "Junto al lago azul de Ypacaraí",
    });
    const line = state.song[0];
    const ypacaraiWord = line.words[line.words.length - 1];
    const [y1, y2, y3, y4, y5] = ypacaraiWord.syllables.map((s) => s.id);
    expect(ypacaraiWord.syllables.map((s) => s.text)).toEqual(["Y", "pa", "ca", "ra", "í"]);

    state = reduce(
      state,
      { type: "toggleSyllableMerge", lineId: line.id, aId: y1, bId: y2 },
      { type: "toggleSyllableMerge", lineId: line.id, aId: y2, bId: y3 },
      { type: "toggleSyllableMerge", lineId: line.id, aId: y3, bId: y4 },
      { type: "toggleSyllableMerge", lineId: line.id, aId: y4, bId: y5 },
    );

    const units = getLineUnits(state.song[0], state.merges);
    const mergedUnit = units.find((u) => u.syllableIds.includes(y1));
    expect(mergedUnit?.syllableIds).toEqual([y1, y2, y3, y4, y5]);
  });
});

describe("second track + visibility", () => {
  it("toggling one track's visibility does not affect another track's content", () => {
    let state = reduce(createInitialState(), { type: "setLyricsText", text: "canción" });
    const slot = beforeSlotId(flattenSyllables(state.song[0])[0].id);

    state = reduce(
      state,
      { type: "setCellText", trackId: "chords", slotId: slot, text: "G7" },
      { type: "setCellText", trackId: "vocalNotes", slotId: slot, text: "Do" },
      { type: "setTrackVisibility", trackId: "chords", visible: false },
    );

    expect(state.tracks.find((t) => t.id === "chords")?.visible).toBe(false);
    expect(getCell(state.cells, "chords", slot)).toBe("G7");
    expect(getCell(state.cells, "vocalNotes", slot)).toBe("Do");
  });
});

describe("resyllabify + reconciliation", () => {
  it("keeps annotations intact when the syllable count does not change", () => {
    let state = reduce(createInitialState(), { type: "setLyricsText", text: "cansión" });
    const line = state.song[0];
    const word = line.words[0];
    const slot = beforeSlotId(word.syllables[0].id);
    state = reduce(state, { type: "setCellText", trackId: "chords", slotId: slot, text: "G7" });

    state = reduce(state, {
      type: "resyllabify",
      lineId: line.id,
      wordId: word.id,
      newText: "canción",
    });

    const newWord = state.song[0].words[0];
    expect(newWord.syllables.map((s) => s.text)).toEqual(["can", "ción"]);
    expect(newWord.syllables[0].id).toBe(word.syllables[0].id);
    expect(getCell(state.cells, "chords", slot)).toBe("G7");
  });

  it("applies prefix/suffix reconciliation when syllable count changes", () => {
    let state = reduce(createInitialState(), { type: "setLyricsText", text: "pescador" });
    const line = state.song[0];
    const word = line.words[0];
    const [pesId, caId, dorId] = word.syllables.map((s) => s.id);
    expect(word.syllables.map((s) => s.text)).toEqual(["pes", "ca", "dor"]);
    state = reduce(
      state,
      { type: "setCellText", trackId: "chords", slotId: beforeSlotId(pesId), text: "G7" },
      { type: "setCellText", trackId: "chords", slotId: beforeSlotId(caId), text: "Dm" },
      { type: "setCellText", trackId: "chords", slotId: beforeSlotId(dorId), text: "F" },
    );

    state = reduce(state, {
      type: "resyllabify",
      lineId: line.id,
      wordId: word.id,
      newText: "pescadores",
    });

    const newWord = state.song[0].words[0];
    expect(newWord.syllables.map((s) => s.text)).toEqual(["pes", "ca", "do", "res"]);
    // "pes" and "ca" match the front, so they keep their id and annotation; "dor" has no
    // suffix match against "res", so it - and its annotation - is dropped; "do"/"res" are new.
    expect(newWord.syllables[0].id).toBe(pesId);
    expect(newWord.syllables[1].id).toBe(caId);
    expect(getCell(state.cells, "chords", beforeSlotId(pesId))).toBe("G7");
    expect(getCell(state.cells, "chords", beforeSlotId(caId))).toBe("Dm");
    expect(getCell(state.cells, "chords", beforeSlotId(dorId))).toBe("");
  });

  it("does not double-dispatch resyllabify for the same edit across word-boundary and debounce", async () => {
    const { createResyllabifyCoordinator } = await import("../resyllabifyCoordinator");
    vi.useFakeTimers();

    let state = reduce(createInitialState(), { type: "setLyricsText", text: "pescador" });
    const line = state.song[0];
    const word = line.words[0];

    let dispatchCount = 0;
    const coordinator = createResyllabifyCoordinator(() => {
      dispatchCount += 1;
      state = editorReducer(state, {
        type: "resyllabify",
        lineId: line.id,
        wordId: word.id,
        newText: "pescadores",
      });
    });

    coordinator.notifyKeystroke();
    coordinator.notifyWordBoundary();
    vi.advanceTimersByTime(2000);

    expect(dispatchCount).toBe(1);
    expect(state.song[0].words[0].syllables.map((s) => s.text)).toEqual(["pes", "ca", "do", "res"]);
    vi.useRealTimers();
  });
});

describe("reconcileLyricsText", () => {
  it("keeps an annotation on an equivalent syllable after an in-place word correction", () => {
    let state = reduce(createInitialState(), { type: "setLyricsText", text: "cansión" });
    const original = state.song[0].words[0].syllables[0];
    state = reduce(state, { type: "setCellText", trackId: "chords", slotId: beforeSlotId(original.id), text: "G7" });

    state = reduce(state, { type: "reconcileLyricsText", text: "canción" });

    expect(state.song[0].words[0].syllables[0].id).toBe(original.id);
    expect(getCell(state.cells, "chords", beforeSlotId(original.id))).toBe("G7");
  });

  it("keeps unchanged lines and their annotations when a line is inserted before them", () => {
    let state = reduce(createInitialState(), { type: "setLyricsText", text: "amor\npaz" });
    const retainedLine = state.song[1];
    const retainedSyllable = retainedLine.words[0].syllables[0];
    state = reduce(state, { type: "setCellText", trackId: "chords", slotId: beforeSlotId(retainedSyllable.id), text: "Dm" });

    state = reduce(state, { type: "reconcileLyricsText", text: "intro\namor\npaz" });

    expect(state.song[2].id).toBe(retainedLine.id);
    expect(getCell(state.cells, "chords", beforeSlotId(retainedSyllable.id))).toBe("Dm");
  });

  it("removes annotations attached to syllables deleted by a document edit", () => {
    let state = reduce(createInitialState(), { type: "setLyricsText", text: "amor paz" });
    const removed = state.song[0].words[0].syllables[0];
    state = reduce(state, { type: "setCellText", trackId: "chords", slotId: beforeSlotId(removed.id), text: "G7" });

    state = reduce(state, { type: "reconcileLyricsText", text: "paz" });

    expect(getCell(state.cells, "chords", beforeSlotId(removed.id))).toBe("");
  });
});
