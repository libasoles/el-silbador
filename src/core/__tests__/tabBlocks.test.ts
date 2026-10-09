import { describe, expect, it } from "vitest";
import { getLineCellSlots, getLineUnits } from "../model";
import { createInitialState, editorReducer, tabLineIds, type Action } from "../state";
import type { EditorState, TabBlock } from "../types";

function reduce(state: EditorState, ...actions: Action[]): EditorState {
  return actions.reduce(editorReducer, state);
}

function withText(text: string): EditorState {
  return reduce(createInitialState(), { type: "setLyricsText", text });
}

const RIFF: TabBlock = { tabs: [[[3, null, null, null, null, null]]], spacing: 3 };
const OTHER_RIFF: TabBlock = { tabs: [[[null, 5, null, null, null, null]]] };

describe("tab line detection", () => {
  it("turns a line that reads exactly TAB into an empty tab block", () => {
    const state = withText("una noche\nTAB\ntibia");

    expect(state.song[1]).toEqual({ id: state.song[1]!.id, words: [], tab: true });
    expect(state.tabs).toEqual({ [state.song[1]!.id]: { tabs: [[]] } });
  });

  it.each(["tab", "Tab", "la TAB del medio", "TABLA"])("leaves %j as lyrics", (line) => {
    const state = withText(`una noche\n${line}`);

    expect(state.song[1]!.tab).toBeUndefined();
    expect(state.song[1]!.words.length).toBeGreaterThan(0);
    expect(state.tabs).toEqual({});
  });

  it("gives a tab line no annotation slots", () => {
    const state = withText("TAB");
    const line = state.song[0]!;

    expect(getLineUnits(line, state.merges)).toEqual([]);
    expect(getLineCellSlots(line, state.merges, state.cells).every((slot) => /^(start|end):/.test(slot))).toBe(true);
  });

  it("keeps the caret's TAB as lyrics until the author leaves it", () => {
    let state = withText("una noche");
    state = reduce(state, { type: "reconcileLyricsText", text: "una noche\nTAB", options: { textLineIndexes: [1] } });
    expect(state.song[1]!.tab).toBeUndefined();
    expect(state.tabs).toEqual({});

    state = reduce(state, { type: "reconcileLyricsText", text: "una noche\nTAB" });
    expect(state.song[1]!.tab).toBe(true);
    expect(Object.keys(state.tabs)).toEqual([state.song[1]!.id]);
  });
});

describe("tab block content", () => {
  it("sets and changes the spacing of a block", () => {
    let state = withText("TAB");
    const id = state.song[0]!.id;

    state = reduce(state, { type: "setTabBlock", lineId: id, block: RIFF }, { type: "setTabSpacing", lineId: id, spacing: 5 });

    expect(state.tabs[id]).toEqual({ ...RIFF, spacing: 5 });
  });

  it("ignores content for a line that is not a tab block", () => {
    const state = withText("una noche");

    expect(reduce(state, { type: "setTabBlock", lineId: state.song[0]!.id, block: RIFF })).toBe(state);
  });
});

