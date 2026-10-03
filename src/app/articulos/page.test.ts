import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const page = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("articles draft", () => {
  it("is explicitly excluded from search indexing while it is in development", () => {
    expect(page).toMatch(/robots: \{ index: false, follow: false \}/);
  });

  it("renders a draft article index with placeholder content", () => {
    expect(page).toContain("Borrador en desarrollo");
    expect(page).toContain("Lorem ipsum");
  });

  it("links every draft entry to the single example article", () => {
    expect(page).toContain('href="/articulos/ejemplo"');
  });
});
