/**
 * Theming: the app's underline, chord, and highlight colors are all derived from a single
 * accent color by proximity in HSL space (same hue family, nearby lightness/saturation),
 * so callers only ever have to pick one color and the rest stay visually related to it.
 */

export interface ThemeColors {
  accent: string;
  chord: string;
  highlight: string;
  underline: string;
}

interface Hsl {
  h: number;
  s: number;
  l: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function hexToHsl(hex: string): Hsl {
  const normalized = hex.replace("#", "");
  const full =
    normalized.length === 3
      ? normalized
          .split("")
          .map((c) => c + c)
          .join("")
      : normalized;
  const r = parseInt(full.slice(0, 2), 16) / 255;
  const g = parseInt(full.slice(2, 4), 16) / 255;
  const b = parseInt(full.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) return { h: 0, s: 0, l: l * 100 };

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  switch (max) {
    case r:
      h = (g - b) / d + (g < b ? 6 : 0);
      break;
    case g:
      h = (b - r) / d + 2;
      break;
    default:
      h = (r - g) / d + 4;
  }
  h *= 60;

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = clamp(s, 0, 100) / 100;
  const light = clamp(l, 0, 100) / 100;

  const c = (1 - Math.abs(2 * light - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = light - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) [r, g, b] = [c, x, 0];
  else if (hue < 120) [r, g, b] = [x, c, 0];
  else if (hue < 180) [r, g, b] = [0, c, x];
  else if (hue < 240) [r, g, b] = [0, x, c];
  else if (hue < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (channel: number) =>
    Math.round((channel + m) * 255)
      .toString(16)
      .padStart(2, "0");

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/** Derives the chord, highlight, and underline colors from a single accent color. */
export function deriveTheme(accentColor: string): ThemeColors {
  const { h, s, l } = hexToHsl(accentColor);

  return {
    accent: accentColor,
    // Chords sit right next to the accent: same hue and saturation, slightly deeper.
    chord: hslToHex(h, s, clamp(l - 6, 0, 100)),
    // Highlight reads as an energized version of the accent for drop-target emphasis.
    highlight: hslToHex(h, clamp(s + 8, 0, 100), clamp(l + 6, 0, 100)),
    // Underline is a soft, desaturated tint so it recedes behind the lyric text.
    underline: hslToHex(h + 19, clamp(s - 9, 8, 100), clamp(l + 25, 0, 96)),
  };
}

const THEME_VAR_BY_KEY: Record<keyof ThemeColors, string> = {
  accent: "--accent",
  chord: "--chord",
  highlight: "--highlight",
  underline: "--syllable-underline",
};

/** Applies derived theme colors as CSS custom properties on the given element (defaults to <html>). */
export function applyTheme(theme: ThemeColors, target: HTMLElement = document.documentElement): void {
  for (const key of Object.keys(THEME_VAR_BY_KEY) as (keyof ThemeColors)[]) {
    target.style.setProperty(THEME_VAR_BY_KEY[key], theme[key]);
  }
}
