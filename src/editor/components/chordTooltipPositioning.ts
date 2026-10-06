const ANCHOR_GAP = 8;
const VIEWPORT_MARGIN = 8;

interface Viewport {
  width: number;
  height: number;
}

/** Places the card above the trigger, or below it when only that side has room for it, and
 * slides it sideways to stay on screen. It never slides past the trigger itself: a portal's fixed
 * positioning uses viewport coordinates, and the card has to stay attached to its chip even as
 * the chip scrolls out of view. */
export function getChordTooltipPosition(
  anchorRect: Pick<DOMRect, "top" | "left" | "width" | "height">,
  cardRect: Pick<DOMRect, "width" | "height">,
  viewport: Viewport = { width: document.documentElement.clientWidth, height: window.innerHeight },
) {
  const spaceAbove = anchorRect.top - ANCHOR_GAP - VIEWPORT_MARGIN;
  const anchorBottom = anchorRect.top + anchorRect.height;
  const spaceBelow = viewport.height - anchorBottom - ANCHOR_GAP - VIEWPORT_MARGIN;
  const below = spaceAbove < cardRect.height && spaceBelow > spaceAbove;
  const top = below ? anchorBottom + ANCHOR_GAP : anchorRect.top - cardRect.height - ANCHOR_GAP;

  const centered = anchorRect.left + anchorRect.width / 2 - cardRect.width / 2;
  const onScreen = Math.min(
    Math.max(centered, VIEWPORT_MARGIN),
    viewport.width - cardRect.width - VIEWPORT_MARGIN,
  );
  const left = Math.min(
    Math.max(onScreen, anchorRect.left + anchorRect.width - cardRect.width),
    anchorRect.left,
  );

  return { top, left };
}

/** Keeps a portal tooltip aligned when either the viewport or any ancestor scrolls. Scroll does
 * not bubble, so the document listener deliberately uses the capture phase. */
export function subscribeToAnchorPositionUpdates(
  updatePosition: () => void,
  scrollTarget: EventTarget = document,
  resizeTarget: EventTarget = window,
) {
  scrollTarget.addEventListener("scroll", updatePosition, { capture: true });
  resizeTarget.addEventListener("resize", updatePosition);

  return () => {
    scrollTarget.removeEventListener("scroll", updatePosition, { capture: true });
    resizeTarget.removeEventListener("resize", updatePosition);
  };
}
