import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("articles", () => {
  it("uses metadata for the published articles section", () => {
    expect(page).toContain("Guías para escribir canciones con acordes y melodías en El Silbador.");
    expect(page).toContain('canonical: "/articulos"');
    expect(page).toContain("robots: { index: true, follow: true }");
  });

  it("lists the guide for using chords in the editor", () => {
    expect(page).toContain("Cómo usar los acordes en el editor");
    expect(page).toContain("/articulos/usar-acordes-en-el-editor");
  });

  it("lists the guide for writing the song's melody notes", () => {
    expect(page).toContain("Cómo escribir las notas de la canción");
    expect(page).toContain("/articulos/notas-de-la-cancion");
  });

  it("lists the guide for structure labels and BIS", () => {
    expect(page).toContain("Marcas de estructura y BIS");
    expect(page).toContain("/articulos/marcas-de-estructura-y-bis");
  });

  it("uses Lucide icons for article actions", () => {
    expect(page).toContain('from "lucide-react"');
  });
});
