import type { CarryOver } from "./model";
import {
  areAdjacent,
  beforeSlotId,
  buildSong,
  chordSlotForColumn,
  gapSlotId,
  flattenSyllables,
  getLineCellSlots,
  isSubtitleLineText,
  isTabLineText,
  isLineEdgeSlot,
  mergeKey,
  pruneMerges,
  reconcileWordSyllables,
  endSlotId,
  startSlotId,
} from "./model";
import { nextId } from "./ids";
import { isChordLineText, type ChordPlacement } from "./chordSheet";
import { isPartituraLinkText } from "./partituraLink";
import { hyphenateWord } from "./syllabify";
import type { BisGroup, CellsByTrack, EditorState, PitchDirection, Song, TabBlock, TrackId } from "./types";

/** Hints for rebuilding the document after a text edit, from the editor that made it. */
export interface ReconcileOptions {
  /** Lines that stay lyrics even if they read `TAB` (see `buildSong`): a typed `TAB` only becomes a
   *  block once its author leaves the line, and never on mobile. */
  textLineIndexes?: number[];
  /** The id of every tab block in the new text, in order: the block that line keeps, or `null`
   *  for a new one. Every `TAB` marker reads the same, so text alone can't tell which block a
   *  deletion removed. */
  tabIds?: (string | null)[];
}

/** A tab block content the paste brought in, for the `TAB` line at `lineIndex` of the new text. */
export interface PastedTab {
  lineIndex: number;
  block: TabBlock;
}

/** A block with one empty Tab: what a new `TAB` line holds. */
export const EMPTY_TAB_BLOCK: TabBlock = { tabs: [[]] };

/** One entry per tab line of `song`: the content it already had, or an empty block. Entries of
 *  blocks no longer in the song are dropped, so undo is what brings a deleted block back. */
function tabsForSong(song: Song, tabs: Record<string, TabBlock>): Record<string, TabBlock> {
  const next: Record<string, TabBlock> = {};
  for (const line of song) {
    if (line.tab) next[line.id] = tabs[line.id] ?? EMPTY_TAB_BLOCK;
  }
  return next;
}

function trackHasContent(cells: CellsByTrack, trackId: TrackId): boolean {
  const trackCells = cells[trackId];
  if (!trackCells) return false;
  return Object.values(trackCells).some((text) => text.trim() !== "");
}

const BIS_AT_LINE_END = /(?:^|\s)BIS\s*$/;

function validBisGroups(lyricsText: string, groups: BisGroup[] = []): BisGroup[] {
  const lines = lyricsText.split("\n");
  return groups.filter(
    ({ startLineIndex, endLineIndex }) =>
      startLineIndex >= 0 &&
      startLineIndex <= endLineIndex &&
      endLineIndex < lines.length &&
      BIS_AT_LINE_END.test(lines[endLineIndex] ?? ""),
  );
}

function toggleBis(
  state: EditorState,
  startLineIndex: number,
  endLineIndex: number,
  remove: boolean,
): EditorState {
  const lines = state.lyricsText.split("\n");
  if (
    startLineIndex < 0 ||
    endLineIndex < startLineIndex ||
    endLineIndex >= lines.length
  )
    return state;

  const lastLine = lines[endLineIndex]!;
  if (remove) {
    const groups = validBisGroups(state.lyricsText, state.bisGroups);
    const containingGroup = groups.find(
      (group) =>
        startLineIndex >= group.startLineIndex &&
        endLineIndex <= group.endLineIndex,
    );

    if (containingGroup) {
      const removesWholeGroup =
        startLineIndex === containingGroup.startLineIndex &&
        endLineIndex === containingGroup.endLineIndex;
      const remainingGroup = removesWholeGroup
        ? undefined
        : endLineIndex < containingGroup.endLineIndex
          ? { startLineIndex: endLineIndex + 1, endLineIndex: containingGroup.endLineIndex }
          : { startLineIndex: containingGroup.startLineIndex, endLineIndex: startLineIndex - 1 };

      if (remainingGroup && remainingGroup.endLineIndex !== containingGroup.endLineIndex) {
        lines[containingGroup.endLineIndex] = lines[containingGroup.endLineIndex]!.replace(
          /\s*BIS\s*$/,
          "",
        );
        const newLastLine = lines[remainingGroup.endLineIndex]!;
        lines[remainingGroup.endLineIndex] = `${newLastLine.trimEnd()}${newLastLine.trimEnd() ? " " : ""}BIS`;
      } else if (removesWholeGroup) {
        lines[containingGroup.endLineIndex] = lines[containingGroup.endLineIndex]!.replace(
          /\s*BIS\s*$/,
          "",
        );
      }

      const lyricsText = lines.join("\n");
      const reconciled = reconcileLyricsText(state, lyricsText);
      return {
        ...reconciled,
        bisGroups: validBisGroups(
          lyricsText,
          groups.flatMap((group) =>
            group === containingGroup ? (remainingGroup ? [remainingGroup] : []) : [group],
          ),
        ),
      };
    }

    if (!BIS_AT_LINE_END.test(lastLine)) return state;
    lines[endLineIndex] = lastLine.replace(/\s*BIS\s*$/, "");
  } else {
    if (BIS_AT_LINE_END.test(lastLine)) return state;
    lines[endLineIndex] = `${lastLine.trimEnd()}${lastLine.trimEnd() ? " " : ""}BIS`;
  }

  const lyricsText = lines.join("\n");
  const reconciled = reconcileLyricsText(state, lyricsText);
  return {
    ...reconciled,
    bisGroups: remove
      ? validBisGroups(lyricsText, state.bisGroups)
      : [...validBisGroups(lyricsText, state.bisGroups), { startLineIndex, endLineIndex }],
  };
}

