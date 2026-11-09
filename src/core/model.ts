import { isChordLineText } from "./chordSheet";
import { nextId } from "./ids";
import { isPartituraLinkText } from "./partituraLink";
import { hyphenateWord, isFreeTextToken, splitIntoWords, wordStartColumns } from "./syllabify";
import type { CellsByTrack, Line, Song, Syllable, SyllableUnit, TrackId, Word } from "./types";

const subtitleKeywords = new Set([
  "introduccion",
  "intro",
  "estribillo",
  "estrofa",
  "interludio",
  "coda",
  "remate",
  "cogollo",
  "primera",
  "segunda",
  "recitado",
]);

/** Whether a raw lyric line is one of the section labels displayed as a subtitle.
 *
 * `trim()` deliberately happens before normalization: indentation and trailing whitespace do not
 * turn an otherwise standalone section label into a lyric line. */
export function isSubtitleLineText(lineText: string): boolean {
  const normalized = lineText
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es");
  return subtitleKeywords.has(normalized);
}

/** The marker a tab block leaves in `lyricsText`, and what an author types on a line of its own to
 *  insert one. Uppercase only: a lowercase "tab", or the word inside a verse, stays lyrics. */
export const TAB_MARKER = "TAB";

/** Whether a raw lyric line is the marker of a tab block. */
export function isTabLineText(lineText: string): boolean {
  return lineText.trim() === TAB_MARKER;
}

/** Whether a raw line is lyrics, split into syllables that annotations can sit on: not empty, not
 *  a section label, a `TAB` marker or a chord line. */
export function isLyricLineText(lineText: string): boolean {
  return lineText.trim() !== "" && !isSubtitleLineText(lineText) && !isTabLineText(lineText) && !isChordLineText(lineText) && !isPartituraLinkText(lineText);
}

/** Which lines of a raw document belong to a multi-line free-text block: from a line that opens
 *  with `<--` and has no `-->`, through the first later line containing `-->`. An opening with no
 *  closing line is not a block. */
export function freeTextBlockFlags(rawLines: readonly string[]): boolean[] {
  const flags = rawLines.map(() => false);
  for (let i = 0; i < rawLines.length; i++) {
    const opening = rawLines[i]!.trim();
    if (!opening.startsWith("<--") || opening.includes("-->")) continue;
    const close = rawLines.findIndex((line, j) => j > i && line.includes("-->"));
    if (close === -1) continue;
    for (let j = i; j <= close; j++) flags[j] = true;
    i = close;
  }
  return flags;
}

/** Builds a fresh, fully-hyphenated song from raw lyrics text. Every id is newly minted.
 *  An empty document has no lines at all (not one line with zero words), so consumers can
 *  detect it with `song.length === 0` and show the empty-document placeholder. */
export function buildSong(lyricsText: string, textLineIndexes: readonly number[] = []): Song {
  if (lyricsText === "") return [];
  const rawLines = lyricsText.split("\n");
  const inBlock = freeTextBlockFlags(rawLines);
  return rawLines.map((lineText, index) =>
    inBlock[index] ? { id: nextId("line"), words: [], freeText: lineText } : buildLine(lineText, textLineIndexes.includes(index)),
  );
}

/** `keepAsText` leaves a `TAB` as lyrics: one its author is still typing (so "TABLA" can still be
 *  written), or one that may not become a block (see `ReconcileOptions.textLineIndexes`). */
