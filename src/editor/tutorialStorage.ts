const STORAGE_PREFIX = "el-silbador:tutorial-seen:";

/** Returns whether this browser has dismissed a particular one-time editor tutorial. */
export function hasSeenTutorial(tutorialId: string): boolean {
  try {
    return window.localStorage.getItem(`${STORAGE_PREFIX}${tutorialId}`) === "true";
  } catch (error) {
    // A blocked or full storage area should not make the editor controls fail. In that case the
    // tutorial can simply appear again on a later visit.
    console.error("No se pudo leer el estado del tutorial.", error);
    return false;
  }
}

/** Records a tutorial only after the person has closed it, never when it is merely displayed. */
export function markTutorialSeen(tutorialId: string): void {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${tutorialId}`, "true");
  } catch (error) {
    console.error("No se pudo guardar el estado del tutorial.", error);
  }
}
