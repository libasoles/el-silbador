import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { parseChordSheet } from "../../../core/chordSheet";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const editor = readFileSync(
  new URL("../ArticleChordEditor.tsx", import.meta.url),
  "utf8",
);
const styles = readFileSync(
  new URL("../articles.css", import.meta.url),
  "utf8",
);

// Heading text with inline markup (e.g. <span className="article-action">) stripped.
const headings = [...page.matchAll(/<h2>([\s\S]*?)<\/h2>/g)].map(([, inner]) =>
  inner
    .replace(/\{" "\}/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim(),
);

describe("chord editor article", () => {
  it("uses the requested song excerpt", () => {
    expect(editor).toContain("Ya nunca te he de olvidar");
    expect(editor).toContain("y estoy mas solo mirando el mar");
  });

  it("renders existing editor components rather than a simulated interface", () => {
    expect(editor).toContain("<SongView");
    expect(editor).toContain("<TrackToggleButton");
    expect(editor).toContain("<TransposeWidget");
    expect(editor).toContain("<ChordDragTutorialExample");
    expect(editor).toContain("<ChordDiagram");
    // Built through the same reducer action the editor runs when a chord sheet is pasted.
    expect(editor).toContain('type: "pasteText"');
  });

  it("covers every chord gesture", () => {
    for (const heading of [
      "Mostrar u ocultar los acordes",
      "Escribir un acorde",
      "Mover un acorde a otra sílaba",
      "Antes y después de la frase",
      "Corregir un acorde con doble click",
      "Dibujo del acorde",
      "Cambiar de tono",
    ]) {
      expect(headings).toContain(heading);
    }
  });

  it("keeps the editor's help button out of the article", () => {
    expect(editor).toContain("showHelp={false}");
  });

  it("puts the track toggles in a desktop right-hand column", () => {
    expect(editor).toContain("article-editor--with-track-toggles");
    expect(styles).toContain('"song tools"');
    expect(styles).toContain("flex-direction: column");
  });

  it("starts the move demo with its chords one syllable off, as in the animation", async () => {
    const { MOVE_EXCERPT } = await import("../ArticleChordEditor");
    const { lyricsText, placements } = parseChordSheet(MOVE_EXCERPT);
    const syllableAt = (column: number) =>
      lyricsText.slice(column).match(/^\S+/)?.[0];
    expect(
      placements.map((placement) => [
        placement.chord,
        syllableAt(placement.column),
      ]),
    ).toEqual([
      ["A", "Ya"],
      ["A7", "te"],
      ["D", "vidar"],
    ]);
  });
});