export function createInitialState(): EditorState {
  return {
    title: "",
    author: "",
    lyricsText: "",
    song: [],
    bisGroups: [],
    merges: new Set(),
    tracks: [
      { id: "chordNotes", label: "Notas del acorde", visible: false },
      { id: "chords", label: "Acordes", visible: true },
      { id: "vocalNotes", label: "Notas de la melodía", visible: true },
    ],
    cells: {},
    chordVariants: {},
    pitchDirections: {},
    showUnderline: true,
    tabs: {},
  };
}

export type Action =
  | { type: "setTitle"; title: string }
  | { type: "setAuthor"; author: string }
  | { type: "setLyricsText"; text: string }
  | { type: "reconcileLyricsText"; text: string; options?: ReconcileOptions }
  | { type: "toggleBis"; startLineIndex: number; endLineIndex: number; remove: boolean }
  | {
      type: "pasteText";
      text: string;
      startLineIndex: number;
      startOffset: number;
      placements: ChordPlacement[];
      options?: ReconcileOptions;
      pastedTabs?: PastedTab[];
    }
  /** Rewrites the text of chord lines, by line id (e.g. transposed). */
  | { type: "setChordLineTexts"; texts: Record<string, string> }
  | { type: "setTabBlock"; lineId: string; block: TabBlock }
  | { type: "setTabSpacing"; lineId: string; spacing: number }
  | { type: "removeTabBlock"; lineId: string }
  | { type: "resyllabify"; lineId: string; wordId: string; newText: string }
  | { type: "toggleSyllableMerge"; lineId: string; aId: string; bId: string }
  | { type: "setCellText"; trackId: TrackId; slotId: string; text: string }
  | { type: "moveCellText"; trackId: TrackId; fromSlotId: string; toSlotId: string }
  | { type: "setChordVariant"; slotId: string; index: number }
  | { type: "dragPitchDirection"; slotId: string; direction: PitchDirection }
  | { type: "setTrackVisibility"; trackId: TrackId; visible: boolean }
  | { type: "setShowUnderline"; visible: boolean }
  | {
      type: "loadContent";
      content: Pick<
        EditorState,
        "title" | "author" | "lyricsText" | "song" | "cells" | "chordVariants" | "pitchDirections"
      > & {
        merges: Set<string>;
        bisGroups?: BisGroup[];
        tabs?: Record<string, TabBlock>;
      };
      // Whether this load is happening on a mobile device. The underline-default-on-notes rule
      // below is a desktop-only convenience — mobile always starts with the toggle off.
      isMobile: boolean;
    };

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "setTitle":
      return { ...state, title: action.title };

    case "setAuthor":
      return { ...state, author: action.author };

    case "setLyricsText": {
      const song = buildSong(action.text);
      return {
        ...state,
        lyricsText: action.text,
        song,
        bisGroups: [],
        merges: new Set(),
        cells: {},
        chordVariants: {},
        pitchDirections: {},
        tabs: tabsForSong(song, {}),
      };
    }

    case "reconcileLyricsText":
      return reconcileLyricsText(state, action.text, action.options);

    case "toggleBis":
      return toggleBis(state, action.startLineIndex, action.endLineIndex, action.remove);

    case "pasteText":
      return applyPasteText(
        state,
        action.text,
        action.startLineIndex,
        action.startOffset,
        action.placements,
        action.options,
        action.pastedTabs,
      );

    case "setChordLineTexts":
      return applySetChordLineTexts(state, action.texts);

    case "setTabBlock":
      if (!(action.lineId in state.tabs)) return state;
      return { ...state, tabs: { ...state.tabs, [action.lineId]: action.block } };

    case "setTabSpacing": {
      const block = state.tabs[action.lineId];
      if (!block || block.spacing === action.spacing) return state;
      return { ...state, tabs: { ...state.tabs, [action.lineId]: { ...block, spacing: action.spacing } } };
    }

    case "removeTabBlock":
      return removeTabBlock(state, action.lineId);

    case "resyllabify":
      return applyResyllabify(state, action.lineId, action.wordId, action.newText);

    case "toggleSyllableMerge":
      return applyToggleSyllableMerge(state, action.lineId, action.aId, action.bId);

    case "setCellText":
      return applySetCellText(
        state,
        action.trackId,
        action.slotId,
        // Melody notes are written in lowercase solfège ("do", "sol#"), whatever the keyboard
        // capitalizes on its own.
        action.trackId === "vocalNotes" ? action.text.toLowerCase() : action.text,
      );

    case "moveCellText":
      return applyMoveCellText(state, action.trackId, action.fromSlotId, action.toSlotId);

    case "setChordVariant":
      return {
        ...state,
        chordVariants: { ...state.chordVariants, [action.slotId]: action.index },
      };

    case "dragPitchDirection":
      return applyDragPitchDirection(state, action.slotId, action.direction);

    case "setTrackVisibility":
      return {
        ...state,
        tracks: state.tracks.map((track) =>
          track.id === action.trackId ? { ...track, visible: action.visible } : track,
        ),
      };

    case "setShowUnderline":
      return { ...state, showUnderline: action.visible };

    case "loadContent":
      // Songs saved before section labels were introduced contain regular syllables for these
      // lines. Upgrade them as they are opened, using the raw text as the source of truth.
      // Likewise, a `TAB` line saved as lyrics (before tab blocks existed, or while its author was
      // still on it) opens as an empty tab block.
      const loadedSong = action.content.song.map((line, index) => {
        const rawLine = action.content.lyricsText.split("\n")[index] ?? "";
        if (isTabLineText(rawLine)) return { id: line.id, words: [], tab: true as const };
        if (isSubtitleLineText(rawLine)) return { ...line, words: [], subtitle: rawLine };
        if (isPartituraLinkText(rawLine)) return { ...line, words: [], partituraLink: rawLine };
        if (isChordLineText(rawLine)) return { ...line, words: [], chordLine: rawLine };
        return line;
      });
      const loaded = chordLinesFromEmptyLines(
        action.content.lyricsText,
        loadedSong,
        action.content.cells,
        action.content.chordVariants,
        state.tracks,
      );
      return {
        ...state,
        title: action.content.title,
        author: action.content.author,
        lyricsText: loaded.lyricsText,
        song: loaded.song,
        bisGroups: validBisGroups(loaded.lyricsText, action.content.bisGroups),
        cells: loaded.cells,
        chordVariants: loaded.chordVariants,
        pitchDirections: action.content.pitchDirections,
        merges: pruneMerges(loadedSong, action.content.merges),
        tabs: tabsForSong(loadedSong, action.content.tabs ?? {}),
        // Track controls are view state rather than saved song content. Opening an existing
        // song starts in the focused chords view, plus any other track that already has
        // annotations (e.g. melody notes) so readers see them without toggling anything.
        tracks: state.tracks.map((track) => ({
          ...track,
          visible: track.id === "chords" || trackHasContent(action.content.cells, track.id),
        })),
        // The underline toggle now also drives the melody-notes track, so on desktop it must
        // start pressed whenever that track is already visible — otherwise the button reads as
        // off while the notes it controls are showing. Mobile is read-only-by-default territory
        // for this convenience: it always starts off there, regardless of existing notes.
        showUnderline: !action.isMobile && trackHasContent(action.content.cells, "vocalNotes"),
      };

    default:
      return state;
  }
}

