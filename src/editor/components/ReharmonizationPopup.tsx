import * as Popover from "@radix-ui/react-popover";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { useState } from "react";
import {
  ALL_KEYS,
  keyName,
  parseKey,
  serializeKey,
  modeAvailable,
  suggestChords,
  type SongKey,
  type SuggestionMode,
} from "../../core/reharmonization";
import { TrashIcon, XIcon } from "./icons";
import "./ReharmonizationPopup.css";

const MODES: { mode: SuggestionMode; label: string }[] = [
  { mode: 1, label: "Triadas" },
  { mode: 2, label: "Extensión armónica por melodía" },
  { mode: 3, label: "Extensión armónica por acordes" },
  { mode: 4, label: "Progresión II-V-I" },
];

export interface ReharmonizationPopupProps {
  /** The chord cell the popup hangs from. */
  anchor: HTMLElement;
  onClose: () => void;
  /** The vocal note of the selected syllable, as written (e.g. "fa#"), and its pitch class. */
  noteText: string;
  notePitchClass: number;
  songKey: SongKey;
  previous: string | null;
  next: string | null;
  /** Metric syllables with a note between the previous and next chord. */
  syllablesBetween: number;
  writtenChords: readonly string[];
  /** The chord currently written on the selected syllable ("" when none). */
  currentChord: string;
  /** Writes (or, with "", removes) the chord on the selected syllable. */
  onWriteChord: (text: string) => void;
  /** The key was fixed by an admin (saved with the song) rather than inferred. */
  keyIsFixed?: boolean;
  /** Fixes the key (or, with null, goes back to inferring it). Admins only; omitted otherwise. */
  onChangeKey?: (key: SongKey | null) => void;
}

