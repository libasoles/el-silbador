import { useLayoutEffect, useRef, useState } from "react";
import { YPACARAI_LYRICS } from "../../core/fixtures/ypacarai";

interface LyricsInputProps {
  onConfirm: (text: string) => void;
}

/** Textarea that grows to fit its content and never clips it, since `field-sizing` support
 * still varies across browsers. */
function useAutoGrow(value: string) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return ref;
}

export function LyricsInput({ onConfirm }: LyricsInputProps) {
  const [draft, setDraft] = useState("");
  const textareaRef = useAutoGrow(draft);

  return (
    <div className="lyrics-input">
      <textarea
        ref={textareaRef}
        rows={3}
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
