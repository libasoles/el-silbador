import { useRef, type ReactNode } from "react";
import { getIconTooltipPlacement, type IconTooltipSide } from "./iconTooltipPlacement";

interface IconButtonTooltipProps {
  tooltip: string;
  children: ReactNode;
  className?: string;
  /** Where the tooltip opens when it fits there. */
  side?: IconTooltipSide;
}

/** Wraps an icon button with a hover/focus tooltip, shared by every page that uses icon-only
 *  actions (the song editor's toolbars, the library's + and star buttons). The tooltip opens on
 *  `side`, or wherever else it fits when that side would run off the screen. */
export function IconButtonTooltip({
  tooltip,
  children,
  className,
  side = "left",
}: IconButtonTooltipProps) {
  const ref = useRef<HTMLSpanElement>(null);

  // The bubble is the wrapper's ::after, so its side is settled just before hover or focus shows it.
  function place() {
    const el = ref.current;
    if (!el) return;
    const tooltipWidth = parseFloat(getComputedStyle(el, "::after").width);
    if (!Number.isFinite(tooltipWidth)) return;
    const placement = getIconTooltipPlacement(
      el.getBoundingClientRect(),
      tooltipWidth,
      { width: document.documentElement.clientWidth },
      side,
    );
    el.dataset.tooltipSide = placement.side;
    el.style.setProperty("--tooltip-shift", `${placement.shift}px`);
  }

  return (
    <span
      ref={ref}
      className={`icon-button-tooltip ${className ?? ""}`}
      data-tooltip={tooltip}
      data-tooltip-side={side}
      onPointerEnter={place}
      onFocus={place}
    >
      {children}
    </span>
  );
}
