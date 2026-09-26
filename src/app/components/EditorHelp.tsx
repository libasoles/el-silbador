import { useEffect, useRef, useState } from "react";
import { ChordIcon, MelodyNoteIcon, NoteStackIcon, UnderlineIcon } from "./icons";

/** Subtle help entry point for the song editor, pinned to the corner of the screen so it stays
    reachable without competing with the editor toolbars. Clicking it reveals the tool
    explanations that used to live in the empty-song placeholder, which only ever showed once. */
export function EditorHelp() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className="editor-help" ref={rootRef}>
      {open ? (
        <div className="editor-help__panel" role="dialog" aria-label="Ayuda del editor">
          <ul className="editor-help__list">
            <li>
              <ChordIcon />
              <span>Muestra u oculta la fila de acordes arriba de la letra.</span>
            </li>
            <li className="editor-help__chord-notes">
              <NoteStackIcon />
              <span>
                Muestra las notas que forman cada acorde, por ejemplo do-mi-sol
                para un Do mayor.
              </span>
            </li>
            <li>
              <UnderlineIcon />
              <span>Muestra u oculta la línea debajo de cada sílaba.</span>
            </li>
            <li>
              <MelodyNoteIcon />
              <span>
                Deja escribir las notas de la melodía, debajo de la línea de
                cada sílaba.
              </span>
            </li>
          </ul>
          <p>
            La separación en sílabas funciona para español. No hay garantía de
            que funcione correctamente en otros idiomas. Se puede unir sílabas
            clickeando el espacio intermedio.
          </p>
          <p className="editor-help__autosave">
            Los cambios se guardan solos mientras escribís, no hace falta
            guardar a mano.
          </p>
        </div>
      ) : null}
      <button
        type="button"
        className="editor-help__button"
        aria-label="Ayuda"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        ?
      </button>
    </div>
  );
}