/**
 * Rebuilds the document after a free-form edit while retaining the identities that can be
 * matched unambiguously. Lines and words are aligned by their ordered common prefix/suffix;
 * changed words then use the existing syllable prefix/suffix reconciliation.
 */
function reconcileLyricsText(state: EditorState, text: string, options: ReconcileOptions = {}): EditorState {
  const candidate = buildSong(text, options.textLineIndexes);
  const previous = state.song;
  const previousTexts = previous.map(lineText);
  const candidateTexts = candidate.map(lineText);

  let prefix = 0;
  while (
    prefix < previous.length &&
    prefix < candidate.length &&
    previousTexts[prefix] === candidateTexts[prefix]
  ) {
    prefix += 1;
  }

  let suffix = 0;
  while (
    suffix < previous.length - prefix &&
    suffix < candidate.length - prefix &&
    previousTexts[previous.length - 1 - suffix] === candidateTexts[candidate.length - 1 - suffix]
  ) {
    suffix += 1;
  }

  const carryOvers: CarryOver[] = [];
  const aligned = candidate.map((nextLine, index) => {
    if (index < prefix) return previous[index];
    if (index >= candidate.length - suffix) {
      return previous[previous.length - candidate.length + index];
    }

    const previousIndex = prefix + (index - prefix);
    const oldLine = previousIndex < previous.length - suffix ? previous[previousIndex] : undefined;
    return oldLine ? reconcileLine(oldLine, nextLine, carryOvers) : nextLine;
  });
  const song = options.tabIds ? withTabIds(aligned, options.tabIds) : aligned;

  const retainedSyllableIds = new Set(song.flatMap(flattenSyllables).map((syllable) => syllable.id));
  const retainedLineIds = new Set(song.map((line) => line.id));
  let cells = state.cells;
  let chordVariants = state.chordVariants;
  let pitchDirections = state.pitchDirections;
  for (const carryOver of carryOvers) {
    ({ cells, chordVariants, pitchDirections } = applyCarryOver(
      state.tracks,
      cells,
      chordVariants,
      pitchDirections,
      carryOver,
    ));
  }
  for (const line of previous) {
    if (!retainedLineIds.has(line.id)) {
      for (const slotId of collectLineEdgeSlotIds(state.tracks, cells, chordVariants, line.id)) {
        cells = deleteCellAcrossTracks(state.tracks, cells, slotId);
        chordVariants = deleteChordVariant(chordVariants, slotId);
        pitchDirections = deletePitchDirection(pitchDirections, slotId);
      }
    }
    for (const syllable of flattenSyllables(line)) {
      if (!retainedSyllableIds.has(syllable.id)) {
        for (const slotId of [beforeSlotId(syllable.id), gapSlotId(syllable.id)]) {
          cells = deleteCellAcrossTracks(state.tracks, cells, slotId);
          chordVariants = deleteChordVariant(chordVariants, slotId);
          pitchDirections = deletePitchDirection(pitchDirections, slotId);
        }
      }
    }
  }

  return {
    ...state,
    lyricsText: text,
    song,
    bisGroups: validBisGroups(text, state.bisGroups),
    cells,
    chordVariants,
    pitchDirections,
    merges: pruneMerges(song, state.merges),
    tabs: tabsForSong(song, state.tabs),
  };
}

