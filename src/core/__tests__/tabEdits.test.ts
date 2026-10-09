import { describe, expect, it } from "vitest";
import { createInitialState, editorReducer, tabLineIds } from "../state";
import { tabLinesAfterReplace } from "../tabEdits";

function songOf(text: string) {
  return editorReducer(createInitialState(), { type: "setLyricsText", text });
}

function idsAfter(...args: Parameters<typeof tabLinesAfterReplace>) {
  return tabLinesAfterReplace(...args).map((line) => line.id);
}

describe("tabLinesAfterReplace", () => {
  it("keeps the ids of blocks before and after an edit, at their new lines", () => {
    const { song, lyricsText } = songOf("TAB\nuna\nTAB");
    const ids = tabLineIds(song);
    const at = lyricsText.indexOf("una") + 3;

    expect(tabLinesAfterReplace(song, lyricsText, at, at, " noche\nde luna")).toEqual([
      { lineIndex: 0, id: ids[0] },
      { lineIndex: 3, id: ids[1] },
    ]);
  });

  it("drops the block an edit deleted, even when another block then reads the same", () => {
    const { song, lyricsText } = songOf("una\nTAB\nnoche\nTAB\ntibia");
    const [, second] = tabLineIds(song);
    const start = lyricsText.indexOf("TAB");
    const end = lyricsText.indexOf("noche") + "noche\n".length;

    expect(idsAfter(song, lyricsText, start, end, "")).toEqual([second]);
  });

  it("calls a TAB line the edit wrote a new one", () => {
    const { song, lyricsText } = songOf("una\nTAB");
    const [existing] = tabLineIds(song);

    expect(idsAfter(song, lyricsText, 0, 0, "TAB\n")).toEqual([null, existing]);
    expect(idsAfter(song, lyricsText, lyricsText.length, lyricsText.length, "\nTAB")).toEqual([existing, null]);
  });

  it("returns no lines when the edit empties the song", () => {
    const { song, lyricsText } = songOf("TAB");

    expect(tabLinesAfterReplace(song, lyricsText, 0, lyricsText.length, "")).toEqual([]);
  });
});
