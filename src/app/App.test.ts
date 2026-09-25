import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("./App.css", import.meta.url), "utf8");

describe("underline visibility", () => {
  it("does not couple the underline to the chords track visibility", () => {
    expect(styles).not.toMatch(/\.line--chords-hidden\s+\.syllable::after/);
    expect(styles).toMatch(/\.song--underline-hidden\s+\.syllable::after/);
  });
});
