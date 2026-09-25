/**
 * Detects chord lines in pasted text (the ChordPro-style convention of a chord line positioned
 * directly above the lyric line it applies to, chords aligned by character column) and separates
 * them from the lyrics. A chord line is one whose every whitespace-separated token looks like a
 * chord symbol (root note, optional accidental, optional quality/extension, optional slash bass).
 */

const CHORD_QUALITY = "(?:maj|Maj|min|Min|dim|Dim|aug|Aug|sus|Sus|add|Add|[mM])?";
const CHORD_EXTENSION = "[0-9]{0,2}(?:sus[0-9]{0,2})?[0-9]{0,2}[+-]?";
const CHORD_TOKEN_RE = new RegExp(
  `^(?:N\\.?C\\.?|[A-G](?:#|b)?${CHORD_QUALITY}${CHORD_EXTENSION}(?:/[A-G](?:#|b)?)?)$`,
);

function isChordLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  return trimmed.split(/\s+/).every((token) => CHORD_TOKEN_RE.test(token));
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
  return [...line.matchAll(/\S+/g)].map((match) => ({ column: match.index, chord: match[0] }));
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
