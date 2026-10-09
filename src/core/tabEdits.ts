import { isTabLineText } from "./model";
import type { Song } from "./types";

/** Where each line of `lines` starts in the text they make up. */
export function lineStarts(lines: string[]): number[] {
  const starts: number[] = [];
  let offset = 0;
  for (const line of lines) {
    starts.push(offset);
    offset += line.length + 1;
  }
  return starts;
}

/** A line of edited text that reads `TAB`, and the block it already is (`null` for a new one). */
export interface TabLineAfterEdit {
  lineIndex: number;
  id: string | null;
}

/**
 * Every line that reads `TAB` in the text that replacing `[start, end)` of `text` with
 * `replacement` produces, in order. A block the edit didn't touch keeps its id, wherever the edit
 * moved it; a `TAB` line the edit wrote has none yet. (Every marker reads the same, so text alone
 * can't tell which block a deletion removed: see `ReconcileOptions.tabIds`.)
 */
export function tabLinesAfterReplace(
  song: Song,
  text: string,
  start: number,
  end: number,
  replacement: string,
): TabLineAfterEdit[] {
  const oldLines = text.split("\n");
  const oldStarts = lineStarts(oldLines);
  const shift = replacement.length - (end - start);
  const idAt = new Map<number, string>();
  oldLines.forEach((_, index) => {
    const line = song[index];
    if (!line?.tab) return;
    const lineStart = oldStarts[index]!;
    const lineEnd = lineStart + oldLines[index]!.length;
    if (lineEnd <= start) idAt.set(lineStart, line.id);
    else if (lineStart >= end) idAt.set(lineStart + shift, line.id);
  });

  const newText = text.slice(0, start) + replacement + text.slice(end);
  if (newText === "") return [];
  const newLines = newText.split("\n");
  const newStarts = lineStarts(newLines);
  return newLines.flatMap((line, lineIndex) =>
    isTabLineText(line) ? [{ lineIndex, id: idAt.get(newStarts[lineIndex]!) ?? null }] : [],
  );
}
