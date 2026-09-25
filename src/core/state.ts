import {
  areAdjacent,
  beforeSlotId,
  buildSong,
  mergeKey,
  pruneMerges,
  reconcileWordSyllables,
  seedChordCells,
} from "./model";
import { YPACARAI_LYRICS } from "./fixtures/ypacarai";
import { YPACARAI_CHORDS, YPACARAI_END_OF_LINE_CHORDS } from "./fixtures/ypacaraiChords";
import { hyphenateWord } from "./syllabify";
import type { CellsByTrack, EditorState, TrackId } from "./types";

export function createInitialState(): EditorState {
  return {
    lyricsText: "",
    song: [],
    merges: new Set(),
    tracks: [{ id: "chords", label: "Acordes", visible: true }],
    cells: {},
  };
}

export type Action =
  | { type: "setLyricsText"; text: string }
  | { type: "loadYpacaraiExample" }
  | { type: "resyllabify"; lineId: string; wordId: string; newText: string }
  | { type: "toggleSyllableMerge"; lineId: string; aId: string; bId: string }
  | { type: "setCellText"; trackId: TrackId; slotId: string; text: string }
  | { type: "moveCellText"; trackId: TrackId; fromSlotId: string; toSlotId: string }
  | { type: "setTrackVisibility"; trackId: TrackId; visible: boolean };

export function editorReducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case "setLyricsText":
      return {
        ...state,
        lyricsText: action.text,
        song: buildSong(action.text),
        merges: new Set(),
        cells: {},
      };

    case "loadYpacaraiExample": {
      const song = buildSong(YPACARAI_LYRICS);
      return {
        ...state,
        lyricsText: YPACARAI_LYRICS,
        song,
        merges: new Set(),
        cells: { chords: seedChordCells(song, YPACARAI_CHORDS, YPACARAI_END_OF_LINE_CHORDS) },
      };
    }

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

    default:
      return state;
  }
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
