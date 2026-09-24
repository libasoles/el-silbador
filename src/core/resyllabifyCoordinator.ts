const DEBOUNCE_MS = 1000;

interface PendingWord {
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Coordinates when a word should be resyllabified: immediately on word-boundary (space/enter),
 * or after 1s of inactivity otherwise. A word-boundary trigger cancels that word's pending
 * debounce so the same edit never resyllabifies twice.
 */
export function createResyllabifyCoordinator(onDue: (wordKey: string) => void) {
  const pending = new Map<string, PendingWord>();

  function cancelPending(wordKey: string) {
    const existing = pending.get(wordKey);
    if (existing) {
      clearTimeout(existing.timer);
      pending.delete(wordKey);
    }
  }

  return {
    /** Call on every keystroke inside a word that hasn't hit a boundary yet. */
    notifyKeystroke(wordKey: string) {
      cancelPending(wordKey);
      const timer = setTimeout(() => {
        pending.delete(wordKey);
        onDue(wordKey);
      }, DEBOUNCE_MS);
      pending.set(wordKey, { timer });
    },

    /** Call when the word is completed (space/enter). Fires immediately, cancels any debounce. */
    notifyWordBoundary(wordKey: string) {
      cancelPending(wordKey);
      onDue(wordKey);
    },

    dispose() {
      for (const wordKey of pending.keys()) cancelPending(wordKey);
    },
  };
}