/** Gives the tab lines of `song`, in order, the ids an editor knows they have. */
function withTabIds(song: Song, tabIds: (string | null)[]): Song {
  let index = 0;
  return song.map((line) => {
    if (!line.tab) return line;
    const id = tabIds[index++];
    return { ...line, id: id ?? nextId("line") };
  });
}

/** The ids of `song`'s tab blocks, in order. */
export function tabLineIds(song: Song): string[] {
  return song.filter((line) => line.tab).map((line) => line.id);
}

/** Deletes a tab block along with its marker line. */
function removeTabBlock(state: EditorState, lineId: string): EditorState {
  const index = state.song.findIndex((line) => line.id === lineId && line.tab);
  if (index === -1) return state;
  const lines = state.lyricsText.split("\n");
  lines.splice(index, 1);
  return reconcileLyricsText(state, lines.join("\n"), {
    tabIds: tabLineIds(state.song).filter((id) => id !== lineId),
  });
}

/**
 * Reconciles the document after a paste, then seeds the chords track with any chord placements
 * detected above the pasted lyrics (see `parseChordSheet`). `startLineIndex`/`startOffset` locate
 * where the pasted (already chord-stripped) lyrics landed in the new document, so each
 * placement's line-relative position can be translated into an actual song line and column.
 */
function applyPasteText(
  state: EditorState,
  text: string,
  startLineIndex: number,
  startOffset: number,
  placements: ChordPlacement[],
  options?: ReconcileOptions,
  pastedTabs: PastedTab[] = [],
): EditorState {
  let next = reconcileLyricsText(state, text, options);
  for (const { lineIndex, block } of pastedTabs) {
    const line = next.song[lineIndex];
    if (line?.tab) next = { ...next, tabs: { ...next.tabs, [line.id]: block } };
  }
  if (placements.length === 0) return next;

  const lines = text.split("\n");
  let cells = next.cells;
  for (const placement of placements) {
    const songLineIndex = startLineIndex + placement.lineIndex;
    const line = next.song[songLineIndex];
    if (!line) continue;
    const column = placement.column + (placement.lineIndex === 0 ? startOffset : 0);
    const slotId = chordSlotForColumn(line, lines[songLineIndex] ?? "", column);
    cells = setCell(cells, "chords", slotId, placement.chord);
  }

  // Pasting a chord sheet implies the user wants to see the chords they just pasted, so reveal
  // the chords track automatically. The chord-note-names track is a separate, unrelated setting
  // and is left untouched.
  const tracks = next.tracks.map((track) =>
    track.id === "chords" ? { ...track, visible: true } : track,
  );

  return { ...next, cells, tracks };
}

/** What a tab block's line is matched by: no lyric line can read this. */
const TAB_BLOCK_MATCH_KEY = "\u0000tab";

/** The text two versions of a line are matched by. A tab block never matches a lyric line, not
 *  even a `TAB` its author is still typing. */
