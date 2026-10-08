import { useLayoutEffect, useState } from "react";

/** Matches the `max-width: 30rem` breakpoint used across App.css / Library.css. */
const MOBILE_QUERY = "(max-width: 30rem)";

/** A finger, not a mouse, is the main way this device points at things. */
const COARSE_POINTER_QUERY = "(pointer: coarse)";

function useMediaQuery(query: string): boolean {
  // Always starts false, like the server render: reading the viewport here would make a phone's
  // first client render differ from the HTML it received (React hydration error #418). The layout
  // effect below syncs the real value right after hydration, before the browser paints.
  const [matches, setMatches] = useState(false);

  useLayoutEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const handleChange = () => setMatches(mediaQueryList.matches);
    handleChange();
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, [query]);

  return matches;
}

/**
 * Real mobile detection for gating business rules (editing, forking, deleting).
 * CSS media queries alone only hide elements visually — the underlying
 * handlers stay mounted and reachable, so rules that must actually be
 * enforced (not just hidden) need this hook instead.
 */
export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

/** True on touch-first devices (phones, tablets), whatever their width: they don't run HTML5
 *  drag and drop for a finger, so dragging needs its own handling there (see touchDrag.ts). */
export function useCoarsePointer(): boolean {
  return useMediaQuery(COARSE_POINTER_QUERY);
}
