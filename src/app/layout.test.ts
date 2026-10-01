import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const layout = readFileSync(new URL("./layout.tsx", import.meta.url), "utf8");

describe("site metadata", () => {
  it("targets searches for folklore guitar chords in standard and social metadata", () => {
    expect(layout).toMatch(
      /const TITLE = "El Silbador — Acordes de Guitarra para Folklore"/,
    );
    expect(layout).toMatch(
      /const DESCRIPTION =\s+"Acordes de Guitarra para Folklore:/,
    );
    expect(layout).toMatch(/openGraph:\s*\{[\s\S]*title: TITLE,[\s\S]*description: DESCRIPTION,/);
  });
});
