import { nextId } from "./ids";
import { hyphenateWord, splitIntoWords } from "./syllabify";
import type { Line, Song, Syllable, SyllableUnit, Word } from "./types";

/** Builds a fresh, fully-hyphenated song from raw lyrics text. Every id is newly minted. */
export function buildSong(lyricsText: string): Song {
  return lyricsText.split("\n").map((lineText) => buildLine(lineText));
}

function buildLine(lineText: string): Line {
  const words = splitIntoWords(lineText).map((wordText) => buildWord(wordText));
  return { id: nextId("line"), words };
}

function buildWord(wordText: string): Word {
  const syllables = hyphenateWord(wordText).map((text) => buildSyllable(text));
  return { id: nextId("word"), syllables };
}

function buildSyllable(text: string): Syllable {
  return { id: nextId("syl"), text };
}

export function flattenSyllables(line: Line): Syllable[] {
  return line.words.flatMap((word) => word.syllables);
}

export function mergeKey(aId: string, bId: string): string {
  return `${aId}|${bId}`;
}

export function endSlotId(lineId: string): string {
  return `end:${lineId}`;
}

export function beforeSlotId(syllableId: string): string {
  return `before:${syllableId}`;
}

/** Places chords (by 0-indexed line/flattened-syllable position) into a fresh track's cells,
 * for seeding an example song built via `buildSong`. */
export function seedChordCells(
  song: Song,
  placements: { line: number; syllable: number; chord: string }[],
  endOfLinePlacements: { line: number; chord: string }[] = [],
): Record<string, string> {
  const cells: Record<string, string> = {};

  for (const { line, syllable, chord } of placements) {
    const flat = flattenSyllables(song[line]);
    const syl = flat[syllable];
    if (syl) cells[beforeSlotId(syl.id)] = chord;
  }

  for (const { line, chord } of endOfLinePlacements) {
    cells[endSlotId(song[line].id)] = chord;
  }

  return cells;
}

/**
 * Collapses a line's flat syllable sequence into annotation units, merging any syllables
 * joined by an active melisma into a single unit anchored at the first syllable's slot.
 */
export function getLineUnits(line: Line, merges: ReadonlySet<string>): SyllableUnit[] {
  const flat = flattenSyllables(line);
  const units: SyllableUnit[] = [];
  let i = 0;
  while (i < flat.length) {
    const group = [flat[i].id];
    let j = i;
    while (j + 1 < flat.length && merges.has(mergeKey(flat[j].id, flat[j + 1].id))) {
      group.push(flat[j + 1].id);
      j += 1;
    }
    units.push({ slotId: beforeSlotId(flat[i].id), syllableIds: group });
    i = j + 1;
  }
  return units;
}

/** All addressable annotation cell slots for a line, in left-to-right order. */
export function getLineCellSlots(line: Line, merges: ReadonlySet<string>): string[] {
  const units = getLineUnits(line, merges);
  return [...units.map((unit) => unit.slotId), endSlotId(line.id)];
}

/** Whether two syllable ids are adjacent (in that order) in the line's flat sequence. */
export function areAdjacent(line: Line, aId: string, bId: string): boolean {
  const flat = flattenSyllables(line);
  const index = flat.findIndex((s) => s.id === aId);
  if (index === -1 || index + 1 >= flat.length) return false;
  return flat[index + 1].id === bId;
}

/** Drops any merge pairs that no longer form a valid adjacent pair in the given song. */
export function pruneMerges(song: Song, merges: ReadonlySet<string>): Set<string> {
  const pruned = new Set<string>();
  for (const key of merges) {
    const [aId, bId] = key.split("|");
    const line = song.find((l) => flattenSyllables(l).some((s) => s.id === aId));
    if (line && areAdjacent(line, aId, bId)) {
      pruned.add(key);
    }
  }
  return pruned;
}

export interface ReconcileResult {
  syllables: Syllable[];
  droppedIds: string[];
}

/**
 * Matches old syllables to a word's newly-hyphenated syllable texts by prefix/suffix, so that
 * syllables unaffected by the edit keep their id (and therefore their annotations). Syllables in
 * the ambiguous middle are treated as brand new and lose any prior annotation.
 */
export function reconcileWordSyllables(oldSyllables: Syllable[], newTexts: string[]): ReconcileResult {
  const n = oldSyllables.length;
  const m = newTexts.length;

  let prefix = 0;
  while (prefix < n && prefix < m && oldSyllables[prefix].text === newTexts[prefix]) {
    prefix += 1;
  }

  let suffix = 0;
  const maxSuffix = Math.min(n - prefix, m - prefix);
  while (
    suffix < maxSuffix &&
    oldSyllables[n - 1 - suffix].text === newTexts[m - 1 - suffix]
  ) {
    suffix += 1;
  }

  const syllables: Syllable[] = [];
  for (let i = 0; i < prefix; i += 1) syllables.push(oldSyllables[i]);
  for (let i = prefix; i < m - suffix; i += 1) syllables.push(buildSyllable(newTexts[i]));
  for (let i = 0; i < suffix; i += 1) syllables.push(oldSyllables[n - suffix + i]);

  const keptIds = new Set(syllables.map((s) => s.id));
  const droppedIds = oldSyllables.filter((s) => !keptIds.has(s.id)).map((s) => s.id);

  return { syllables, droppedIds };
}
