/** A piece of pasted text: lyrics and chords, or a run of ASCII tablature staves. */
export type PasteSegment = { kind: "text"; text: string } | { kind: "tab"; ascii: string };

const STRING_COUNT = 6;

/** One string of an ASCII staff, as ascii-tabs' `parse` reads it: a number label (`1`–`6`) or a
 *  note label (`e B G D A E`), then dashes, frets and bars only. The dashes are required, so a
 *  chord line that is just "E" stays a chord. */
const STRING_LINE = /^\s*(?:[1-6][ \t]?|[eBGDAE])\|?[-|\d\s]*$/;

function isStringLine(line: string | undefined): boolean {
  return line !== undefined && STRING_LINE.test(line) && line.includes("-");
}

function isStaffAt(lines: string[], index: number): boolean {
  for (let offset = 0; offset < STRING_COUNT; offset++) {
    if (!isStringLine(lines[index + offset])) return false;
  }
  return true;
}

/**
 * Splits pasted text into its runs of ASCII tablature and the text around them. A run is one or
 * more six-string staves, with only blank lines between them: ascii-tabs joins those into a single
 * Tab. Blank lines around a run stay with the text.
 */
export function splitAsciiTabs(pasted: string): PasteSegment[] {
  const lines = pasted.split("\n");
  const segments: PasteSegment[] = [];
  let textLines: string[] = [];
  const flushText = () => {
    if (textLines.length > 0) segments.push({ kind: "text", text: textLines.join("\n") });
    textLines = [];
  };

  let index = 0;
  while (index < lines.length) {
    if (!isStaffAt(lines, index)) {
      textLines.push(lines[index]!);
      index += 1;
      continue;
    }
    let end = index + STRING_COUNT;
    for (;;) {
      let next = end;
      while (next < lines.length && lines[next]!.trim() === "") next += 1;
      if (next === end || !isStaffAt(lines, next)) break;
      end = next + STRING_COUNT;
    }
    flushText();
    segments.push({ kind: "tab", ascii: lines.slice(index, end).join("\n") });
    index = end;
  }
  flushText();
  return segments;
}
