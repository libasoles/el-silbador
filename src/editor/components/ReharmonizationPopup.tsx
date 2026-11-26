import { useState } from "react";
import {
  keyName,
  modeAvailable,
  suggestChords,
  type SongKey,
  type SuggestionMode,
} from "../../core/reharmonization";
import { Dialog } from "./Dialog";
import "./ReharmonizationPopup.css";

const MODES: { mode: SuggestionMode; label: string }[] = [
  { mode: 1, label: "Triadas" },
  { mode: 2, label: "Extensión armónica por melodía" },
  { mode: 3, label: "Extensión armónica por acordes" },
  { mode: 4, label: "Progresión II-V-I" },
];

export interface ReharmonizationPopupProps {
  open: boolean;
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
}

/** The popup opened by clicking a syllable that has a vocal note while reharmonization is on. */
export function ReharmonizationPopup({
  open,
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
}: ReharmonizationPopupProps) {
  const [mode, setMode] = useState<SuggestionMode>(1);
  // The text the syllable held before this popup's last change, so it can be undone.
  const [undoText, setUndoText] = useState<string | null>(null);

  const base = { key: songKey, note: notePitchClass, previous, next, syllablesBetween, writtenChords };
  const suggestions = suggestChords({ ...base, mode });

  const write = (text: string) => {
    setUndoText(currentChord);
    onWriteChord(text);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title={`Rearmonización · ${noteText}`}
      className="reharmonization"
    >
      <div className="reharmonization__header" role="radiogroup" aria-label="Modo de sugerencia">
        {MODES.map(({ mode: value, label }) => {
          const available = modeAvailable(base, value);
          return (
            <label
              key={value}
              className="reharmonization__mode"
              title={available ? label : value === 4 ? "Escribe al menos un acorde" : `${label} (sin sugerencias)`}
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
      <p className="reharmonization__key">Tonalidad: {keyName(songKey)}</p>
      {mode === 4 && !modeAvailable(base, 4) ? (
        <p className="reharmonization__empty">Escribe al menos un acorde</p>
      ) : (
        <ul className="reharmonization__list" aria-label="Sugerencias">
          {suggestions.map((suggestion) => (
            <li key={suggestion.chord + (suggestion.degree ?? "")}>
              <button
                type="button"
                className="reharmonization__chord"
                aria-current={suggestion.chord === currentChord ? "true" : undefined}
                onClick={() => write(suggestion.chord)}
              >
                <span>{suggestion.chord}</span>
                {suggestion.degree ? (
                  <span className="reharmonization__degree">{suggestion.degree}</span>
                ) : null}
                {suggestion.outOfKey ? (
                  <span className="reharmonization__outside">fuera de la tonalidad</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="reharmonization__actions">
        <button type="button" disabled={undoText === null} onClick={() => {
          if (undoText === null) return;
          onWriteChord(undoText);
          setUndoText(null);
        }}>
          Deshacer
        </button>
        <button type="button" disabled={currentChord === ""} onClick={() => write("")}>
          Eliminar acorde
        </button>
      </div>
    </Dialog>
  );
}
