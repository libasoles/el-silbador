/**
 * Detects chord lines in pasted text (the ChordPro-style convention of a chord line positioned
 * directly above the lyric line it applies to, chords aligned by character column) and separates
 * them from the lyrics. A chord line is one whose every whitespace-separated token looks like a
 * chord symbol (root note, optional accidental, optional quality/extension, optional slash bass).
 */

const CHORD_QUALITY = "(?:maj|Maj|min|Min|dim|Dim|aug|Aug|sus|Sus|add|Add|[mM])?";
const CHORD_EXTENSION = "[0-9]{0,2}(?:sus[0-9]{0,2})?[0-9]{0,2}[+-]?";
const CHORD_BODY = `(?:N\\.?C\\.?|[A-G](?:#|b)?${CHORD_QUALITY}${CHORD_EXTENSION}(?:/[A-G](?:#|b)?)?)`;
const CHORD_PREFIX_RE = new RegExp(CHORD_BODY, "y");

/** Splits a whitespace-free token into consecutive chords, since sources sometimes glue them
 *  together (`A7D7` -> `A7`, `D7`). Returns null if the token isn't made up entirely of chords. */
function splitChordToken(token: string): { offset: number; chord: string }[] | null {
  const parts: { offset: number; chord: string }[] = [];
  let offset = 0;
  while (offset < token.length) {
    CHORD_PREFIX_RE.lastIndex = offset;
    const match = CHORD_PREFIX_RE.exec(token);
    if (!match || match[0] === "") return null;
    parts.push({ offset, chord: match[0] });
    offset += match[0].length;
  }
  return parts;
}

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return trimmed.split(/\s+/).every((token) => splitChordToken(token) !== null);
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
 *  Chord lines with no following lyric line (trailing chords at the end of the paste) are kept
 *  by appending an empty lyric line to hold them. */
export function parseChordSheet(text: string): ParsedChordSheet {
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

  for (const rawLine of text.split("\n")) {
    if (isChordLine(rawLine)) {
      pendingTokens = pendingTokens.concat(lineTokens(rawLine));
      continue;
    }
    flush(rawLine);
  }
  if (pendingTokens.length > 0) flush("");

  return { lyricsText: lyricsLines.join("\n"), placements };
}
