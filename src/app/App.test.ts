import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("./App.css", import.meta.url), "utf8");
const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");

describe("underline visibility", () => {
  it("does not couple the underline to the chords track visibility", () => {
    expect(styles).not.toMatch(/\.line--chords-hidden\s+\.syllable::after/);
    expect(styles).toMatch(/\.song--underline-hidden\s+\.syllable::after/);
  });
});

describe("disabled icon-button tooltips", () => {
  it("moves the title to a hoverable wrapper", () => {
    expect(app).toContain("function DisabledIconButtonTooltip");
    expect(app).toContain('className="icon-button-tooltip"');
    expect(styles).toMatch(/\.icon-button-tooltip\s*\{[\s\S]*display: inline-flex/);
    expect(styles).toMatch(/\.icon-button-tooltip > button:disabled\s*\{[\s\S]*pointer-events: none/);
  });
});
