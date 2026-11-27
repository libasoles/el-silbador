const STORAGE_KEY_PREFIX = "el-silbador:reharmonization:";

/**
 * An admin's reharmonization of one song kept in this browser instead of the database: the chords
 * they wrote (slot id → text, "" for a removed chord) and, when they picked one, the song key
 * ("<pitch class>:<major|minor>", or `null` to go back to inferring it). Used whenever the admin is
 * not in edit mode, which on mobile is always.
 */
export interface LocalReharmonization {
  chords: Record<string, string>;
  /** Absent: no local choice, so the song's saved key (or the inferred one) applies. */
  key?: string | null;
}

function storageKey(songId: string): string {
  return `${STORAGE_KEY_PREFIX}${songId}`;
}

/** Keyed by the database id, like the reader's other preferences, so renaming the song keeps it. */
export function readLocalReharmonization(songId: string): LocalReharmonization {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(songId)) ?? "null");
    if (typeof parsed !== "object" || parsed === null) return { chords: {} };
    const { chords, key } = parsed as { chords?: unknown; key?: unknown };
    const result: LocalReharmonization = {
      chords:
        typeof chords === "object" && chords !== null
          ? Object.fromEntries(Object.entries(chords).filter(([, text]) => typeof text === "string"))
          : {},
    };
    if (key === null || typeof key === "string") result.key = key;
    return result;
  } catch (error) {
    // Privacy-restricted browsers can deny storage. Reading must still work for this visit.
    console.error("No se pudo leer la rearmonización guardada.", error);
    return { chords: {} };
  }
}

function write(songId: string, value: LocalReharmonization): void {
  try {
    window.localStorage.setItem(storageKey(songId), JSON.stringify(value));
  } catch (error) {
    // A failed write must never prevent the change from showing for the current visit.
    console.error("No se pudo guardar la rearmonización.", error);
  }
}

export function saveLocalReharmonizedChord(songId: string, slotId: string, text: string): void {
  const current = readLocalReharmonization(songId);
  write(songId, { ...current, chords: { ...current.chords, [slotId]: text } });
}

export function saveLocalReharmonizationKey(songId: string, key: string | null): void {
  write(songId, { ...readLocalReharmonization(songId), key });
}
