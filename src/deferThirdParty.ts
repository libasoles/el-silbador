const INTERACTION_EVENTS = ["pointerdown", "keydown", "touchstart", "scroll"] as const;
const FALLBACK_DELAY_MS = 5000;

/** Runs `task` once, off the critical path: on the first user interaction, or
 *  `FALLBACK_DELAY_MS` after the window `load` event — whichever comes first. Keeps third-party
 *  scripts (analytics, error reporting) from competing with first render and hydration, which is
 *  what drives Total Blocking Time / Time to Interactive. */
export function runWhenIdleOrInteracted(task: () => void): void {
  if (typeof window === "undefined") return;

  let done = false;
  let timer: number | undefined;

  const run = () => {
    if (done) return;
    done = true;
    window.clearTimeout(timer);
    for (const name of INTERACTION_EVENTS) window.removeEventListener(name, run);
    window.removeEventListener("load", onLoad);
    task();
  };

  const onLoad = () => {
    timer = window.setTimeout(run, FALLBACK_DELAY_MS);
  };

  for (const name of INTERACTION_EVENTS) {
    window.addEventListener(name, run, { once: true, passive: true });
  }
  if (document.readyState === "complete") onLoad();
  else window.addEventListener("load", onLoad, { once: true });
}
