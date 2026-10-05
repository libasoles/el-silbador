import {
  useId,
  useMemo,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { artistNameKey, suggestArtistNames } from "../../core/artistNames";
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
  /** Every name worth suggesting. While typing, the ones containing the text (ignoring case and
   *  accents) and not yet added are offered below the input, up to 8. Left out, the input is a
   *  plain text field with no suggestions. */
  suggestions?: readonly string[];
  /** Accessible name of the suggestions list. */
  suggestionsLabel?: string;
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
 *
 * With `suggestions`, the input is a combobox (WAI-ARIA pattern; Radix has no combobox primitive):
 * the arrows move through the matching names, Enter adds the selected one (or the typed text when
 * none is selected), a click adds one, and Escape closes the list keeping the text.
 */
export function ChipsInput({
  label,
  visibleLabel,
  values,
  onChange,
  placeholder,
  suggestions,
  suggestionsLabel = "Sugerencias",
}: ChipsInputProps) {
  const inputId = useId();
  const listboxId = useId();
  const [text, setTextState] = useState("");
  const [open, setOpen] = useState(false);
  // -1 means no suggestion is selected, so Enter adds the typed text.
  const [activeIndex, setActiveIndex] = useState(-1);

  const matches = useMemo(
    () => (suggestions ? suggestArtistNames(suggestions, text, values) : []),
    [suggestions, text, values],
  );
  const showSuggestions = open && matches.length > 0;
  const optionId = (index: number) => `${listboxId}-${index}`;

  const setText = (value: string) => {
    setTextState(value);
    setActiveIndex(-1);
    setOpen(value.trim() !== "");
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

  const chooseSuggestion = (name: string) => {
    addNames([name]);
    setText("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((index) => {
        if (index === -1) return step === 1 ? 0 : matches.length - 1;
        return (index + step + matches.length) % matches.length;
      });
      return;
    }
    if (showSuggestions && event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    if (event.key === "Enter" && showSuggestions && activeIndex >= 0) {
      event.preventDefault();
      chooseSuggestion(matches[activeIndex]);
      return;
    }
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
          {...(suggestions
            ? {
                role: "combobox",
                "aria-autocomplete": "list" as const,
                "aria-expanded": showSuggestions,
                "aria-controls": listboxId,
                "aria-activedescendant":
                  showSuggestions && activeIndex >= 0 ? optionId(activeIndex) : undefined,
              }
            : {})}
          placeholder={placeholder}
          value={text}
          autoComplete="off"
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => {
            commitText();
            setOpen(false);
          }}
        />
        {showSuggestions ? (
          <ul id={listboxId} role="listbox" aria-label={suggestionsLabel} className="chips-input__suggestions">
            {matches.map((name, index) => (
              <li
                key={artistNameKey(name)}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className="chips-input__suggestion"
                // Keeps the focus in the input, so its blur doesn't add the half-typed text first.
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => chooseSuggestion(name)}
              >
                {name}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
