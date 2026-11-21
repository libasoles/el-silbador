export const LIBRARY_RETURN_STATE_KEY = "elSilbadorReturnToLibrary";
let pendingSongPath: string | undefined;

/** Called only for same-tab navigation from the library, never for a new tab. */
export function rememberLibraryNavigation(songPath: string) {
  pendingSongPath = songPath;
}

export function claimLibraryNavigation(): boolean {
  const matches = pendingSongPath === window.location.pathname;
  pendingSongPath = undefined;
  return matches;
}
