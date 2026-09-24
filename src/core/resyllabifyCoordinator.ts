const DEBOUNCE_MS = 1000;

/**
 * Coordinates when a single word should be resyllabified: immediately on word-boundary
 * (space/enter), or after 1s of inactivity otherwise. A word-boundary trigger cancels this
 * word's pending debounce so the same edit never resyllabifies twice. Create one instance per
 * word being edited.
 */
export function createResyllabifyCoordinator(onDue: () => void) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  function cancelPending() {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  }

  return {
    /** Call on every keystroke inside the word that hasn't hit a boundary yet. */
    notifyKeystroke() {
      cancelPending();
      timer = setTimeout(() => {
        timer = null;
        onDue();
      }, DEBOUNCE_MS);
    },

    /** Call when the word is completed (space/enter). Fires immediately, cancels any debounce. */
    notifyWordBoundary() {
      cancelPending();
      onDue();
    },

    dispose() {
      cancelPending();
    },
  };
}
