import { useRef, useState } from "react";

interface TrackCellProps {
  value: string;
  onChange: (text: string) => void;
  onNavigate: (direction: "prev" | "next") => void;
  registerRef: (el: HTMLElement | null) => void;
}

/**
 * One editable slot in a track row. Shows a static chip until clicked/activated, then swaps to
 * a text input. Arrow keys move between cells, except when the caret is mid-text, where they
 * move the caret as usual.
 */
export function TrackCell({ value, onChange, onNavigate, registerRef }: TrackCellProps) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setEditing(true);
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
        className="track-cell track-cell--chip"
        ref={(el) => registerRef(el)}
        onClick={startEditing}
        onFocus={startEditing}
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
      className="track-cell track-cell--input"
      ref={(el) => {
        inputRef.current = el;
        registerRef(el);
      }}
      autoFocus
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={() => setEditing(false)}
      onKeyDown={handleKeyDown}
    />
  );
}
