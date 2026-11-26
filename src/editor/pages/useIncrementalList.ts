import { useCallback, useEffect, useRef, useState } from "react";

export const LIBRARY_PAGE_SIZE = 20;

/** How far before the end of the list the next page starts rendering, so it is ready by the time
 *  the reader scrolls there. */
const PRELOAD_MARGIN = "100% 0px";

/**
 * Reveals `items` a page at a time. Attach `sentinelRef` to an element after the last visible
 * item: whenever it comes within a screen of the viewport, the next page is shown. `resetKey`
 * (e.g. the search query) starts again from the first page.
 */
export function useIncrementalList<T>(items: T[], resetKey: string, pageSize = LIBRARY_PAGE_SIZE) {
  const [state, setState] = useState({ resetKey, count: pageSize });
  // Adjusting state during render (rather than in an effect) avoids a frame with the old count.
  const count = state.resetKey === resetKey ? state.count : pageSize;
  if (state.resetKey !== resetKey) setState({ resetKey, count: pageSize });

  const hasMore = count < items.length;
  const observerRef = useRef<IntersectionObserver | null>(null);

  // A fresh observer reports the sentinel's current position straight away, so a page that still
  // leaves the sentinel inside the margin immediately pulls in the next one.
  const sentinelRef = useCallback(
    (node: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      if (!node || typeof IntersectionObserver === "undefined") return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          setState((current) => ({ ...current, count: current.count + pageSize }));
        },
        { rootMargin: PRELOAD_MARGIN },
      );
      observer.observe(node);
      observerRef.current = observer;
    },
    // `count` is a dependency only so the callback ref changes, and the observer is re-created,
    // after each page.
    [count, pageSize],
  );

  useEffect(() => () => observerRef.current?.disconnect(), []);

  return { visible: items.slice(0, count), hasMore, sentinelRef };
}
