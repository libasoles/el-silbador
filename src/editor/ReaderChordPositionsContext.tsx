import { createContext, useContext } from "react";

export interface ReaderChordPositions {
  /** The position index this reader picked for the chord, if any. */
  get: (chordName: string) => number | undefined;
  set: (chordName: string, index: number) => void;
}

/** Set by the song page while a song is being read, so any chord diagram below it can remember
 *  the reader's choice without every layer passing it down. Null outside it (the article demos,
 *  the editor), where a diagram keeps its own state. */
export const ReaderChordPositionsContext = createContext<ReaderChordPositions | null>(null);

export function useReaderChordPositions(): ReaderChordPositions | null {
  return useContext(ReaderChordPositionsContext);
}
