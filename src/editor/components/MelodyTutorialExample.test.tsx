import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/** WCAG contrast ratio between two #rrggbb colors. */
function contrast(a: string, b: string) {
  const luminance = (hex: string) => {
    const [r, g, bl] = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r! + 0.7152 * g! + 0.0722 * bl!;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

const css = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const theme = css("../theme.css");
const color = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(theme)![1]!;

describe("animated note examples", () => {
  const sheets = [css("./Toast.css"), css("./EditorFeatureDemos.css")];

  it("never fade the note text, which would drop it below the 4.5:1 minimum mid-animation", () => {
    const toast = sheets[0]!;
    const noteRules = [...toast.matchAll(/(\.melody-tutorial-example[^{]*note[^{]*|@keyframes melody-tutorial-note[^{]*)\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/g)];
    expect(noteRules.length).toBeGreaterThan(0);
    for (const [, , body] of noteRules) expect(body).not.toMatch(/opacity:\s*0?\.\d|opacity:\s*0\b/);

    const demos = sheets[1]!;
    const dragKeyframes = demos.match(/@keyframes pitch-drag-(up|down)\s*\{[\s\S]*?\n\}/g) ?? [];
    expect(dragKeyframes).toHaveLength(2);
    for (const keyframes of dragKeyframes) expect(keyframes).not.toMatch(/opacity/);
  });

  it("tint the highlighted note's background without dropping its text under 4.5:1", () => {
    const tints = new Set(sheets.flatMap((sheet) => [...sheet.matchAll(/background-color:\s*(#[0-9a-f]{6})/gi)].map((m) => m[1]!)));
    expect(tints.size).toBeGreaterThan(0);
    for (const tint of tints) {
      expect(contrast(color("accent"), tint)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(color("chord"), tint)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(color("accent"), color("bg"))).toBeGreaterThanOrEqual(4.5);
  });
});
