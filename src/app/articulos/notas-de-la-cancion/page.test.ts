import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { buildSong, flattenSyllables } from "../../../core/model";
import {
  YPACARAI_MELODY,
  YPACARAI_MELODY_FLAT,
  YPACARAI_MELODY_UNJOINED,
  YPACARAI_SHEET,
} from "../ypacaraiSong";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("song notes article", () => {
  it("covers every melody gesture", () => {
    for (const heading of [
      "Mostrar u ocultar las notas",
      "Escribir una nota",
      "Una nota para varias sílabas",
      "Subidas y bajadas",
      "Cambiar de tono",
    ]) {
      expect(page).toContain(`<h2>${heading}</h2>`);
    }
  });

  it("writes one melody token per syllable of every line", () => {
    const lines = buildSong(YPACARAI_SHEET);
    for (const melody of [YPACARAI_MELODY, YPACARAI_MELODY_UNJOINED, YPACARAI_MELODY_FLAT]) {
      expect(melody.map((line) => line.split(" ").length)).toEqual(
        lines.map((line) => flattenSyllables(line).length),
      );
    }
  });

  it("leaves the arrows out of the demo that asks the reader to add them", () => {
    expect(YPACARAI_MELODY_FLAT.join(" ")).not.toMatch(/[↑↓]/);
  });
});
