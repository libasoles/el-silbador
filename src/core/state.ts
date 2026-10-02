import type { CarryOver } from "./model";
import {
  areAdjacent,
  beforeSlotId,
  buildSong,
  chordSlotForColumn,
  gapSlotId,
  flattenSyllables,
  isLineEdgeSlot,
  mergeKey,
  pruneMerges,
  reconcileWordSyllables,
  endSlotId,
  startSlotId,
} from "./model";
import type { ChordPlacement } from "./chordSheet";
import { hyphenateWord } from "./syllabify";
import type { CellsByTrack, EditorState, TrackId } from "./types";

function trackHasContent(cells: CellsByTrack, trackId: TrackId): boolean {
  const trackCells = cells[trackId];
  if (!trackCells) return false;
  return Object.values(trackCells).some((text) => text.trim() !== "");
}

export function createInitialState(): EditorState {
  return {
    title: "",
    author: "",
    lyricsText: "",
    song: [],
    merges: new Set(),
    tracks: [
      { id: "chordNotes", label: "Notas del acorde", visible: false },
      { id: "chords", label: "Acordes", visible: true },
      { id: "vocalNotes", label: "Notas de la melodía", visible: true },
    ],
    cells: {},
    chordVariants: {},
    showUnderline: true,
  };
}

