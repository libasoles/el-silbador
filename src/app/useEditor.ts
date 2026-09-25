import { useEffect, useMemo, useReducer } from "react";
import { createInitialState, editorReducer } from "../core/state";
import type { Action } from "../core/state";
import type { EditorState, TrackId } from "../core/types";

const HISTORY_LIMIT = 200;

interface HistoryState {
  past: EditorState[];
  present: EditorState;
  future: EditorState[];
  /** Identifies the "run" of edits (e.g. keystrokes in one cell) currently being coalesced into
   * a single undo step. Reset whenever an action targets something else. */
  coalesceKey: string | null;
}

type HistoryAction = Action | { type: "undo" } | { type: "redo" };

function createInitialHistoryState(): HistoryState {
  return { past: [], present: createInitialState(), future: [], coalesceKey: null };
}

/**
 * Actions that fire once per keystroke (typing in a chord cell, editing lyrics text) share a
 * coalesce key with their siblings so a whole typing run becomes one undo step, matching what
 * users expect from ctrl+z rather than undoing a single character at a time.
 */
function coalesceKeyFor(action: Action): string | null {
  switch (action.type) {
    case "setLyricsText":
    case "reconcileLyricsText":
      return "lyrics";
    case "setCellText":
      return `cell:${action.trackId}:${action.slotId}`;
    case "resyllabify":
      return `resyllabify:${action.lineId}:${action.wordId}`;
    default:
      return null;
  }
}

function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === "undo") {
    const previous = state.past.at(-1);
    if (previous === undefined) return state;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
      coalesceKey: null,
    };
  }

  if (action.type === "redo") {
    const next = state.future[0];
    if (next === undefined) return state;
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
      coalesceKey: null,
    };
  }

  // Track visibility is view state, not document content: apply without recording history.
  if (action.type === "setTrackVisibility") {
    return { ...state, present: editorReducer(state.present, action), coalesceKey: null };
  }

  const nextPresent = editorReducer(state.present, action);
  if (nextPresent === state.present) return state;

  const key = coalesceKeyFor(action);
  if (key !== null && key === state.coalesceKey) {
    return { ...state, present: nextPresent, future: [] };
  }

  const past = [...state.past, state.present].slice(-HISTORY_LIMIT);
  return { past, present: nextPresent, future: [], coalesceKey: key };
}

export function useEditor() {
  const [history, dispatch] = useReducer(historyReducer, undefined, createInitialHistoryState);

  const actions = useMemo(
    () => ({
      setLyricsText: (text: string) => dispatch({ type: "setLyricsText", text }),
      reconcileLyricsText: (text: string) => dispatch({ type: "reconcileLyricsText", text }),
      loadYpacaraiExample: () => dispatch({ type: "loadYpacaraiExample" }),
      resyllabify: (lineId: string, wordId: string, newText: string) =>
        dispatch({ type: "resyllabify", lineId, wordId, newText }),
      toggleSyllableMerge: (lineId: string, aId: string, bId: string) =>
        dispatch({ type: "toggleSyllableMerge", lineId, aId, bId }),
      setCellText: (trackId: TrackId, slotId: string, text: string) =>
        dispatch({ type: "setCellText", trackId, slotId, text }),
      moveCellText: (trackId: TrackId, fromSlotId: string, toSlotId: string) =>
        dispatch({ type: "moveCellText", trackId, fromSlotId, toSlotId }),
      setTrackVisibility: (trackId: TrackId, visible: boolean) =>
        dispatch({ type: "setTrackVisibility", trackId, visible }),
      undo: () => dispatch({ type: "undo" }),
      redo: () => dispatch({ type: "redo" }),
    }),
    [],
  );

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const isModifier = event.metaKey || event.ctrlKey;
      if (!isModifier || event.key.toLowerCase() !== "z") return;
      event.preventDefault();
      dispatch(event.shiftKey ? { type: "redo" } : { type: "undo" });
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    state: history.present,
    actions,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
  };
}
