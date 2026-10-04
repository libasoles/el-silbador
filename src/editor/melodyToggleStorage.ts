const STORAGE_KEY = "el-silbador:melody-toggle-visible";

/**
 * Returns the person's global melody-toggle choice, if they have made one.
 * An absent or malformed value deliberately falls back to the song's normal default.
 */
export function readMelodyTogglePreference(): boolean | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  } catch (error) {
    // Storage can be unavailable in a privacy-restricted browser. The editor remains usable
    // with its per-song default in that case.
    console.error("No se pudo leer la preferencia de melodía.", error);
    return null;
  }
}

/** Saves the global melody-toggle choice for future song visits in this browser. */
export function saveMelodyTogglePreference(visible: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(visible));
  } catch (error) {
    // A failed write must never prevent the control from changing for the current visit.
    console.error("No se pudo guardar la preferencia de melodía.", error);
  }
}
