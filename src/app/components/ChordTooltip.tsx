import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChordShape } from "../../core/chordShapes";
import { ChordDiagram } from "./ChordDiagram";

interface ChordTooltipProps {
  chordName: string;
  shape: ChordShape;
  anchorEl: HTMLElement;
  /** A click outside both the chip and the tooltip dismisses it. */
  onClose: () => void;
  /** How many fretboard positions this chord has (see getChordPositions). The prev/next arrows
   *  are hidden when there's only one. Whichever position is showing when the tooltip closes is
   *  the one that stays in effect — there's no separate "confirm" step. */
  positionCount?: number;
  onPrevPosition?: () => void;
  onNextPosition?: () => void;
}

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

/** A floating, non-blocking diagram popover for a chord chip — opened by clicking the chip,
 *  positioned next to it rather than behind a screen-dimming overlay. Rendered into a portal so
 *  its position (computed from the chip's viewport rect) and stacking order aren't affected by
 *  the scrolling/clipped containers the chip itself sits in. */
export function ChordTooltip({
  chordName,
  shape,
  anchorEl,
  onClose,
  positionCount = 1,
  onPrevPosition,
  onNextPosition,
}: ChordTooltipProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<{ top: number; left: number; visibility: "hidden" | "visible" }>({
    top: 0,
    left: 0,
    visibility: "hidden",
  });
  const [placement, setPlacement] = useState<"above" | "below">("above");

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    const spaceAbove = anchorRect.top;
    const nextPlacement: "above" | "below" = spaceAbove >= cardRect.height + ANCHOR_GAP ? "above" : "below";

    const top =
      nextPlacement === "above"
        ? anchorRect.top - cardRect.height - ANCHOR_GAP
        : anchorRect.bottom + ANCHOR_GAP;

    const idealLeft = anchorRect.left + anchorRect.width / 2 - cardRect.width / 2;
    const left = Math.min(
      Math.max(idealLeft, VIEWPORT_MARGIN),
      window.innerWidth - cardRect.width - VIEWPORT_MARGIN,
    );

    setPlacement(nextPlacement);
    setStyle({ top, left, visibility: "visible" });
  }, [anchorEl, shape]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (anchorEl.contains(target) || cardRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anchorEl, onClose]);

  return createPortal(
    <div
      ref={cardRef}
      className={`chord-tooltip chord-tooltip--${placement}`}
      style={{ top: style.top, left: style.left, visibility: style.visibility }}
    >
      <div className="chord-tooltip__name">{chordName}</div>
      {positionCount > 1 ? (
        <div className="chord-tooltip__positions">
          <button
            type="button"
            className="chord-tooltip__position-nav chord-tooltip__position-nav--prev"
            aria-label="Posición anterior"
            onClick={onPrevPosition}
          >
            ‹
          </button>
          <ChordDiagram shape={shape} />
          <button
            type="button"
            className="chord-tooltip__position-nav chord-tooltip__position-nav--next"
            aria-label="Posición siguiente"
            onClick={onNextPosition}
          >
            ›
          </button>
        </div>
      ) : (
        <ChordDiagram shape={shape} />
      )}
    </div>,
    document.body,
  );
}
