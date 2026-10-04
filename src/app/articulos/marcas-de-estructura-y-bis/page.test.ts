import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseChordSheet } from "../../../core/chordSheet";
import { buildSong, isSubtitleLineText } from "../../../core/model";
import {
  BIS_EXCERPT,
  LABELED_EXCERPT,
  MULTI_BIS_GROUPS,
  STRUCTURE_KEYWORDS,
  UNLABELED_EXCERPT,
} from "../structureSong";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("structure and BIS article", () => {
  it("covers labels and every way to add or remove a BIS", () => {
    for (const heading of [
      "Palabras clave",
      "Cómo se aplican",
      "BIS de una línea",
      "BIS de varias líneas",
      "Quitar un BIS",
    ]) {
      expect(page).toContain(`<h2>${heading}</h2>`);
    }
  });

  it("lists only words the editor shows as subtitles", () => {
    for (const keyword of STRUCTURE_KEYWORDS) expect(isSubtitleLineText(keyword)).toBe(true);
  });

  it("starts the labeled demo with a subtitle line and the empty demo with a blank one", () => {
    expect(buildSong(parseChordSheet(LABELED_EXCERPT).lyricsText)[0]?.subtitle).toBe("Estrofa");
    expect(parseChordSheet(UNLABELED_EXCERPT).lyricsText.split("\n")[0]).toBe("");
  });

  it("groups lines that end in BIS", () => {
    const lines = parseChordSheet(BIS_EXCERPT).lyricsText.split("\n");
    for (const { endLineIndex } of MULTI_BIS_GROUPS) expect(lines[endLineIndex]).toMatch(/ BIS$/);
  });
});
