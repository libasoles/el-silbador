import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("tablatures article", () => {
  it("covers using tablatures in El Silbador", () => {
    for (const heading of [
      "Mostrar u ocultar las tablaturas",
      "Agregar una tablatura",
      "Escribir los trastes",
      "Copiar y pegar",
      "Más de una tablatura",
      "Espaciado",
      "En el celular",
    ]) {
      expect(page).toContain("<h2>" + heading + "</h2>");
    }
  });

  it("uses the article metadata and live editor examples", () => {
    expect(page).toContain('slug: "usar-tablaturas"');
    expect(page).toContain("articleMetadata(ARTICLE)");
    expect(page).toContain("<ArticleChordEditor");
    expect(page).toContain("tabBlocks={RIFF_TABS}");
  });
});
