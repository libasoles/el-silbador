import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
const list = readFileSync(new URL("./articleList.ts", import.meta.url), "utf8");

describe("articles", () => {
  it("uses metadata for the published articles section", () => {
    expect(page).toContain("Guías para escribir canciones con acordes y melodías en El Silbador.");
    expect(page).toContain('canonical: "/articulos"');
    expect(page).toContain("robots: { index: true, follow: true }");
  });

  it("lists the guide for using chords in the editor", () => {
    expect(list).toContain("Cómo usar los acordes en el editor");
    expect(list).toContain("/articulos/usar-acordes-en-el-editor");
  });

  it("lists the guide for writing the song's melody notes", () => {
    expect(list).toContain("Cómo escribir las notas de la canción");
    expect(list).toContain("/articulos/notas-de-la-cancion");
  });

  it("lists the guide for structure labels and BIS", () => {
    expect(list).toContain("Marcas de estructura y BIS");
    expect(list).toContain("/articulos/marcas-de-estructura-y-bis");
  });

  it("uses Lucide icons for article actions", () => {
    expect(page).toContain('from "lucide-react"');
  });
});
