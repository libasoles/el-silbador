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

describe("lyric caret visibility", () => {
  it("uses a dark-gray color instead of the browser's automatic caret color", () => {
    expect(styles).toMatch(/\.song\s*\{[\s\S]*caret-color: #555/);
  });
});

describe("icon-button tooltips", () => {
  it("renders a visible tooltip from a hoverable wrapper", () => {
    expect(app).toContain("function IconButtonTooltip");
    expect(app).toContain('className="icon-button-tooltip"');
    expect(app).toContain("data-tooltip={tooltip}");
    expect(app).not.toMatch(/<button[^>]*\btitle=/);
    expect(styles).toMatch(/\.icon-button-tooltip\s*\{[\s\S]*display: inline-flex/);
    expect(styles).toMatch(/\.icon-button-tooltip > button:disabled\s*\{[\s\S]*pointer-events: none/);
    expect(styles).toMatch(
      /\.icon-button-tooltip:hover::after,\s*\.icon-button-tooltip:focus-within::after\s*\{[\s\S]*opacity: 1/,
    );
    expect(styles).toContain("content: attr(data-tooltip)");
  });
});
