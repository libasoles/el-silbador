import type { TransposeOffset } from "./transpose";

const STORAGE_KEY = "silabeo:transpose-offset";

interface StoredTransposeOffset extends TransposeOffset {
  songId: string;
}

/**
 * Persists a read-only viewer's chosen transpose offset (not the transposed text itself) so it
 * survives a reload, scoped to the song it was set on. Only one song's offset is kept at a time,
 * same as `draftStorage`'s single pending draft — opening a different song simply overwrites it.
 */
export function saveTransposeOffset(songId: string, offset: TransposeOffset): void {
  const stored: StoredTransposeOffset = { songId, ...offset };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("No se pudo guardar la transposición localmente.", error);
  }
}

/** Reads back an offset saved by `saveTransposeOffset`, if one is stored and matches `songId`. */
export function readTransposeOffset(songId: string): TransposeOffset | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredTransposeOffset;
    if (
      !stored ||
      stored.songId !== songId ||
      typeof stored.semitones !== "number" ||
      typeof stored.useFlats !== "boolean"
    ) {
      return null;
    }
    return { semitones: stored.semitones, useFlats: stored.useFlats };
  } catch (error) {
    console.error("No se pudo leer la transposición guardada.", error);
    return null;
  }
}
