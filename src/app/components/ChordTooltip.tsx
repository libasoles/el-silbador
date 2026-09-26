import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { ChordShape } from "../../core/chordShapes";
import { ChordDiagram } from "./ChordDiagram";

interface ChordTooltipProps {
  chordName: string;
  shape: ChordShape;
  anchorEl: HTMLElement;
  onRequestEdit: () => void;
  /** A tap outside both the chip and the tooltip dismisses it (there's no hover-out to do that
   *  job on a touch device). */
  onClose: () => void;
  /** Cancels the close-on-mouse-leave timer started by the chip, so drifting the pointer from the
   *  chip onto the tooltip itself (to reach "Cambiar") doesn't close it mid-transit. */
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const VIEWPORT_MARGIN = 8;
const ANCHOR_GAP = 8;

/** A floating, non-blocking diagram popover for a chord chip — shown on hover (desktop) or tap
 *  (mobile), positioned next to the chip it describes rather than behind a screen-dimming
 *  overlay. Rendered into a portal so its position (computed from the chip's viewport rect) and
 *  stacking order aren't affected by the scrolling/clipped containers the chip itself sits in. */
export function ChordTooltip({
  chordName,
  shape,
  anchorEl,
  onRequestEdit,
  onClose,
  onMouseEnter,
  onMouseLeave,
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
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="chord-tooltip__name">{chordName}</div>
      <ChordDiagram shape={shape} />
      <button type="button" className="chord-tooltip__edit" onClick={onRequestEdit}>
        Cambiar
      </button>
    </div>,
    document.body,
  );
}
