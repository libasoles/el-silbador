const STORAGE_KEY = "el-silbador:tab-hint-dismissed";
export const TAB_HINT_DISMISSED_EVENT = "el-silbador:tab-hint-dismissed";

/** Whether this browser has already shown someone how to enter a fret. */
export function hasDismissedTabHint(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    // Storage can be unavailable in a privacy-restricted browser. The hint remains available.
    return false;
  }
}

/** Records that a person entered their first fret, and updates any open tab blocks. */
export function dismissTabHint(): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, "true");
  } catch (error) {
    // A failed write must not leave the current page's hints visible.
    console.error("No se pudo guardar que ya se mostró la ayuda de tablaturas.", error);
  }
  window.dispatchEvent(new Event(TAB_HINT_DISMISSED_EVENT));
}
