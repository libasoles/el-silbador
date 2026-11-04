const STORAGE_KEY_PREFIX = "el-silbador:reader-chord-positions:";

/** Position index a reader picked per chord name (e.g. `{ "C": 2 }`) for one song. */
export type ReaderChordPositions = Record<string, number>;

function storageKey(songId: string): string {
  return `${STORAGE_KEY_PREFIX}${songId}`;
}

/** The chord positions a reader chose for one song in this browser. Keyed by the database id, like
 *  the transpose preference, so renaming the song keeps them. */
export function readReaderChordPositions(songId: string): ReaderChordPositions {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(songId)) ?? "{}");
    if (typeof parsed !== "object" || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, index]) => Number.isInteger(index) && (index as number) >= 0),
    );
  } catch (error) {
    // Privacy-restricted browsers can deny storage. Reading must still work for this visit.
    console.error("No se pudieron leer las posiciones de acordes guardadas.", error);
    return {};
  }
}

export function saveReaderChordPositions(songId: string, positions: ReaderChordPositions): void {
  try {
    window.localStorage.setItem(storageKey(songId), JSON.stringify(positions));
  } catch (error) {
    // A failed write must never prevent the diagram from changing for the current visit.
    console.error("No se pudieron guardar las posiciones de acordes elegidas.", error);
  }
}
