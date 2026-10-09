const STORAGE_KEY = "el-silbador:tabs-toggle-visible";

/**
 * Returns the person's global Tabs toggle choice. Tab blocks start hidden for a reader, so an
 * absent or malformed value means off.
 */
export function readTabsTogglePreference(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Storage can be unavailable in a privacy-restricted browser. The blocks then start hidden.
    // No log: this is read on every render of the song.
    return false;
  }
}

/** Saves the global Tabs toggle choice for future song visits in this browser. */
export function saveTabsTogglePreference(visible: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, String(visible));
  } catch (error) {
    // A failed write must never prevent the control from changing for the current visit.
    console.error("No se pudo guardar la preferencia de tablaturas.", error);
  }
}
