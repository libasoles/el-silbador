import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const styles = readFileSync(new URL("./App.css", import.meta.url), "utf8");
const themeStyles = readFileSync(new URL("./theme.css", import.meta.url), "utf8");
const app = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
const iconButtonTooltip = readFileSync(
  new URL("./components/IconButtonTooltip.tsx", import.meta.url),
  "utf8",
);
const favicon = readFileSync(new URL("../../public/favicon.svg", import.meta.url), "utf8");

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
    expect(iconButtonTooltip).toContain("function IconButtonTooltip");
    expect(iconButtonTooltip).toContain('className="icon-button-tooltip"');
    expect(iconButtonTooltip).toContain("data-tooltip={tooltip}");
    expect(app).not.toMatch(/<button[^>]*\btitle=/);
    expect(themeStyles).toMatch(/\.icon-button-tooltip\s*\{[\s\S]*display: inline-flex/);
    expect(themeStyles).toMatch(
      /\.icon-button-tooltip > button:disabled\s*\{[\s\S]*pointer-events: none/,
    );
    expect(themeStyles).toMatch(
      /\.icon-button-tooltip:hover::after,\s*\.icon-button-tooltip:focus-within::after\s*\{[\s\S]*opacity: 1/,
    );
    expect(themeStyles).toContain("content: attr(data-tooltip)");
  });
});

describe("application mark", () => {
  it("renders a larger Silbador icon that links to the index", () => {
    expect(app).toContain("<SilbadorIcon />");
    expect(app).toContain('className="app-mark"');
    expect(app).toContain('href="/"');
    expect(themeStyles).toMatch(
      /\.app-mark\s*\{[\s\S]*position: fixed[\s\S]*top: 1rem[\s\S]*left: 1rem/,
    );
    expect(themeStyles).toMatch(/\.app-mark\s*\{[\s\S]*color: #000/);
    expect(themeStyles).toMatch(/\.app-mark\s*\{[\s\S]*width: 3\.25rem/);
  });
});

describe("favicon", () => {
  it("uses the supplied whistling-face mark", () => {
    expect(favicon).toContain('viewBox="0 0 64 64"');
    expect(favicon).toContain('stroke="#fff"');
    expect(favicon).toContain('stroke-width="2.15"');
    expect(favicon).toContain('M38.8 35.3C40.1 34.7');
    expect(favicon).toContain('stroke-width="1.75"');
  });
});
