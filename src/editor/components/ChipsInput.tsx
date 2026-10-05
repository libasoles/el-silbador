import {
  useId,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { artistNameKey } from "../../core/artistNames";
import { RemoveIcon } from "./icons";
import "./ChipsInput.css";

interface ChipsInputProps {
  /** Accessible name of both the text input and the list of chips. */
  label: string;
  /** Visible label shown before the chips. Defaults to none (only `label` for assistive tech). */
  visibleLabel?: ReactNode;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** The text being typed, when the parent needs to read it (e.g. to look suggestions up). Left
   *  out, the component keeps it itself. */
  inputValue?: string;
  onInputValueChange?: (value: string) => void;
  /** Runs before the component's own key handling. Calling `event.preventDefault()` skips it, so
   *  a suggestions list can take over Enter and the arrow keys. */
  onInputKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** Rendered right after the input, inside the field (e.g. a suggestions list). */
  children?: ReactNode;
}

/** Splits a typed or pasted list on commas and line breaks. */
function splitNames(text: string): string[] {
  return text.split(/[,\n]/);
}

/**
 * A text field that turns each name into a removable chip: Enter or a comma confirms the typed
 * name, pasting "A, B" adds both, Backspace on an empty field removes the last chip, and each chip
 * has its own ✕. Blank names and names already present (ignoring case and accents) are skipped.
 * The order is the order the names were added.
 */
export function ChipsInput({
  label,
  visibleLabel,
  values,
  onChange,
  placeholder,
  inputValue,
  onInputValueChange,
  onInputKeyDown,
  children,
}: ChipsInputProps) {
  const inputId = useId();
  const [ownInputValue, setOwnInputValue] = useState("");
  const text = inputValue ?? ownInputValue;

  const setText = (value: string) => {
    if (inputValue === undefined) setOwnInputValue(value);
    onInputValueChange?.(value);
  };

  /** Adds every non-blank, not-yet-present name and reports whether anything was added. */
  const addNames = (names: string[]) => {
    const next = [...values];
    const keys = new Set(values.map(artistNameKey));
    for (const raw of names) {
      const name = raw.trim();
      const key = artistNameKey(name);
      if (name === "" || keys.has(key)) continue;
      keys.add(key);
      next.push(name);
    }
    if (next.length !== values.length) onChange(next);
  };

  const commitText = () => {
    addNames([text]);
    setText("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onInputKeyDown?.(event);
    if (event.defaultPrevented) return;

    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      commitText();
      return;
    }
    if (event.key === "Backspace" && text === "" && values.length > 0) {
      event.preventDefault();
      onChange(values.slice(0, -1));
    }
  };

  const handleChange = (value: string) => {
    // Keyboards that don't report the comma key (some mobile and IME input) still type it.
    const parts = splitNames(value);
    if (parts.length === 1) {
      setText(value);
      return;
    }
    addNames(parts.slice(0, -1));
    setText(parts[parts.length - 1].trimStart());
  };

  const handlePaste = (event: ClipboardEvent<HTMLInputElement>) => {
    const pasted = event.clipboardData.getData("text/plain");
    if (splitNames(pasted).length === 1) return;
    event.preventDefault();
    const input = event.currentTarget;
    const start = input.selectionStart ?? text.length;
    const end = input.selectionEnd ?? text.length;
    addNames(splitNames(text.slice(0, start) + pasted + text.slice(end)));
    setText("");
  };

  return (
    <div className="chips-input">
      {visibleLabel ? (
        <label className="chips-input__label" htmlFor={inputId}>
          {visibleLabel}
        </label>
      ) : null}
      <div className="chips-input__field">
        {values.length > 0 ? (
          <ul className="chips-input__chips" aria-label={label}>
            {values.map((value) => (
              <li key={artistNameKey(value)} className="chips-input__chip">
                <span>{value}</span>
                <button
                  type="button"
                  className="chips-input__remove"
                  aria-label={`Quitar ${value}`}
                  onClick={() => onChange(values.filter((other) => other !== value))}
                >
                  <RemoveIcon size={14} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <input
          id={inputId}
          type="text"
          className="chips-input__input"
          aria-label={label}
          placeholder={placeholder}
          value={text}
          autoComplete="off"
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={commitText}
        />
        {children}
      </div>
    </div>
  );
}
