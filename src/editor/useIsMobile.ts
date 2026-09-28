import { useEffect, useState } from "react";

/** Matches the `max-width: 30rem` breakpoint used across App.css / Library.css. */
const MOBILE_QUERY = "(max-width: 30rem)";

/**
 * Real mobile detection for gating business rules (editing, forking, deleting).
 * CSS media queries alone only hide elements visually — the underlying
 * handlers stay mounted and reachable, so rules that must actually be
 * enforced (not just hidden) need this hook instead.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    const mediaQueryList = window.matchMedia(MOBILE_QUERY);
    const handleChange = () => setIsMobile(mediaQueryList.matches);
    handleChange();
    mediaQueryList.addEventListener("change", handleChange);
    return () => mediaQueryList.removeEventListener("change", handleChange);
  }, []);

  return isMobile;
}