function lineText(line: EditorState["song"][number]): string {
  if (line.tab) return TAB_BLOCK_MATCH_KEY;
  if (line.subtitle !== undefined) return line.subtitle;
  if (line.chordLine !== undefined) return line.chordLine;
  if (line.partituraLink !== undefined) return line.partituraLink;
  return line.words.map((word) => word.syllables.map((syllable) => syllable.text).join("")).join(" ");
}

function reconcileLine(
  oldLine: EditorState["song"][number],
  nextLine: EditorState["song"][number],
  carryOvers: CarryOver[],
) {
  // A tab block keeps its identity, and with it its content. A line that becomes or stops being
  // one is a different line: the block's id must not end up on lyrics, or its content on a new block.
  if (oldLine.tab || nextLine.tab) return oldLine.tab && nextLine.tab ? oldLine : nextLine;
  // Section labels and chord lines have no syllable identities to reconcile. Retain the line
  // identity so the editor keeps its DOM position when a normal line becomes (or stops being) one.
  if (
    oldLine.subtitle !== undefined ||
    nextLine.subtitle !== undefined ||
    oldLine.chordLine !== undefined ||
    nextLine.chordLine !== undefined ||
    oldLine.partituraLink !== undefined ||
    nextLine.partituraLink !== undefined
  ) {
    return { ...nextLine, id: oldLine.id };
  }
  const oldWords = oldLine.words;
  const nextWords = nextLine.words;
  const oldTexts = oldWords.map((word) => word.syllables.map((syllable) => syllable.text).join(""));
  const nextTexts = nextWords.map((word) => word.syllables.map((syllable) => syllable.text).join(""));

  let prefix = 0;
  while (prefix < oldWords.length && prefix < nextWords.length && oldTexts[prefix] === nextTexts[prefix]) prefix += 1;
  let suffix = 0;
  while (
    suffix < oldWords.length - prefix &&
    suffix < nextWords.length - prefix &&
    oldTexts[oldWords.length - 1 - suffix] === nextTexts[nextWords.length - 1 - suffix]
  ) suffix += 1;

  const words = nextWords.map((nextWord, index) => {
    if (index < prefix) return oldWords[index];
    if (index >= nextWords.length - suffix) return oldWords[oldWords.length - nextWords.length + index];
    const oldIndex = prefix + (index - prefix);
    const oldWord = oldIndex < oldWords.length - suffix ? oldWords[oldIndex] : undefined;
    if (!oldWord) return nextWord;
    const { syllables, carryOvers: wordCarryOvers } = reconcileWordSyllables(
      oldWord.syllables,
      nextWord.syllables.map((syllable) => syllable.text),
    );
    carryOvers.push(...wordCarryOvers);
    return { ...oldWord, syllables };
  });

  return { ...oldLine, words };
}

function getCell(cells: CellsByTrack, trackId: TrackId, slotId: string): string {
  return cells[trackId]?.[slotId] ?? "";
}

function setCell(cells: CellsByTrack, trackId: TrackId, slotId: string, text: string): CellsByTrack {
  return {
    ...cells,
    [trackId]: { ...cells[trackId], [slotId]: text },
  };
}

function deleteCell(cells: CellsByTrack, trackId: TrackId, slotId: string): CellsByTrack {
  if (!(slotId in (cells[trackId] ?? {}))) return cells;
  const nextTrackCells = { ...cells[trackId] };
  delete nextTrackCells[slotId];
  return { ...cells, [trackId]: nextTrackCells };
}

/** Songs saved before chord lines existed kept a row of chords with no lyrics on the edges of an
 *  empty line, which no longer offers chord slots. Each such line opens as a chord line holding
 *  those chords, in order. */
function chordLinesFromEmptyLines(
  lyricsText: string,
  song: Song,
  cells: CellsByTrack,
  chordVariants: Record<string, number>,
  tracks: EditorState["tracks"],
): Pick<EditorState, "lyricsText" | "song" | "cells" | "chordVariants"> {
  const rawLines = lyricsText.split("\n");
  let nextCells = cells;
  let nextVariants = chordVariants;
  let changed = false;
  const nextSong = song.map((line, index) => {
    if (line.tab || line.subtitle !== undefined || line.chordLine !== undefined || line.partituraLink !== undefined) return line;
    if ((rawLines[index] ?? "").trim() !== "") return line;
    const chords = getLineCellSlots(line, new Set(), cells)
      .map((slotId) => getCell(cells, "chords", slotId).trim())
      .filter((chord) => chord !== "");
    if (chords.length === 0) return line;
    for (const slotId of collectLineEdgeSlotIds(tracks, nextCells, nextVariants, line.id)) {
      nextCells = deleteCellAcrossTracks(tracks, nextCells, slotId);
      nextVariants = deleteChordVariant(nextVariants, slotId);
    }
    changed = true;
    rawLines[index] = chords.join("  ");
    return { id: line.id, words: [], chordLine: rawLines[index] };
  });
  if (!changed) return { lyricsText, song, cells, chordVariants };
  return { lyricsText: rawLines.join("\n"), song: nextSong, cells: nextCells, chordVariants: nextVariants };
}