function buildLine(lineText: string, keepAsText = false): Line {
  if (!keepAsText && isTabLineText(lineText)) return { id: nextId("line"), words: [], tab: true };
  if (isSubtitleLineText(lineText)) return { id: nextId("line"), words: [], subtitle: lineText };
  if (isPartituraLinkText(lineText)) return { id: nextId("line"), words: [], partituraLink: lineText };
  if (isChordLineText(lineText)) return { id: nextId("line"), words: [], chordLine: lineText };
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

/** `index` 0 is the slot immediately after the line's last syllable; each higher index is one
 *  more chord stacked further right, for lines that carry more than one trailing chord. */
export function endSlotId(lineId: string, index = 0): string {
  return index === 0 ? `end:${lineId}` : `end:${lineId}:${index}`;
}

/** `index` 0 is the slot immediately before the line's first syllable; each higher index is one
 *  more chord stacked further left, for lines that carry more than one leading chord. */
export function startSlotId(lineId: string, index = 0): string {
  return index === 0 ? `start:${lineId}` : `start:${lineId}:${index}`;
}

/** Whether `slotId` is one of `lineId`'s start or end slots, at any index. Used to sweep up every
 *  leading/trailing chord a line carries (e.g. when the line itself is deleted), without needing
 *  to know how many of them it has. */
export function isLineEdgeSlot(lineId: string, slotId: string): boolean {
  return (
    slotId === startSlotId(lineId) ||
    slotId.startsWith(`start:${lineId}:`) ||
    slotId === endSlotId(lineId) ||
    slotId.startsWith(`end:${lineId}:`)
  );
}

function cellText(cells: CellsByTrack, trackId: TrackId, slotId: string): string {
  return cells[trackId]?.[slotId] ?? "";
}

/** The leading chord slots before `line`'s first syllable, nearest-to-syllable first: always at
 *  least `[startSlotId(line.id)]`, plus one more trailing empty slot for every already-filled one
 *  — the always-available dropzone for "one more chord before this one". */
export function startSlotIds(line: Line, cells: CellsByTrack, trackId: TrackId = "chords"): string[] {
  const ids = [startSlotId(line.id)];
  while (cellText(cells, trackId, ids[ids.length - 1]!).trim() !== "") {
    ids.push(startSlotId(line.id, ids.length));
  }
  return ids;
}

/** The trailing chord slots after `line`'s last syllable, nearest-to-syllable first. See
 *  `startSlotIds`. */
export function endSlotIds(line: Line, cells: CellsByTrack, trackId: TrackId = "chords"): string[] {
  const ids = [endSlotId(line.id)];
  while (cellText(cells, trackId, ids[ids.length - 1]!).trim() !== "") {
    ids.push(endSlotId(line.id, ids.length));
  }
  return ids;
}

export function beforeSlotId(syllableId: string): string {
  return `before:${syllableId}`;
}

/** The slot for the whitespace between two words, keyed by the last syllable of the word before
 * it (the same retained-id anchor `beforeSlotId` uses, so it survives edits to later words). */
export function gapSlotId(afterSyllableId: string): string {
  return `gap:${afterSyllableId}`;
}

/** `BIS` is a repeat mark, not a sung word: it never takes the syllable underline, a melisma or
 *  an annotation, wherever it appears in the line. */
export function isBisWord(word: Word): boolean {
  return word.syllables.map((syllable) => syllable.text).join("") === "BIS";
}

/** Free text, written between `<--` and `-->`: kept whole as one syllable, and like `BIS` it
 *  never takes the underline, a melisma or an annotation. */
export function isFreeTextWord(word: Word): boolean {
  return isFreeTextToken(word.syllables.map((syllable) => syllable.text).join(""));
}

/** A word that is not sung, so nothing can be annotated on or merged across it. */
export function isUnsungWord(word: Word): boolean {
  return isBisWord(word) || isFreeTextWord(word);
}

/** The slots of a line's unsung syllables, which never hold an annotation (see `isUnsungWord`). */
export function bisSlotIds(line: Line): Set<string> {
  return new Set(
    line.words.filter(isUnsungWord).flatMap((word) => word.syllables.map((syllable) => beforeSlotId(syllable.id))),
  );
}

/** The chord-track slot for a chord written at `column` above `rawLineText`, the exact text a
 * lyric line was built from. Walks the line's words/syllables left to right (in the same order
 * `buildLine` produced them from that text) and picks the last syllable starting at or before the
 * chord's column — i.e. the syllable the chord sits over, or the gap slot if it sits over the whitespace between two words. */
export function chordSlotForColumn(line: Line, rawLineText: string, column: number): string {
  const wordStarts = wordStartColumns(rawLineText);
  let bestSlotId: string | null = null;

  for (let i = 0; i < line.words.length && i < wordStarts.length; i++) {
    let offset = wordStarts[i];
    const bis = isUnsungWord(line.words[i]);
    const previous = line.words[i - 1]?.syllables.at(-1);
    for (const syllable of line.words[i].syllables) {
      // BIS and free text take no chord (see `isUnsungWord`), so one written over it moves to the space before it.
      if (offset <= column) {
        bestSlotId = !bis ? beforeSlotId(syllable.id) : previous ? gapSlotId(previous.id) : startSlotId(line.id);
      }
      offset += syllable.text.length;
    }
    // A chord written over the whitespace between this word and the next belongs to that gap.
    const lastSyllable = line.words[i].syllables[line.words[i].syllables.length - 1];
    if (lastSyllable && i + 1 < wordStarts.length && i + 1 < line.words.length) {
      if (column >= offset && column < wordStarts[i + 1]) return gapSlotId(lastSyllable.id);
    }
  }

  if (bestSlotId) return bestSlotId;
  // No syllable starts at or before this column, so the chord sits left of the first syllable
  // entirely (as opposed to merely aligning with it, which the loop above already handles).
  const firstSyllable = flattenSyllables(line)[0];
  return firstSyllable ? startSlotId(line.id) : endSlotId(line.id);
}

/** The inverse of `chordSlotForColumn`: the character column, within the line's own plain text
 * (words joined by single spaces), where `slotId` sits. Used to write a chord back out above its
 * lyric line (e.g. on copy) in the same column-aligned convention `chordSlotForColumn` reads. */
export function columnForSlot(line: Line, slotId: string): number {
  if (slotId === startSlotId(line.id)) return 0;
  let offset = 0;
  for (let i = 0; i < line.words.length; i++) {
    if (i > 0) offset += 1;
    for (const syllable of line.words[i].syllables) {
      if (beforeSlotId(syllable.id) === slotId) return offset;
      offset += syllable.text.length;
    }
    const lastSyllable = line.words[i].syllables[line.words[i].syllables.length - 1];
    if (lastSyllable && gapSlotId(lastSyllable.id) === slotId) return offset;
  }
  return offset;
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

/** The whitespace slots between adjacent words, in order. A boundary joined by an active melisma
 * is one unit with no gap of its own, so it has no slot. */
export function getLineGaps(
  line: Line,
  merges: ReadonlySet<string>,
): { slotId: string; afterSyllableId: string }[] {
  const gaps: { slotId: string; afterSyllableId: string }[] = [];
  for (let i = 0; i + 1 < line.words.length; i++) {
    const last = line.words[i].syllables[line.words[i].syllables.length - 1];
    const next = line.words[i + 1].syllables[0];
    if (!last || !next || merges.has(mergeKey(last.id, next.id))) continue;
    gaps.push({ slotId: gapSlotId(last.id), afterSyllableId: last.id });
  }
  return gaps;
}

/** All addressable annotation cell slots for a line, in left-to-right order. `cells` determines
 *  how many leading/trailing slots a line has (see `startSlotIds`/`endSlotIds`); omitting it
 *  falls back to exactly one of each, as if the line carried no leading/trailing chords yet.
 *  Word gaps sit between the units on either side of the whitespace they represent. */
export function getLineCellSlots(line: Line, merges: ReadonlySet<string>, cells: CellsByTrack = {}): string[] {
  const gapAfter = new Map(getLineGaps(line, merges).map((gap) => [gap.afterSyllableId, gap.slotId]));
  const starts = startSlotIds(line, cells);
  const ends = endSlotIds(line, cells);
  const middle: string[] = [];
  for (const unit of getLineUnits(line, merges)) {
    middle.push(unit.slotId);
    const gapSlot = gapAfter.get(unit.syllableIds[unit.syllableIds.length - 1]!);
    if (gapSlot) middle.push(gapSlot);
  }
  // starts/ends are nearest-to-syllable first; the leading group renders farthest-first so the
  // newest (still-empty) leading slot sits at the line's outer edge, same as the trailing group.
  return [...starts.slice().reverse(), ...middle, ...ends];
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

/** An annotation to move off a deleted syllable onto a kept one, when the target is free. */
export interface CarryOver {
  fromId: string;
  toId: string;
}

export interface ReconcileResult {
  syllables: Syllable[];
  droppedIds: string[];
  /** One entry per dropped syllable, naming the kept syllable that may inherit its annotations. */
  carryOvers: CarryOver[];
}

/**
 * Matches old syllables to a word's newly-hyphenated syllable texts so annotations survive the
 * edit. Syllables whose text is unchanged at the front or back (prefix/suffix) keep their id; in
 * the changed middle, old and new syllables are paired by position and the old id is reused with
 * its new text. Only when the word loses syllables are the leftover old ones dropped, and each
 * reports a `carryOver` to the nearest kept syllable before it (or the next one, if it was first)
 * so its annotations can move there instead of vanishing.
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

  const oldMiddle = oldSyllables.slice(prefix, n - suffix);
  const newMiddle = newTexts.slice(prefix, m - suffix);

  const syllables: Syllable[] = [];
  for (let i = 0; i < prefix; i += 1) syllables.push(oldSyllables[i]);
  newMiddle.forEach((text, i) => {
    const reused = oldMiddle[i];
    syllables.push(reused ? { ...reused, text } : buildSyllable(text));
  });
  for (let i = 0; i < suffix; i += 1) syllables.push(oldSyllables[n - suffix + i]);

  const droppedIds = oldMiddle.slice(newMiddle.length).map((s) => s.id);
  const target = syllables[Math.max(0, prefix + newMiddle.length - 1)];
  const carryOvers: CarryOver[] = target ? droppedIds.map((fromId) => ({ fromId, toId: target.id })) : [];

  return { syllables, droppedIds, carryOvers };
}

/** Where each of `slotIds` sits on `line`, as a phrase to finish a sentence like "Acorde C …":
 *  over a syllable ("sobre «na»"), between two words ("entre «na» y «no»"), or at either edge of
 *  the line. Syllables joined by a melisma read as one piece. Used to name annotation cells for
 *  screen readers, who can't see which syllable a cell is aligned to. */
export function describeSlotPositions(
  line: Line,
  merges: ReadonlySet<string>,
  slotIds: readonly string[],
): Map<string, string> {
  const syllables = flattenSyllables(line);
  const textById = new Map(syllables.map((syllable) => [syllable.id, syllable.text.trim()]));
  const gapAfter = new Map(getLineGaps(line, merges).map((gap) => [gap.slotId, gap.afterSyllableId]));
  const unitText = new Map(
    getLineUnits(line, merges).map((unit) => [
      unit.slotId,
      unit.syllableIds.map((id) => textById.get(id) ?? "").join(""),
    ]),
  );

  const positions = new Map<string, string>();
  for (const slotId of slotIds) {
    const afterSyllableId = gapAfter.get(slotId);
    if (slotId === startSlotId(line.id) || slotId.startsWith(`start:${line.id}:`)) {
      positions.set(slotId, "al principio del renglón");
    } else if (slotId === endSlotId(line.id) || slotId.startsWith(`end:${line.id}:`)) {
      positions.set(slotId, "al final del renglón");
    } else if (afterSyllableId !== undefined) {
      const index = syllables.findIndex((syllable) => syllable.id === afterSyllableId);
      positions.set(slotId, `entre «${syllables[index]?.text.trim() ?? ""}» y «${syllables[index + 1]?.text.trim() ?? ""}»`);
    } else {
      const text = unitText.get(slotId);
      positions.set(slotId, text ? `sobre «${text}»` : "en el renglón");
    }
  }
  return positions;
}
