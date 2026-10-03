import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const demo = readFileSync(new URL("../ChordEditorArticleDemo.tsx", import.meta.url), "utf8");

describe("chord editor article", () => {
  it("uses the requested song excerpt and source", () => {
    expect(demo).toContain("Ya nunca te he de olvidar");
    expect(demo).toContain("y estoy mas solo mirando el mar.");
    expect(demo).toContain("tonada-de-un-viejo-amor-a1be2");
  });

  it("demonstrates the editor's existing chord interactions", () => {
    expect(demo).toContain("ChordDragTutorialExample");
    expect(demo).toContain("ChordDiagram");
    expect(demo).toContain("onDoubleClick");
    expect(page).toContain("Cómo usar los acordes en el editor");
  });
});
