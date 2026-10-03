import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("articles", () => {
  it("uses metadata for the published articles section", () => {
    expect(page).toContain("Guías y notas sobre canciones en El Silbador.");
    expect(page).not.toContain("robots:");
  });

  it("lists the guide for using chords in the editor", () => {
    expect(page).toContain("Cómo usar los acordes en el editor");
    expect(page).toContain("/articulos/usar-acordes-en-el-editor");
  });

  it("uses Lucide icons for article actions", () => {
    expect(page).toContain('from "lucide-react"');
  });
});