describe("reconciling text around tab blocks", () => {
  it("keeps the block's id and content when the lyrics around it change", () => {
    let state = withText("una noche\nTAB\ntibia");
    const id = state.song[1]!.id;
    state = reduce(state, { type: "setTabBlock", lineId: id, block: RIFF });

    state = reduce(state, { type: "reconcileLyricsText", text: "una noche de luna\nnueva\nTAB\ntibia" });

    expect(state.song[2]!.id).toBe(id);
    expect(state.tabs).toEqual({ [id]: RIFF });
  });

  it("purges the block when its marker line is deleted, and undoing the edit is the state before it", () => {
    let state = withText("una noche\nTAB\ntibia");
    const id = state.song[1]!.id;
    state = reduce(state, { type: "setTabBlock", lineId: id, block: RIFF });
    const before = state;

    state = reduce(state, { type: "reconcileLyricsText", text: "una noche\ntibia" });

    expect(state.song.some((line) => line.tab)).toBe(false);
    expect(state.tabs).toEqual({});
    expect(before.tabs[id]).toEqual(RIFF);
  });

  it("does not hand a block's id to a lyric line that replaces it", () => {
    let state = withText("una noche\nTAB\ntibia");
    const id = state.song[1]!.id;

    state = reduce(state, { type: "reconcileLyricsText", text: "una noche\nde luna\ntibia" });

    expect(state.song[1]!.id).not.toBe(id);
    expect(state.tabs).toEqual({});
  });

  it("follows the editor's block ids when the text alone is ambiguous", () => {
    let state = withText("una\nTAB\nnoche\nTAB\ntibia");
    const [first, second] = tabLineIds(state.song);
    state = reduce(
      state,
      { type: "setTabBlock", lineId: first!, block: RIFF },
      { type: "setTabBlock", lineId: second!, block: OTHER_RIFF },
    );

    // Deleting the first block and the line after it reads the same as deleting the second one.
    state = reduce(state, {
      type: "reconcileLyricsText",
      text: "una\nTAB\ntibia",
      options: { tabIds: [second!] },
    });

    expect(tabLineIds(state.song)).toEqual([second]);
    expect(state.tabs).toEqual({ [second!]: OTHER_RIFF });
  });

  it("gives a new block a fresh id when the editor says it is new", () => {
    let state = withText("una\nTAB");
    const [existing] = tabLineIds(state.song);

    state = reduce(state, {
      type: "reconcileLyricsText",
      text: "TAB\nuna\nTAB",
      options: { tabIds: [null, existing!] },
    });

    const ids = tabLineIds(state.song);
    expect(ids[1]).toBe(existing);
    expect(ids[0]).not.toBe(existing);
    expect(state.tabs[ids[0]!]).toEqual({ tabs: [[]] });
  });
});

describe("removeTabBlock", () => {
  it("deletes the block and its marker line, keeping the other blocks", () => {
    let state = withText("una\nTAB\nnoche\nTAB");
    const [first, second] = tabLineIds(state.song);
    state = reduce(state, { type: "setTabBlock", lineId: second!, block: OTHER_RIFF });

    state = reduce(state, { type: "removeTabBlock", lineId: first! });

    expect(state.lyricsText).toBe("una\nnoche\nTAB");
    expect(tabLineIds(state.song)).toEqual([second]);
    expect(state.tabs).toEqual({ [second!]: OTHER_RIFF });
  });

  it("leaves an empty song when the block was all there was", () => {
    const only = withText("TAB");
    const emptied = reduce(only, { type: "removeTabBlock", lineId: only.song[0]!.id });
    expect(emptied.song).toEqual([]);
    expect(emptied.lyricsText).toBe("");
    expect(emptied.tabs).toEqual({});
  });
});

describe("pasting tab blocks", () => {
  it("fills each pasted TAB line with its content", () => {
    let state = withText("una");

    state = reduce(state, {
      type: "pasteText",
      text: "una\nTAB\nnoche",
      startLineIndex: 0,
      startOffset: 3,
      placements: [],
      pastedTabs: [{ lineIndex: 1, block: RIFF }],
    });

    expect(state.tabs[state.song[1]!.id]).toEqual(RIFF);
  });
});

describe("loading tab blocks", () => {
  it("restores saved blocks and opens a TAB line without content as an empty block", () => {
    const source = withText("TAB\nuna\nTAB");
    const [first, second] = tabLineIds(source.song);
    const asLyrics = { id: second!, words: [{ id: "w1", syllables: [{ id: "s1", text: "TAB" }] }] };

    const state = reduce(createInitialState(), {
      type: "loadContent",
      content: {
        title: "",
        author: "",
        lyricsText: source.lyricsText,
        song: [source.song[0]!, source.song[1]!, asLyrics],
        cells: {},
        chordVariants: {},
        pitchDirections: {},
        merges: new Set(),
        tabs: { [first!]: RIFF },
      },
      isMobile: false,
    });

    expect(state.song[2]).toEqual({ id: second, words: [], tab: true });
    expect(state.tabs).toEqual({ [first!]: RIFF, [second!]: { tabs: [[]] } });
  });
});
