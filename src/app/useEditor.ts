import { useMemo, useReducer } from "react";
import { createInitialState, editorReducer } from "../core/state";
import type { TrackId } from "../core/types";

export function useEditor() {
  const [state, dispatch] = useReducer(editorReducer, undefined, createInitialState);

  const actions = useMemo(
    () => ({
      setLyricsText: (text: string) => dispatch({ type: "setLyricsText", text }),
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
    }),
    [],
  );

  return { state, actions };
}
