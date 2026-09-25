import {
  areAdjacent,
  beforeSlotId,
  buildSong,
  chordSlotForColumn,
  endSlotId,
  flattenSyllables,
  mergeKey,
  pruneMerges,
  reconcileWordSyllables,
} from "./model";
import type { ChordPlacement } from "./chordSheet";
import { hyphenateWord } from "./syllabify";
import type { CellsByTrack, EditorState, TrackId } from "./types";

export function createInitialState(): EditorState {
  return {
    title: "",
    author: "",
    lyricsText: "",
    song: [],
    merges: new Set(),
    tracks: [
      { id: "chords", label: "Acordes", visible: true },
      { id: "chordNotes", label: "Notas del acorde", visible: true },
    ],
    cells: {},
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
  | { type: "setTrackVisibility"; trackId: TrackId; visible: boolean }
  | { type: "setShowUnderline"; visible: boolean };

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
      return {
        ...state,
        cells: setCell(state.cells, action.trackId, action.slotId, action.text),
      };

    case "moveCellText":
      return applyMoveCellText(state, action.trackId, action.fromSlotId, action.toSlotId);

    case "setTrackVisibility":
      return {
        ...state,
        tracks: state.tracks.map((track) =>
          track.id === action.trackId ? { ...track, visible: action.visible } : track,
        ),
      };

    case "setShowUnderline":
      return { ...state, showUnderline: action.visible };

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

  const song = candidate.map((nextLine, index) => {
    if (index < prefix) return previous[index];
    if (index >= candidate.length - suffix) {
      return previous[previous.length - candidate.length + index];
    }

    const previousIndex = prefix + (index - prefix);
    const oldLine = previousIndex < previous.length - suffix ? previous[previousIndex] : undefined;
    return oldLine ? reconcileLine(oldLine, nextLine) : nextLine;
  });

  const retainedSyllableIds = new Set(song.flatMap(flattenSyllables).map((syllable) => syllable.id));
  const retainedLineIds = new Set(song.map((line) => line.id));
  let cells = state.cells;
  for (const line of previous) {
    if (!retainedLineIds.has(line.id)) cells = deleteCellAcrossTracks(state.tracks, cells, endSlotId(line.id));
    for (const syllable of flattenSyllables(line)) {
      if (!retainedSyllableIds.has(syllable.id)) {
        cells = deleteCellAcrossTracks(state.tracks, cells, beforeSlotId(syllable.id));
      }
    }
  }

  return { ...state, lyricsText: text, song, cells, merges: pruneMerges(song, state.merges) };
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

  return { ...next, cells };
}

function lineText(line: EditorState["song"][number]): string {
  return line.words.map((word) => word.syllables.map((syllable) => syllable.text).join("")).join(" ");
}

function reconcileLine(oldLine: EditorState["song"][number], nextLine: EditorState["song"][number]) {
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
    const { syllables } = reconcileWordSyllables(
      oldWord.syllables,
      nextWord.syllables.map((syllable) => syllable.text),
    );
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

function deleteCellAcrossTracks(tracks: EditorState["tracks"], cells: CellsByTrack, slotId: string): CellsByTrack {
  let next = cells;
  for (const track of tracks) {
    next = deleteCell(next, track.id, slotId);
  }
  return next;
}

function applyResyllabify(state: EditorState, lineId: string, wordId: string, newText: string): EditorState {
  const line = state.song.find((l) => l.id === lineId);
  const word = line?.words.find((w) => w.id === wordId);
  if (!line || !word) return state;

  const newTexts = hyphenateWord(newText);
  const { syllables, droppedIds } = reconcileWordSyllables(word.syllables, newTexts);

  const song = state.song.map((l) =>
    l.id !== lineId
      ? l
      : { ...l, words: l.words.map((w) => (w.id === wordId ? { ...w, syllables } : w)) },
  );

  let cells = state.cells;
  for (const droppedId of droppedIds) {
    cells = deleteCellAcrossTracks(state.tracks, cells, beforeSlotId(droppedId));
  }

  const merges = pruneMerges(song, state.merges);

  return { ...state, song, cells, merges };
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
  const cells = deleteCellAcrossTracks(state.tracks, state.cells, beforeSlotId(bId));
  return { ...state, merges, cells };
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
  return { ...state, cells };
}

export { getCell };
