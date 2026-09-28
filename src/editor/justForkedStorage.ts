const STORAGE_KEY = "silabeo:just-forked";
const EXPIRY_MS = 60 * 1000;

interface StoredJustForked {
  savedAt: number;
  slug: string;
}

/**
 * Forking always lands on the new song via a hard navigation (see performFork in App.tsx), which
 * tears down the React tree — including the toast queue — before a confirmation toast could ever
 * render. Stashing the target slug here lets the destination page recognize, on its very first
 * mount, that it's the just-created fork and show that confirmation itself.
 */
export function saveJustForked(slug: string): void {
  const stored: StoredJustForked = { savedAt: Date.now(), slug };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("No se pudo guardar la marca de versión recién creada.", error);
  }
}

/** Consumes the flag: returns true only if it names `slug` and hasn't expired. Always clears
 *  whatever was stored, so a stale or mismatched entry can't be mistaken for a match later. */
export function consumeJustForked(slug: string): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    window.localStorage.removeItem(STORAGE_KEY);
    const stored = JSON.parse(raw) as StoredJustForked;
    if (
      !stored ||
      typeof stored.savedAt !== "number" ||
      typeof stored.slug !== "string" ||
      Date.now() - stored.savedAt > EXPIRY_MS
    ) {
      return false;
    }
    return stored.slug === slug;
  } catch (error) {
    console.error("No se pudo leer la marca de versión recién creada.", error);
    return false;
  }
}
