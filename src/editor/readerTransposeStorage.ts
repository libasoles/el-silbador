const STORAGE_KEY_PREFIX = "el-silbador:reader-transpose:";

function storageKey(songId: string): string {
  return `${STORAGE_KEY_PREFIX}${songId}`;
}

/**
 * Returns the semitone offset a reader chose for one song in this browser. The preference is
 * deliberately keyed by the database id rather than the slug: titles can change without losing
 * a person's chosen key.
 */
export function readReaderTransposePreference(songId: string): number | null {
  try {
    const value = window.localStorage.getItem(storageKey(songId));
    if (value === null) return null;
    const offset = Number(value);
    return Number.isInteger(offset) ? offset : null;
  } catch (error) {
    // Privacy-restricted browsers can deny storage. Reading must still work for this visit.
    console.error("No se pudo leer la tonalidad guardada.", error);
    return null;
  }
}

/** Saves a reader's selected semitone offset for one song in this browser. */
export function saveReaderTransposePreference(songId: string, offset: number): void {
  try {
    window.localStorage.setItem(storageKey(songId), String(offset));
  } catch (error) {
    // A failed write must never prevent the control from changing for the current visit.
    console.error("No se pudo guardar la tonalidad elegida.", error);
  }
}
