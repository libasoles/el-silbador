const STORAGE_KEY = "silabeo:pending-auth-action";
const EXPIRY_MS = 30 * 60 * 1000;

/** An intent that needs a session and can survive the reload caused by a magic link. */
export type PendingAuthAction =
  | { type: "save-song"; songSlug: string | null }
  | { type: "toggle-favorite"; songId: string };

interface StoredPendingAuthAction {
  savedAt: number;
  action: PendingAuthAction;
}

/** Store the last requested authenticated action immediately before opening the auth modal. */
export function savePendingAuthAction(action: PendingAuthAction): void {
  const stored: StoredPendingAuthAction = { savedAt: Date.now(), action };
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    console.error("No se pudo guardar la acción pendiente localmente.", error);
  }
}

/** Returns the unexpired action, if any. Expired or malformed entries are ignored. */
export function readPendingAuthAction(): PendingAuthAction | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredPendingAuthAction;
    if (
      !stored ||
      typeof stored.savedAt !== "number" ||
      !stored.action ||
      Date.now() - stored.savedAt > EXPIRY_MS
    ) {
      return null;
    }
    return stored.action;
  } catch (error) {
    console.error("No se pudo leer la acción pendiente.", error);
    return null;
  }
}

/** Clear only an action which has actually completed successfully. */
export function clearPendingAuthAction(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage can be disabled; there is nothing useful to clean up in that case.
  }
}
