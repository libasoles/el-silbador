/** Space between the button and its tooltip (0.6rem in theme.css). */
const GAP = 10;
const VIEWPORT_MARGIN = 8;

export type IconTooltipSide = "left" | "right" | "bottom";

/** The side of an icon button its tooltip opens on: the preferred one when it fits, else the
 *  opposite one, else below. Below, `shift` is how far to slide the tooltip from centered so it
 *  stays on screen. */
export function getIconTooltipPlacement(
  buttonRect: Pick<DOMRect, "left" | "right" | "width">,
  tooltipWidth: number,
  viewport: { width: number },
  preferred: IconTooltipSide = "left",
): { side: IconTooltipSide; shift: number } {
  const needed = tooltipWidth + GAP + VIEWPORT_MARGIN;
  const fits = {
    left: buttonRect.left >= needed,
    right: viewport.width - buttonRect.right >= needed,
  };
  if (preferred !== "bottom") {
    const opposite = preferred === "left" ? "right" : "left";
    if (fits[preferred]) return { side: preferred, shift: 0 };
    if (fits[opposite]) return { side: opposite, shift: 0 };
  }

  const centered = buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2;
  const onScreen = Math.min(
    Math.max(centered, VIEWPORT_MARGIN),
    viewport.width - tooltipWidth - VIEWPORT_MARGIN,
  );
  return { side: "bottom", shift: onScreen - centered };
}