function applySetChordLineTexts(state: EditorState, texts: Record<string, string>): EditorState {
  const rawLines = state.lyricsText.split("\n");
  let changed = false;
  const song = state.song.map((line, index) => {
    const text = texts[line.id];
    if (line.chordLine === undefined || text === undefined || text === line.chordLine) return line;
    changed = true;
    rawLines[index] = text;
    return { ...line, chordLine: text };
  });
  return changed ? { ...state, song, lyricsText: rawLines.join("\n") } : state;
}

/** Every start/end slot id a deleted line left behind, at whatever indices it had accumulated
 *  (see `startSlotIds`/`endSlotIds`) — gathered from wherever they might still be referenced,
 *  since a line can carry more than one leading/trailing chord. */
function collectLineEdgeSlotIds(
  tracks: EditorState["tracks"],
  cells: CellsByTrack,
  chordVariants: Record<string, number>,
  lineId: string,
): string[] {
  const slotIds = new Set<string>();
  for (const track of tracks) {
    for (const slotId of Object.keys(cells[track.id] ?? {})) {
      if (isLineEdgeSlot(lineId, slotId)) slotIds.add(slotId);
    }
  }
  for (const slotId of Object.keys(chordVariants)) {
    if (isLineEdgeSlot(lineId, slotId)) slotIds.add(slotId);
  }
  return Array.from(slotIds);
}

function deleteCellAcrossTracks(tracks: EditorState["tracks"], cells: CellsByTrack, slotId: string): CellsByTrack {
  let next = cells;
  for (const track of tracks) {
    next = deleteCell(next, track.id, slotId);
  }
  return next;
}

function deleteChordVariant(chordVariants: Record<string, number>, slotId: string): Record<string, number> {
  if (!(slotId in chordVariants)) return chordVariants;
  const next = { ...chordVariants };
  delete next[slotId];
  return next;
}

function deletePitchDirection(
  pitchDirections: Record<string, PitchDirection>,
  slotId: string,
): Record<string, PitchDirection> {
  if (!(slotId in pitchDirections)) return pitchDirections;
  const next = { ...pitchDirections };
  delete next[slotId];
  return next;
}

/** The indicator travels with its note: the destination ends up with the source's indicator, or
 *  none if the source had none (the note that used to be there is overwritten). */
function movePitchDirection(
  pitchDirections: Record<string, PitchDirection>,
  fromSlotId: string,
  toSlotId: string,
): Record<string, PitchDirection> {
  if (!(fromSlotId in pitchDirections)) return deletePitchDirection(pitchDirections, toSlotId);
  const next = deletePitchDirection({ ...pitchDirections }, fromSlotId);
  next[toSlotId] = pitchDirections[fromSlotId]!;
  return next;
}

/**
 * A drag on a note toward `direction`: sets the indicator when there is none, removes it when the
 * drag opposes it, and leaves it alone when the drag agrees with it. Only a non-empty vocal note
 * can carry one.
 */
function applyDragPitchDirection(state: EditorState, slotId: string, direction: PitchDirection): EditorState {
  if (getCell(state.cells, "vocalNotes", slotId).trim() === "") return state;
  const current = state.pitchDirections[slotId];
  if (current === direction) return state;
  if (current === undefined) {
    return { ...state, pitchDirections: { ...state.pitchDirections, [slotId]: direction } };
  }
  return { ...state, pitchDirections: deletePitchDirection(state.pitchDirections, slotId) };
}

function moveChordVariant(
  chordVariants: Record<string, number>,
  fromSlotId: string,
  toSlotId: string,
): Record<string, number> {
  if (!(fromSlotId in chordVariants)) return deleteChordVariant(chordVariants, toSlotId);
  const next = deleteChordVariant({ ...chordVariants }, fromSlotId);
  next[toSlotId] = chordVariants[fromSlotId];
  return next;
}

/** The zero-indexed edge slot is the one closest to the lyric. Once it is emptied, every
 * following edge slot moves one step inward so the visible chain remains contiguous. */
