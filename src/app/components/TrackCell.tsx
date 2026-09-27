import { useRef, useState } from "react";
import { getChordPositions } from "../../core/chordPositions";
import { findChordShape } from "../../core/findChordShape";
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
  onDragEnd?: () => void;
  onDragEnter?: () => void;
  onDragLeave?: () => void;
  onDrop?: () => void;
  /** True for the chords track: clicking a chip whose text matches a known chord shows a
   *  fingering diagram instead of editing it; double-clicking edits it directly. */
  showChordDiagram?: boolean;
  /** Index into this chord's alternate fretboard positions (see getChordPositions), chosen with
   *  the tooltip's prev/next arrows. Ignored when the chord has only one known position. */
  chordVariantIndex?: number;
  onChangeChordVariant?: (index: number) => void;
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
  showChordDiagram = false,
  chordVariantIndex = 0,
  onChangeChordVariant,
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

  const chordShape = showChordDiagram ? findChordShape(value) : null;
  const chordPositions = chordShape ? getChordPositions(chordShape) : [];
  const clampedVariantIndex = Math.min(chordVariantIndex, Math.max(chordPositions.length - 1, 0));
  const chordVariantShape = chordPositions[clampedVariantIndex] ?? chordShape;

  // A click on a known chord shows its diagram rather than jumping straight to editing;
  // double-clicking (or clicking a chip with no known chord) edits it directly.
  function handleChipClick() {
    if (chordShape) {
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
    left !== undefined && width !== undefined ? { left: `${left}px`, width: `${width}px` } : undefined;

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
    onDragStart?.();
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
          onDragEnd={onDragEnd}
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
