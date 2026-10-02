import { useEffect, useRef, useState } from "react";
import { getChordPositions } from "../../core/chordPositions";
import { findChordShape } from "../../core/findChordShape";
import { trackEvent } from "../analytics";
import type { DragDelta } from "../pitchDragGesture";
import { ChordTooltip } from "./ChordTooltip";

interface TrackCellProps {
  slotId: string;
  value: string;
  left?: number;
  width?: number;
  onChange: (text: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  registerRef: (el: HTMLElement | null) => void;
  draggable?: boolean;
  isDragging?: boolean;
  onDragStart?: () => void;
  /** `delta` is how far the pointer travelled during the drag, or null if it was never tracked. */
  onDragEnd?: (delta: DragDelta | null) => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  /** True while the viewer isn't allowed to edit this song (not its owner and not a fork of it).
   *  The chip still responds to a click that only shows a chord diagram — that's viewing, not
   *  editing — but never swaps to the text input. */
  readOnly?: boolean;
  /** True for the chords track: clicking a chip whose text matches a known chord shows a
   *  fingering diagram instead of editing it; double-clicking edits it directly. */
  showChordDiagram?: boolean;
  /** Index into this chord's alternate fretboard positions (see getChordPositions), chosen with
   *  the tooltip's prev/next arrows. Ignored when the chord has only one known position. */
  chordVariantIndex?: number;
  onChangeChordVariant?: (index: number) => void;
  /** Sequence index for the melody row's left-to-right initial reveal. */
  revealIndex?: number;
  /** True for cells whose drag, released outside any cell, sets a pitch direction indicator.
   *  The drop is then accepted anywhere on the page so it takes effect at release, instead of
   *  waiting out the browser's snap-back animation that precedes `dragend` for a refused drop. */
  acceptDropAnywhere?: boolean;
}

/**
 * One editable slot in a track row. Shows a static chip until clicked/activated, then swaps to
 * a text input. Arrow keys move between cells, except when the caret is mid-text, where they
 * move the caret as usual.
 *
 * Cells with text are natively draggable (HTML5 drag & drop) so their content can be moved to
 * another cell in the same track. See TrackRow/LineView for the drag-state wiring.
 */
export function TrackCell({
  slotId,
  value,
  left,
  width,
  onChange,
  onNavigate,
  registerRef,
  draggable = false,
  isDragging = false,
  onDragStart,
  onDragEnd,
  onDragEnter,
  onDragLeave,
  onDrop,
  readOnly = false,
  showChordDiagram = false,
  chordVariantIndex = 0,
  onChangeChordVariant,
  revealIndex,
  acceptDropAnywhere = false,
}: TrackCellProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chipRef = useRef<HTMLButtonElement | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  // Buttons receive focus on mousedown, i.e. before a drag gesture has a chance to start. If we
  // switched to the input on every focus, the chip would unmount mid-drag and native HTML5 drag
  // would never fire. So mouse-originated focus is ignored here; onClick (which only fires when
  // no drag happened) starts editing instead. Keyboard-originated focus (Tab) still edits eagerly.
  const pointerDownRef = useRef(false);
  // `dragover` is the one drag event that carries reliable pointer coordinates in every browser
  // (dragend's are 0 in some), so it's sampled on the document for the length of a drag.
  const dragTrackRef = useRef<{
    start: { x: number; y: number };
    last: { x: number; y: number } | null;
    /** The gesture was already reported from a document-level drop; `dragend` must not repeat it. */
    reported: boolean;
    onDragOver: (event: DragEvent) => void;
    onDrop: (event: DragEvent) => void;
  } | null>(null);
  // The document listeners outlive the render that started the drag, so they report through this.
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;

  function stopTrackingDrag() {
    const track = dragTrackRef.current;
    if (track) {
      document.removeEventListener("dragover", track.onDragOver);
      document.removeEventListener("drop", track.onDrop);
    }
    dragTrackRef.current = null;
    return track;
  }

  function dragDeltaOf(track: NonNullable<typeof dragTrackRef.current>): DragDelta | null {
    return track.last ? { dx: track.last.x - track.start.x, dy: track.last.y - track.start.y } : null;
  }

  useEffect(() => () => void stopTrackingDrag(), []);

  const chordShape = showChordDiagram ? findChordShape(value) : null;
  const chordPositions = chordShape ? getChordPositions(chordShape) : [];
  const clampedVariantIndex = Math.min(chordVariantIndex, Math.max(chordPositions.length - 1, 0));
  const chordVariantShape = chordPositions[clampedVariantIndex] ?? chordShape;

  // A click on a known chord shows its diagram rather than jumping straight to editing;
  // double-clicking (or clicking a chip with no known chord) edits it directly.
  function handleChipClick() {
    if (chordShape) {
      if (!tooltipOpen) {
        trackEvent("chord_diagram_open", { chord_name: value });
      }
      setTooltipOpen((open) => !open);
      return;
    }
    startEditing();
  }

  function handleChipDoubleClick() {
    startEditing();
  }

  const dragClassName = isDragging ? " track-cell--dragging" : "";
  const style =
    left !== undefined && width !== undefined
      ? ({ left: `${left}px`, width: `${width}px`, "--melody-note-index": revealIndex } as React.CSSProperties)
      : undefined;

  function handleDragStart(event: React.DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", value);
    // The browser snapshots whatever we hand setDragImage synchronously, before React can
    // re-render with the --dragging class, so a CSS scale on the source element wouldn't show
    // up in the image that follows the cursor. Hand it an enlarged clone instead, parked
    // off-screen and discarded once the snapshot's been taken.
    const source = event.currentTarget;
    const rect = source.getBoundingClientRect();
    const clone = source.cloneNode(true) as HTMLElement;
    clone.style.position = "fixed";
    clone.style.top = "-9999px";
    clone.style.left = "-9999px";
    clone.style.width = `${rect.width}px`;
    clone.style.margin = "0";
    clone.style.transform = "scale(1.6)";
    clone.style.transformOrigin = "top left";
    document.body.appendChild(clone);
    event.dataTransfer.setDragImage(clone, rect.width / 2, rect.height / 2);
    window.setTimeout(() => clone.remove(), 0);
    stopTrackingDrag();
    const track: NonNullable<typeof dragTrackRef.current> = {
      start: { x: event.clientX, y: event.clientY },
      last: null,
      reported: false,
      onDragOver: (moveEvent) => {
        track.last = { x: moveEvent.clientX, y: moveEvent.clientY };
        if (acceptDropAnywhere) {
          moveEvent.preventDefault();
          if (moveEvent.dataTransfer) moveEvent.dataTransfer.dropEffect = "move";
        }
      },
      onDrop: (dropEvent) => {
        // A drop something else already handled (a cell, an edge zone) is left to `dragend`.
        if (!acceptDropAnywhere || dropEvent.defaultPrevented) return;
        // Also keeps the browser from inserting the dragged text wherever it landed.
        dropEvent.preventDefault();
        track.last = { x: dropEvent.clientX, y: dropEvent.clientY };
        track.reported = true;
        onDragEndRef.current?.(dragDeltaOf(track));
      },
    };
    dragTrackRef.current = track;
    document.addEventListener("dragover", track.onDragOver);
    document.addEventListener("drop", track.onDrop);
    onDragStart?.();
  }

  function handleDragEnd() {
    const track = stopTrackingDrag();
    if (track?.reported) return;
    onDragEnd?.(track ? dragDeltaOf(track) : null);
  }

  function handleDragOver(event: React.DragEvent<HTMLElement>) {
    // Allowing drop requires preventing the default (no-drop) behavior.
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }

  function handleDrop(event: React.DragEvent<HTMLElement>) {
    event.preventDefault();
    onDrop?.();
  }

  function startEditing() {
    if (readOnly) return;
    setTooltipOpen(false);
    setEditing(true);
  }

  function handleFocus() {
    if (!pointerDownRef.current) startEditing();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    if (event.key === "ArrowLeft" && input.selectionStart === 0 && input.selectionEnd === 0) {
      event.preventDefault();
      onNavigate("prev");
    } else if (
      event.key === "ArrowRight" &&
      input.selectionStart === value.length &&
      input.selectionEnd === value.length
    ) {
      event.preventDefault();
      onNavigate("next");
    } else if (event.key === "Enter" || event.key === "Escape") {
      input.blur();
    }
  }

  if (!editing) {
    return (
      <>
        <button
          type="button"
          className={"track-cell track-cell--chip" + dragClassName}
          data-slot-id={slotId}
          style={style}
          ref={(el) => {
            chipRef.current = el;
            registerRef(el);
          }}
          onClick={handleChipClick}
          onDoubleClick={handleChipDoubleClick}
          onFocus={handleFocus}
          onMouseDown={() => {
            pointerDownRef.current = true;
          }}
          onMouseUp={() => {
            pointerDownRef.current = false;
          }}
          draggable={draggable}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={handleDrop}
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              onNavigate("prev");
            } else if (event.key === "ArrowRight") {
              event.preventDefault();
              onNavigate("next");
            }
          }}
        >
          {value || " "}
        </button>
        {tooltipOpen && chordVariantShape && chipRef.current ? (
          <ChordTooltip
            chordName={value}
            shape={chordVariantShape}
            positionCount={chordPositions.length}
            onPrevPosition={
              onChangeChordVariant
                ? () => onChangeChordVariant((clampedVariantIndex - 1 + chordPositions.length) % chordPositions.length)
                : undefined
            }
            onNextPosition={
              onChangeChordVariant
                ? () => onChangeChordVariant((clampedVariantIndex + 1) % chordPositions.length)
                : undefined
            }
            anchorEl={chipRef.current}
            onClose={() => setTooltipOpen(false)}
          />
        ) : null}
      </>
    );
  }

  return (
    <input
      className={"track-cell track-cell--input" + dragClassName}
      data-slot-id={slotId}
      style={style}
      ref={(el) => {
        inputRef.current = el;
        registerRef(el);
      }}
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
    />
  );
}
