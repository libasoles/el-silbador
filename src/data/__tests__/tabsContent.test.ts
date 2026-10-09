import { describe, expect, it } from "vitest";
import { deserializeContent, serializeContent, type StoredSongContent } from "../songs";
import type { SongContent } from "../types";

const content: SongContent = {
  title: "Riff",
  author: "",
  lyricsText: "una\nTAB",
  song: [
    { id: "line1", words: [{ id: "word1", syllables: [{ id: "syl1", text: "u" }, { id: "syl2", text: "na" }] }] },
    { id: "line2", words: [], tab: true },
  ],
  cells: {},
  chordVariants: {},
  pitchDirections: {},
  merges: new Set(),
  tabs: { line2: { tabs: [[[0, null, null, null, null, null], [null, 2, null, null, null, null]]], spacing: 4 } },
};

describe("tab blocks in stored content", () => {
  it("round-trips the blocks through songs.content", () => {
    const stored = JSON.parse(JSON.stringify(serializeContent(content))) as StoredSongContent;

    expect(deserializeContent(stored).tabs).toEqual(content.tabs);
  });

  it("reads content saved before tab blocks existed", () => {
    const stored = JSON.parse(JSON.stringify(serializeContent(content))) as StoredSongContent;
    delete stored.tabs;

    expect(deserializeContent(stored).tabs).toEqual({});
  });
});
