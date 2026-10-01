import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("site metadata", () => {
  it("targets searches for song chords for guitar in standard and social metadata", () => {
    expect(layout).toMatch(
      /const TITLE = "Acordes de Canciones para Guitarra y Folklore \| El Silbador"/,
    );
    expect(layout).toMatch(
      /const DESCRIPTION =\s+"Acordes de canciones para guitarra, folklore argentino y más\./,
    );
    expect(layout).toMatch(/openGraph:\s*\{[\s\S]*title: TITLE,[\s\S]*description: DESCRIPTION,/);
  });
});
