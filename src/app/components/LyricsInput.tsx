import { useState } from "react";
import { YPACARAI_LYRICS } from "../../core/fixtures/ypacarai";

interface LyricsInputProps {
  onConfirm: (text: string) => void;
}

export function LyricsInput({ onConfirm }: LyricsInputProps) {
  const [draft, setDraft] = useState("");

  return (
    <div className="lyrics-input">
      <textarea
        rows={6}
        placeholder="Pegá o escribí la letra de una canción..."
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
      />
      <div className="lyrics-input__actions">
        <button type="button" onClick={() => onConfirm(draft)} disabled={draft.trim().length === 0}>
          Silabear
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(YPACARAI_LYRICS);
            onConfirm(YPACARAI_LYRICS);
          }}
        >
          Cargar "Recuerdos de Ypacaraí"
        </button>
      </div>
    </div>
  );
}
