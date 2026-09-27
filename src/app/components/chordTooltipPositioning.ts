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
