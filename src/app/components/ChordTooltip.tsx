import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChordShape } from "../../core/chordShapes";
import { ChordDiagram } from "./ChordDiagram";
import { getChordTooltipPosition, subscribeToAnchorPositionUpdates } from "./chordTooltipPositioning";
import { ChevronLeftIcon, ChevronRightIcon } from "./icons";

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

  const updatePosition = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;

    const anchorRect = anchorEl.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();

    setStyle({ ...getChordTooltipPosition(anchorRect, cardRect), visibility: "visible" });
  }, [anchorEl]);

  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition, shape]);

  useEffect(() => subscribeToAnchorPositionUpdates(updatePosition), [updatePosition]);

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
      className="chord-tooltip"
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
            <ChevronLeftIcon size={22} />
          </button>
          <ChordDiagram shape={shape} />
          <button
            type="button"
            className="chord-tooltip__position-nav chord-tooltip__position-nav--next"
            aria-label="Posición siguiente"
            onClick={onNextPosition}
          >
            <ChevronRightIcon size={22} />
          </button>
        </div>
      ) : (
        <ChordDiagram shape={shape} />
      )}
    </div>,
    document.body,
  );
}
