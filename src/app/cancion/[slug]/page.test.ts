import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const songPage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("unlisted song metadata", () => {
  it("tells search engines not to index public songs that are not listed", () => {
    expect(songPage).toMatch(/robots: song\.isListed \? undefined : \{ index: false, follow: false \}/);
  });
});