function compactEdgeSlots(
  state: EditorState,
  trackId: TrackId,
  cells: CellsByTrack,
  chordVariants: Record<string, number>,
  pitchDirections: Record<string, PitchDirection>,
  slotId: string,
): Pick<EditorState, "cells" | "chordVariants" | "pitchDirections"> {
  const edge = state.song.flatMap((line) => [
    { baseSlotId: startSlotId(line.id), slotAt: (index: number) => startSlotId(line.id, index) },
    { baseSlotId: endSlotId(line.id), slotAt: (index: number) => endSlotId(line.id, index) },
  ]).find(({ baseSlotId }) => baseSlotId === slotId);
  if (!edge) return { cells, chordVariants, pitchDirections };

  const trackCells = cells[trackId] ?? {};
  const edgeIndices = new Set<number>();
  const edgeIndex = (candidate: string) => {
    const suffix = candidate.slice(edge.baseSlotId.length + 1);
    if (!candidate.startsWith(`${edge.baseSlotId}:`) || !/^\d+$/.test(suffix)) return null;
    return Number(suffix);
  };
  for (const candidate of Object.keys(trackCells)) {
    const index = edgeIndex(candidate);
    if (index !== null && index > 0) edgeIndices.add(index);
  }
  if (trackId === "chords") {
    for (const candidate of Object.keys(chordVariants)) {
      const index = edgeIndex(candidate);
      if (index !== null && index > 0) edgeIndices.add(index);
    }
  }
  const highestIndex = Math.max(0, ...edgeIndices);
  if (highestIndex === 0) return { cells, chordVariants, pitchDirections };

  const nextTrackCells = { ...trackCells };
  const nextChordVariants = { ...chordVariants };
  const nextPitchDirections = { ...pitchDirections };
  for (let index = 0; index < highestIndex; index += 1) {
    const destination = edge.slotAt(index);
    const source = edge.slotAt(index + 1);
    const text = trackCells[source];
    if (text) nextTrackCells[destination] = text;
    else delete nextTrackCells[destination];

    if (trackId === "chords") {
      if (source in chordVariants) nextChordVariants[destination] = chordVariants[source]!;
      else delete nextChordVariants[destination];
    }
    if (trackId === "vocalNotes") {
      if (source in pitchDirections) nextPitchDirections[destination] = pitchDirections[source]!;
      else delete nextPitchDirections[destination];
    }
  }
  delete nextTrackCells[edge.slotAt(highestIndex)];
  if (trackId === "chords") delete nextChordVariants[edge.slotAt(highestIndex)];
  if (trackId === "vocalNotes") delete nextPitchDirections[edge.slotAt(highestIndex)];

  return {
    cells: { ...cells, [trackId]: nextTrackCells },
    chordVariants: trackId === "chords" ? nextChordVariants : chordVariants,
    pitchDirections: trackId === "vocalNotes" ? nextPitchDirections : pitchDirections,
  };
}

function applySetCellText(state: EditorState, trackId: TrackId, slotId: string, text: string): EditorState {
  const cells = setCell(state.cells, trackId, slotId, text);
  if (text !== "") return { ...state, cells };
  const pitchDirections =
    trackId === "vocalNotes" ? deletePitchDirection(state.pitchDirections, slotId) : state.pitchDirections;
  const compacted = compactEdgeSlots(state, trackId, cells, state.chordVariants, pitchDirections, slotId);
  return { ...state, ...compacted };
}

/**
 * Moves the annotations of a deleted syllable onto the kept syllable that inherits them. The kept
 * syllable's own annotation always wins: a track's cell only moves when the destination is empty
 * there, and a chord's variant travels with the chord. Callers delete whatever is left behind.
 */
function applyCarryOver(
  tracks: EditorState["tracks"],
  cells: CellsByTrack,
  chordVariants: Record<string, number>,
  pitchDirections: Record<string, PitchDirection>,
  { fromId, toId }: CarryOver,
): Pick<EditorState, "cells" | "chordVariants" | "pitchDirections"> {
  for (const slotFor of [beforeSlotId, gapSlotId]) {
    const from = slotFor(fromId);
    const to = slotFor(toId);
    for (const track of tracks) {
      const text = getCell(cells, track.id, from);
      if (!text || getCell(cells, track.id, to)) continue;
      cells = setCell(deleteCell(cells, track.id, from), track.id, to, text);
      if (track.id === "chords" && from in chordVariants) {
        chordVariants = moveChordVariant(chordVariants, from, to);
      }
      if (track.id === "vocalNotes") pitchDirections = movePitchDirection(pitchDirections, from, to);
    }
  }
  return { cells, chordVariants, pitchDirections };
}

function applyResyllabify(state: EditorState, lineId: string, wordId: string, newText: string): EditorState {
  const line = state.song.find((l) => l.id === lineId);
  const word = line?.words.find((w) => w.id === wordId);
  if (!line || !word) return state;

  const newTexts = hyphenateWord(newText);
  const { syllables, droppedIds, carryOvers } = reconcileWordSyllables(word.syllables, newTexts);

  const song = state.song.map((l) =>
    l.id !== lineId
      ? l
      : { ...l, words: l.words.map((w) => (w.id === wordId ? { ...w, syllables } : w)) },
  );

  let cells = state.cells;
  let chordVariants = state.chordVariants;
  let pitchDirections = state.pitchDirections;
  for (const carryOver of carryOvers) {
    ({ cells, chordVariants, pitchDirections } = applyCarryOver(
      state.tracks,
      cells,
      chordVariants,
      pitchDirections,
      carryOver,
    ));
  }
  for (const droppedId of droppedIds) {
    for (const slotId of [beforeSlotId(droppedId), gapSlotId(droppedId)]) {
      cells = deleteCellAcrossTracks(state.tracks, cells, slotId);
      chordVariants = deleteChordVariant(chordVariants, slotId);
      pitchDirections = deletePitchDirection(pitchDirections, slotId);
    }
  }

  const merges = pruneMerges(song, state.merges);

  return { ...state, song, cells, chordVariants, pitchDirections, merges };
}

