import { useRef, useState } from "react";

interface TrackCellProps {
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
}: TrackCellProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // Buttons receive focus on mousedown, i.e. before a drag gesture has a chance to start. If we
  // switched to the input on every focus, the chip would unmount mid-drag and native HTML5 drag
  // would never fire. So mouse-originated focus is ignored here; onClick (which only fires when
  // no drag happened) starts editing instead. Keyboard-originated focus (Tab) still edits eagerly.
  const pointerDownRef = useRef(false);

  const dragClassName = isDragging ? " track-cell--dragging" : "";
  const style =
    left !== undefined && width !== undefined ? { left: `${left}px`, width: `${width}px` } : undefined;

  function handleDragStart(event: React.DragEvent<HTMLElement>) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", value);
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
      <button
        type="button"
        className={"track-cell track-cell--chip" + dragClassName}
        style={style}
        ref={(el) => registerRef(el)}
        onClick={startEditing}
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
    );
  }

  return (
    <input
      className={"track-cell track-cell--input" + dragClassName}
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
