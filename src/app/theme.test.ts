import { describe, expect, it } from "vitest";
import { deriveTheme } from "./theme";

describe("deriveTheme", () => {
  it("keeps the accent color unchanged", () => {
    const theme = deriveTheme("#9c4a3c");
    expect(theme.accent).toBe("#9c4a3c");
  });

  it("derives chord, highlight, and underline as valid hex colors close to the accent", () => {
    const theme = deriveTheme("#9c4a3c");
    for (const color of [theme.chord, theme.highlight, theme.underline]) {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    }
    // The underline recedes: much lighter than the accent it's derived from.
    expect(theme.underline.toLowerCase()).not.toBe(theme.accent.toLowerCase());
  });

  it("derives a different, related palette from a different accent color", () => {
    const warm = deriveTheme("#9c4a3c");
    const cool = deriveTheme("#3c5a9c");
    expect(warm.chord).not.toBe(cool.chord);
    expect(warm.highlight).not.toBe(cool.highlight);
    expect(warm.underline).not.toBe(cool.underline);
  });

  it("is deterministic for the same input", () => {
    expect(deriveTheme("#3c5a9c")).toEqual(deriveTheme("#3c5a9c"));
  });
});