function applyToggleSyllableMerge(state: EditorState, lineId: string, aId: string, bId: string): EditorState {
  const line = state.song.find((l) => l.id === lineId);
  if (!line || !areAdjacent(line, aId, bId)) return state;

  const key = mergeKey(aId, bId);
  const merges = new Set(state.merges);

  if (merges.has(key)) {
    merges.delete(key);
    return { ...state, merges };
  }

  merges.add(key);

  // The merged unit displays annotations at its leftmost syllable's slot (see getLineUnits), so
  // that's the one surviving cell. Walk out to the full run this merge now joins — it may
  // already span more than aId/bId if either side was already part of a melisma — and carry
  // over the first (leftmost) non-empty annotation in the run, per track, before dropping the rest.
  const flat = flattenSyllables(line);
  const aIndex = flat.findIndex((syllable) => syllable.id === aId);
  let start = aIndex;
  while (start > 0 && merges.has(mergeKey(flat[start - 1].id, flat[start].id))) start -= 1;
  let end = aIndex;
  while (end + 1 < flat.length && merges.has(mergeKey(flat[end].id, flat[end + 1].id))) end += 1;
  const groupIds = flat.slice(start, end + 1).map((syllable) => syllable.id);
  const [anchorId, ...restIds] = groupIds;
  const anchorSlot = beforeSlotId(anchorId);

  // The indicator follows whichever vocal note survives in the anchor slot.
  let pitchDirections = state.pitchDirections;
  if (!getCell(state.cells, "vocalNotes", anchorSlot)) {
    const carriedRestId = restIds.find((id) => getCell(state.cells, "vocalNotes", beforeSlotId(id)));
    if (carriedRestId) pitchDirections = movePitchDirection(pitchDirections, beforeSlotId(carriedRestId), anchorSlot);
  }
  for (const id of restIds) {
    pitchDirections = deletePitchDirection(pitchDirections, beforeSlotId(id));
  }
  for (const id of groupIds.slice(0, -1)) {
    pitchDirections = deletePitchDirection(pitchDirections, gapSlotId(id));
  }

  let cells = state.cells;
  for (const track of state.tracks) {
    if (!getCell(cells, track.id, anchorSlot)) {
      const carried = restIds.map((id) => getCell(cells, track.id, beforeSlotId(id))).find((text) => text);
      if (carried) cells = setCell(cells, track.id, anchorSlot, carried);
    }
    for (const id of restIds) {
      cells = deleteCell(cells, track.id, beforeSlotId(id));
    }
    // The joined run no longer has whitespace slots between its syllables.
    for (const id of groupIds.slice(0, -1)) {
      cells = deleteCell(cells, track.id, gapSlotId(id));
    }
  }

  let chordVariants = state.chordVariants;
  if (!(anchorSlot in chordVariants)) {
    const carriedRestId = restIds.find((id) => beforeSlotId(id) in chordVariants);
    if (carriedRestId) chordVariants = { ...chordVariants, [anchorSlot]: chordVariants[beforeSlotId(carriedRestId)] };
  }
  for (const id of restIds) {
    chordVariants = deleteChordVariant(chordVariants, beforeSlotId(id));
  }
  for (const id of groupIds.slice(0, -1)) {
    chordVariants = deleteChordVariant(chordVariants, gapSlotId(id));
  }

  return { ...state, merges, cells, chordVariants, pitchDirections };
}

function applyMoveCellText(
  state: EditorState,
  trackId: TrackId,
  fromSlotId: string,
  toSlotId: string,
): EditorState {
  const text = getCell(state.cells, trackId, fromSlotId);
  let cells = deleteCell(state.cells, trackId, fromSlotId);
  cells = setCell(cells, trackId, toSlotId, text);

  const chordVariants =
    trackId === "chords" ? moveChordVariant(state.chordVariants, fromSlotId, toSlotId) : state.chordVariants;
  const pitchDirections =
    trackId === "vocalNotes"
      ? movePitchDirection(state.pitchDirections, fromSlotId, toSlotId)
      : state.pitchDirections;
  const compacted = compactEdgeSlots(state, trackId, cells, chordVariants, pitchDirections, fromSlotId);

  return { ...state, ...compacted };
}

export { getCell };