/** The popup opened by clicking the chord slot of a syllable that has a vocal note while reharmonization is on, anchored to that slot. */
export function ReharmonizationPopup({
  anchor,
  onClose,
  noteText,
  notePitchClass,
  songKey,
  previous,
  next,
  syllablesBetween,
  writtenChords,
  currentChord,
  onWriteChord,
  keyIsFixed = false,
  onChangeKey,
}: ReharmonizationPopupProps) {
  const [mode, setMode] = useState<SuggestionMode>(1);

  const base = { key: songKey, note: notePitchClass, previous, next, syllablesBetween, writtenChords };
  const suggestions = suggestChords({ ...base, mode });

  // Choosing a chord applies it and closes the popup.
  const write = (text: string) => {
    onWriteChord(text);
    onClose();
  };

  const note = <strong>{noteText}</strong>;
  const suggestionsLabel =
    mode === 1 ? (
      <>Acordes que contienen {note}</>
    ) : mode === 2 ? (
      "Acordes extendibles con la nota de la melodía"
    ) : mode === 3 ? (
      <>Acordes no triádicos que contienen {note}</>
    ) : (
      "Acordes sugeridos"
    );
  const hintOf = (suggestion: (typeof suggestions)[number]): string =>
    [
      suggestion.chordTone ? `Contiene ${noteText} en la ${suggestion.chordTone}` : null,
      suggestion.extendedForm ? `forma ${suggestion.extendedForm}` : null,
      suggestion.outOfKey ? "fuera de la tonalidad" : null,
    ]
      .filter(Boolean)
      .join(" · ");

  const modeLabel = MODES.find((entry) => entry.mode === mode)!.label;
  const AUTO = "auto";

  return (
    <Popover.Root
      open
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Popover.Anchor virtualRef={{ current: anchor }} />
      <Popover.Portal>
        <Popover.Content
          className="reharmonization"
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={12}
          aria-label="Rearmonización"
          // Clicking the slot the popup hangs from keeps it open instead of closing and reopening.
          onInteractOutside={(event) => {
            if (event.target instanceof Node && anchor.contains(event.target)) event.preventDefault();
          }}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Popover.Close className="dialog__close reharmonization__close" aria-label="Cerrar">
            <XIcon size={16} />
          </Popover.Close>
          <h2 className="dialog__title reharmonization__title">Rearmonización</h2>
          {onChangeKey ? (
            <div className="reharmonization__key">
              <span id="reharmonization-key-label">Tonalidad</span>
              <Select.Root
                value={keyIsFixed ? serializeKey(songKey) : AUTO}
                onValueChange={(value) => onChangeKey(value === AUTO ? null : parseKey(value))}
              >
                <Select.Trigger className="reharmonization__select" aria-labelledby="reharmonization-key-label">
                  <Select.Value />
                  <Select.Icon>
                    <ChevronDown size={14} aria-hidden="true" />
                  </Select.Icon>
                </Select.Trigger>
                <Select.Portal>
                  <Select.Content className="reharmonization__select-menu" position="popper" sideOffset={4}>
                    <Select.Viewport>
                      <Select.Item value={AUTO} className="reharmonization__select-item">
                        <Select.ItemText>{`Automática (${keyName(songKey)})`}</Select.ItemText>
                        <Select.ItemIndicator>
                          <Check size={14} aria-hidden="true" />
                        </Select.ItemIndicator>
                      </Select.Item>
                      {ALL_KEYS.map((key) => (
                        <Select.Item
                          key={serializeKey(key)}
                          value={serializeKey(key)}
                          className="reharmonization__select-item"
                        >
                          <Select.ItemText>{keyName(key)}</Select.ItemText>
                          <Select.ItemIndicator>
                            <Check size={14} aria-hidden="true" />
                          </Select.ItemIndicator>
                        </Select.Item>
                      ))}
                    </Select.Viewport>
                  </Select.Content>
                </Select.Portal>
              </Select.Root>
            </div>
          ) : (
            <p className="reharmonization__key">
              <span>Tonalidad</span>
              <strong>{keyName(songKey)}</strong>
            </p>
          )}
          <div className="reharmonization__header">
            <div className="reharmonization__modes" role="radiogroup" aria-label="Modo de sugerencia">
              {MODES.map(({ mode: value, label }) => {
                const available = modeAvailable(base, value);
                return (
                  <label
                    key={value}
                    className="reharmonization__mode"
                    title={
                      available ? label : value === 4 ? "Escribe al menos un acorde" : `${label} (sin sugerencias)`
                    }
                  >
                    <input
                      type="radio"
                      name="reharmonization-mode"
                      value={value}
                      checked={mode === value}
                      disabled={!available}
                      aria-label={`${value}. ${label}`}
                      onChange={() => setMode(value)}
                    />
                    <span aria-hidden="true">{value}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <h3 className="reharmonization__scope">{modeLabel}</h3>
          <p className="reharmonization__label">
            Nota de la melodía: <strong>{noteText}</strong>
          </p>
          <p className="reharmonization__label">{suggestionsLabel}</p>
          {mode === 4 && !modeAvailable(base, 4) ? (
            <p className="reharmonization__empty">Escribe al menos un acorde</p>
          ) : (
            <ul
              className={`reharmonization__list${mode === 4 ? " reharmonization__list--progression" : ""}`}
              aria-label="Sugerencias"
            >
              {suggestions.map((suggestion) => {
                const hint = mode === 4 ? "" : hintOf(suggestion);
                return (
                  <li key={suggestion.chord + (suggestion.degree ?? "")}>
                    <button
                      type="button"
                      className="reharmonization__chord"
                      aria-current={suggestion.chord === currentChord ? "true" : undefined}
                      onClick={() => write(suggestion.chord)}
                    >
                      <span className="reharmonization__degree">{suggestion.degree ?? ""}</span>
                      <span className="reharmonization__name">{suggestion.chord}</span>
                      {hint ? <span className="reharmonization__outside">{hint}</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="reharmonization__actions">
            <button
              type="button"
              className="reharmonization__delete"
              disabled={currentChord === ""}
              onClick={() => write("")}
            >
              <TrashIcon size={16} aria-hidden="true" />
              Eliminar acorde
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
