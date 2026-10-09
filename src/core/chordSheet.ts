/**
 * Detects chord lines in pasted text (the ChordPro-style convention of a chord line positioned
 * directly above the lyric line it applies to, chords aligned by character column) and separates
 * them from the lyrics. A chord line is one whose every whitespace-separated token looks like a
 * chord symbol (root note, optional accidental, optional quality/extension, optional slash bass).
 */

import { findChordShape } from "./findChordShape";

const CHORD_QUALITY = "(?:maj|Maj|min|Min|dim|Dim|aug|Aug|sus|Sus|add|Add|[mM])?";
const CHORD_EXTENSION = "[0-9]{0,2}(?:sus[0-9]{0,2})?[0-9]{0,2}[+-]?";
const CHORD_BODY = `(?:N\\.?C\\.?|[A-G](?:#|b)?${CHORD_QUALITY}${CHORD_EXTENSION}(?:/[A-G](?:#|b)?)?)`;
const CHORD_TOKEN_RE = new RegExp(`^${CHORD_BODY}$`);

interface Segmentation {
  /** Pieces whose text isn't in the chord database (fewer is better). */
  unknown: number;
  parts: { offset: number; chord: string }[];
}

function isBetter(a: Segmentation, b: Segmentation | null): boolean {
  if (!b) return true;
  if (a.unknown !== b.unknown) return a.unknown < b.unknown;
  return a.parts.length < b.parts.length;
}

/** Splits a whitespace-free token into consecutive chords, since sources sometimes glue them
 *  together (`A7D7` -> `A7`, `D7`). A token that is itself a known chord is kept whole; otherwise
 *  every way of cutting it into syntactically valid chords is tried and the cut that uses the most
 *  chords found in the chord database wins (ties go to fewer, longer chords). Returns null if the
 *  token can't be cut into chords at all. */
function splitChordToken(token: string): { offset: number; chord: string }[] | null {
  if (findChordShape(token)) return [{ offset: 0, chord: token }];

  const best: (Segmentation | null)[] = new Array(token.length + 1).fill(null);
  best[token.length] = { unknown: 0, parts: [] };
  for (let start = token.length - 1; start >= 0; start--) {
    for (let end = start + 1; end <= token.length; end++) {
      const rest = best[end];
      if (!rest) continue;
      const chord = token.slice(start, end);
      if (!CHORD_TOKEN_RE.test(chord)) continue;
      const candidate: Segmentation = {
        unknown: rest.unknown + (findChordShape(chord) ? 0 : 1),
        parts: [{ offset: start, chord }, ...rest.parts],
      };
      if (isBetter(candidate, best[start])) best[start] = candidate;
    }
  }
  return best[0]?.parts ?? null;
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return trimmed.split(/\s+/).every((token) => splitChordToken(token) !== null);
}

/** Chords that are also words a line of lyrics may hold on its own (the Spanish "a" and "e"). */
const WORD_CHORDS = new Set(["A", "E"]);

/** Whether a raw line of a song is a chord line: only chords, with no lyrics under them. A lone
 *  chord that is also a word stays lyrics until the line holds more chords. */
export function isChordLineText(line: string): boolean {
  return isChordLine(line) && !WORD_CHORDS.has(line.trim());
}

/** Each chord of a chord line, by the column it starts at. */
export function chordLineTokens(line: string): { column: number; chord: string }[] {
  return lineTokens(line);
}

export interface ChordPlacement {
  /** 0-indexed line, into the *returned* `lyricsText` (after chord lines are stripped out). */
  lineIndex: number;
  /** Character column within that lyric line where the chord was written above it. */
  column: number;
  chord: string;
}

export interface ParsedChordSheet {
  lyricsText: string;
  placements: ChordPlacement[];
}

function lineTokens(line: string): { column: number; chord: string }[] {
  return [...line.matchAll(/\S+/g)].flatMap((match) =>
    (splitChordToken(match[0]) ?? []).map((part) => ({
      column: match.index + part.offset,
      chord: part.chord,
    })),
  );
}

/** Splits pasted text into lyrics-only text plus the chord placements detected above each line.
 *  Only a row of chords right above a line of lyrics is spread over that line's syllables. A row
 *  with no lyrics under it (an intro, an ending, one above a section label or another row of
 *  chords) stays as text: a chord line of its own. */
export function parseChordSheet(
  text: string,
  /** Whether a raw line is lyrics a row of chords can sit on: by default, any line with text.
   *  The editor also excludes its section labels and `TAB` lines (see `isLyricLineText`). */
  isLyricLine: (line: string) => boolean = (line) => line.trim() !== "",
): ParsedChordSheet {
  const lyricsLines: string[] = [];
  const placements: ChordPlacement[] = [];
  let pendingTokens: { column: number; chord: string }[] = [];

  function flush(lyricLine: string) {
    const lineIndex = lyricsLines.length;
    lyricsLines.push(lyricLine);
    for (const token of pendingTokens) {
      placements.push({ lineIndex, column: token.column, chord: token.chord });
    }
    pendingTokens = [];
  }

  const rawLines = text.split("\n");
  rawLines.forEach((rawLine, index) => {
    const next = rawLines[index + 1];
    if (isChordLine(rawLine) && next !== undefined && !isChordLine(next) && isLyricLine(next)) {
      pendingTokens = lineTokens(rawLine);
      return;
    }
    flush(rawLine);
  });

  return { lyricsText: lyricsLines.join("\n"), placements };
}
