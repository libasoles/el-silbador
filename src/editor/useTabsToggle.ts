import { useSyncExternalStore } from "react";
import type { Song } from "../core/types";
import { readTabsTogglePreference, saveTabsTogglePreference } from "./tabsToggleStorage";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The reader's Tabs toggle. Tab blocks are always drawn while editing, with no toggle; a reader of
 * a song that has any gets the toggle, off until they turn it on. The choice is browser-wide, the
 * same on mobile and desktop.
 */
export function useTabsToggle(song: Song, editing: boolean) {
  // Off on the server, which can't read localStorage, and so during hydration too.
  const readerWantsTabs = useSyncExternalStore(subscribe, readTabsTogglePreference, () => false);

  const hasTabBlocks = song.some((line) => line.tab);
  return {
    /** Whether the toolbar offers the toggle. */
    available: !editing && hasTabBlocks,
    pressed: readerWantsTabs,
    /** Whether the song draws its tab blocks. */
    showTabBlocks: editing || readerWantsTabs,
    toggle: () => {
      saveTabsTogglePreference(!readerWantsTabs);
      for (const listener of listeners) listener();
    },
  };
}
