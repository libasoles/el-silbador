type AsciiTabsModule = typeof import("ascii-tabs/ascii-tabs.js");

let loaded: AsciiTabsModule | null = null;
let loading: Promise<AsciiTabsModule> | null = null;

/** Loads ascii-tabs, which registers its custom elements as it loads. It is its own chunk, fetched
 *  only once a song actually shows a tab block. */
export function loadAsciiTabs(): Promise<AsciiTabsModule> {
  loading ??= import("ascii-tabs/ascii-tabs.js").then((module) => (loaded = module));
  return loading;
}

/** The library, if a tab block has already loaded it. */
export function loadedAsciiTabs(): AsciiTabsModule | null {
  return loaded;
}
