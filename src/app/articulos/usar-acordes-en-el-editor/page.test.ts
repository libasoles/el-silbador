import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const editor = readFileSync(new URL("../ArticleChordEditor.tsx", import.meta.url), "utf8");

describe("chord editor article", () => {
  it("uses the requested song excerpt and source", () => {
    expect(editor).toContain("Ya nunca te he de olvidar");
    expect(editor).toContain("y estoy mas solo mirando el mar.");
  });

  it("renders existing editor components rather than a simulated interface", () => {
    expect(editor).toContain("SongView");
    expect(editor).toContain("TrackToggleButton");
    expect(editor).toContain("parseChordSheet");
    expect(page).toContain("Cómo usar los acordes en el editor");
  });
});
