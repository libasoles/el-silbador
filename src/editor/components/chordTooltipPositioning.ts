const ANCHOR_GAP = 8;

/** Places the card above the trigger without clamping either axis to the viewport. A portal's
 * fixed positioning uses viewport coordinates, but its relationship to the trigger should stay
 * intact even as either one crosses a viewport edge. */
export function getChordTooltipPosition(
  anchorRect: Pick<DOMRect, "top" | "left" | "width">,
  cardRect: Pick<DOMRect, "width" | "height">,
) {
  return {
    top: anchorRect.top - cardRect.height - ANCHOR_GAP,
    left: anchorRect.left + anchorRect.width / 2 - cardRect.width / 2,
  };
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
