import { useState, useSyncExternalStore } from "react";
import type { Song } from "../core/types";
import { readTabsTogglePreference, saveTabsTogglePreference } from "./tabsToggleStorage";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * The Tabs toggle. An author starts with tab blocks visible so a newly added block can be edited;
 * a reader starts with them hidden. Reader choices are browser-wide, while an editing choice is
 * only for that editing session.
 */
export function useTabsToggle(song: Song, editing: boolean) {
  // Off on the server, which can't read localStorage, and so during hydration too.
  const readerWantsTabs = useSyncExternalStore(subscribe, readTabsTogglePreference, () => false);
  const [editorWantsTabs, setEditorWantsTabs] = useState(true);

  const hasTabBlocks = song.some((line) => line.tab);
  const tabsVisible = editing ? editorWantsTabs : readerWantsTabs;
  return {
    /** Whether the toolbar offers the toggle. */
    available: hasTabBlocks,
    pressed: tabsVisible,
    /** Whether the song draws its tab blocks. */
    showTabBlocks: tabsVisible,
    toggle: () => {
      if (editing) {
        setEditorWantsTabs((visible) => !visible);
        return;
      }
      saveTabsTogglePreference(!readerWantsTabs);
      for (const listener of listeners) listener();
    },
  };
}