export type Action =
  | { type: "setTitle"; title: string }
  | { type: "setAuthor"; author: string }
  | { type: "setLyricsText"; text: string }
  | { type: "reconcileLyricsText"; text: string }
  | {
      type: "pasteText";
      text: string;
      startLineIndex: number;
      startOffset: number;
      placements: ChordPlacement[];
    }
  | { type: "resyllabify"; lineId: string; wordId: string; newText: string }
  | { type: "toggleSyllableMerge"; lineId: string; aId: string; bId: string }
  | { type: "setCellText"; trackId: TrackId; slotId: string; text: string }
  | { type: "moveCellText"; trackId: TrackId; fromSlotId: string; toSlotId: string }
  | { type: "setChordVariant"; slotId: string; index: number }
  | { type: "setTrackVisibility"; trackId: TrackId; visible: boolean }
  | { type: "setShowUnderline"; visible: boolean }
  | {
      type: "loadContent";
      content: Pick<EditorState, "title" | "author" | "lyricsText" | "song" | "cells" | "chordVariants"> & {
        merges: Set<string>;
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

    case "setLyricsText":
      return {
        ...state,
        lyricsText: action.text,
        song: buildSong(action.text),
        merges: new Set(),
        cells: {},
        chordVariants: {},
      };

    case "reconcileLyricsText":
      return reconcileLyricsText(state, action.text);

    case "pasteText":
      return applyPasteText(state, action.text, action.startLineIndex, action.startOffset, action.placements);

    case "resyllabify":
      return applyResyllabify(state, action.lineId, action.wordId, action.newText);

    case "toggleSyllableMerge":
      return applyToggleSyllableMerge(state, action.lineId, action.aId, action.bId);

    case "setCellText":
      return applySetCellText(state, action.trackId, action.slotId, action.text);

    case "moveCellText":
      return applyMoveCellText(state, action.trackId, action.fromSlotId, action.toSlotId);

    case "setChordVariant":
      return {
        ...state,
        chordVariants: { ...state.chordVariants, [action.slotId]: action.index },
      };

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
      return {
        ...state,
        title: action.content.title,
        author: action.content.author,
        lyricsText: action.content.lyricsText,
        song: action.content.song,
        cells: action.content.cells,
        chordVariants: action.content.chordVariants,
        merges: action.content.merges,
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
function reconcileLyricsText(state: EditorState, text: string): EditorState {
  const candidate = buildSong(text);
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
  const song = candidate.map((nextLine, index) => {
    if (index < prefix) return previous[index];
    if (index >= candidate.length - suffix) {
      return previous[previous.length - candidate.length + index];
    }

    const previousIndex = prefix + (index - prefix);
    const oldLine = previousIndex < previous.length - suffix ? previous[previousIndex] : undefined;
    return oldLine ? reconcileLine(oldLine, nextLine, carryOvers) : nextLine;
  });

  const retainedSyllableIds = new Set(song.flatMap(flattenSyllables).map((syllable) => syllable.id));
  const retainedLineIds = new Set(song.map((line) => line.id));
  let cells = state.cells;
  let chordVariants = state.chordVariants;
  for (const carryOver of carryOvers) {
    ({ cells, chordVariants } = applyCarryOver(state.tracks, cells, chordVariants, carryOver));
  }
  for (const line of previous) {
    if (!retainedLineIds.has(line.id)) {
      for (const slotId of collectLineEdgeSlotIds(state.tracks, cells, chordVariants, line.id)) {
        cells = deleteCellAcrossTracks(state.tracks, cells, slotId);
        chordVariants = deleteChordVariant(chordVariants, slotId);
      }
    }
    for (const syllable of flattenSyllables(line)) {
      if (!retainedSyllableIds.has(syllable.id)) {
        for (const slotId of [beforeSlotId(syllable.id), gapSlotId(syllable.id)]) {
          cells = deleteCellAcrossTracks(state.tracks, cells, slotId);
          chordVariants = deleteChordVariant(chordVariants, slotId);
        }
      }
    }
  }

  return { ...state, lyricsText: text, song, cells, chordVariants, merges: pruneMerges(song, state.merges) };
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
): EditorState {
  const next = reconcileLyricsText(state, text);
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

function lineText(line: EditorState["song"][number]): string {
  return line.words.map((word) => word.syllables.map((syllable) => syllable.text).join("")).join(" ");
}

function reconcileLine(
  oldLine: EditorState["song"][number],
  nextLine: EditorState["song"][number],
  carryOvers: CarryOver[],
) {
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
  slotId: string,
): Pick<EditorState, "cells" | "chordVariants"> {
  const edge = state.song.flatMap((line) => [
    { baseSlotId: startSlotId(line.id), slotAt: (index: number) => startSlotId(line.id, index) },
    { baseSlotId: endSlotId(line.id), slotAt: (index: number) => endSlotId(line.id, index) },
  ]).find(({ baseSlotId }) => baseSlotId === slotId);
  if (!edge) return { cells, chordVariants };

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
  if (highestIndex === 0) return { cells, chordVariants };

  const nextTrackCells = { ...trackCells };
  const nextChordVariants = { ...chordVariants };
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
  }
  delete nextTrackCells[edge.slotAt(highestIndex)];
  if (trackId === "chords") delete nextChordVariants[edge.slotAt(highestIndex)];

  return {
    cells: { ...cells, [trackId]: nextTrackCells },
    chordVariants: trackId === "chords" ? nextChordVariants : chordVariants,
  };
}

function applySetCellText(state: EditorState, trackId: TrackId, slotId: string, text: string): EditorState {
  const cells = setCell(state.cells, trackId, slotId, text);
  if (text !== "") return { ...state, cells };
  const compacted = compactEdgeSlots(state, trackId, cells, state.chordVariants, slotId);
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
  { fromId, toId }: CarryOver,
): Pick<EditorState, "cells" | "chordVariants"> {
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
    }
  }
  return { cells, chordVariants };
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
  for (const carryOver of carryOvers) {
    ({ cells, chordVariants } = applyCarryOver(state.tracks, cells, chordVariants, carryOver));
  }
  for (const droppedId of droppedIds) {
    for (const slotId of [beforeSlotId(droppedId), gapSlotId(droppedId)]) {
      cells = deleteCellAcrossTracks(state.tracks, cells, slotId);
      chordVariants = deleteChordVariant(chordVariants, slotId);
    }
  }

  const merges = pruneMerges(song, state.merges);

  return { ...state, song, cells, chordVariants, merges };
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

  return { ...state, merges, cells, chordVariants };
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
  const compacted = compactEdgeSlots(state, trackId, cells, chordVariants, fromSlotId);

  return { ...state, ...compacted };
}

export { getCell };
