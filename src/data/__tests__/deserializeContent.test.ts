import { describe, expect, it } from "vitest";
import { deserializeContent } from "../songs";

describe("deserializeContent", () => {
  it("gives repeated line ids a fresh unique id", () => {
    const stored = {
      title: "t",
      author: "a",
      lyricsText: "",
      song: [
        { id: "line630", words: [] },
        { id: "line630", words: [] },
        { id: "line659", words: [] },
      ],
      cells: {},
      merges: [],
    };
    const ids = deserializeContent(stored as never).song.map((l) => l.id);
    expect(new Set(ids).size).toBe(3);
    expect(ids[0]).toBe("line630");
  });
});
