import { vi } from "vitest";

/** jsdom has no `matchMedia`; this answers every query with `matches`, which is enough for
 *  `useIsMobile` (it only asks about the mobile breakpoint). Undo with `vi.unstubAllGlobals()`. */
export function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    (query: string): MediaQueryList => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  );
}
