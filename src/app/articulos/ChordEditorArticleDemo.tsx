"use client";

import { useState } from "react";
import { Music2 } from "lucide-react";
import { findChordShape } from "../../core/findChordShape";
import { ChordDragTutorialExample } from "../../editor/components/ChordDragTutorialExample";
import { ChordDiagram } from "../../editor/components/ChordDiagram";

const SONG_EXCERPT = `    A           A7     D
Ya nunca te he de olvidar
       E7           A
en la arena me escribias
             A7    D
El viento lo fue borrando
    B7      E7              A
y estoy mas solo mirando el mar.`;

const LYRIC_EXCERPT = `Ya nunca te he de olvidar
en la arena me escribias
El viento lo fue borrando
y estoy mas solo mirando el mar.`;

/** Hands-on guide built with the editor's real diagram and drag tutorial components. */
export function ChordEditorArticleDemo() {
  const [chordsVisible, setChordsVisible] = useState(true);
  const [newChord, setNewChord] = useState("");
  const [editingNewChord, setEditingNewChord] = useState(false);
  const [editChord, setEditChord] = useState(false);
  const [currentChord, setCurrentChord] = useState("A7");
  const [diagramOpen, setDiagramOpen] = useState(false);
  const shape = findChordShape(currentChord);

  return (
    <div className="chord-guide" aria-label="Ejemplos interactivos del editor de acordes">
      <section className="chord-guide__section">
        <div className="chord-guide__toolbar">
          <button type="button" className="chord-guide__toggle" aria-pressed={chordsVisible} onClick={() => setChordsVisible((visible) => !visible)}>
            <Music2 aria-hidden="true" size={18} strokeWidth={1.75} />
            {chordsVisible ? "Acordes visibles" : "Mostrar acordes"}
          </button>
          <span>El toggle muestra u oculta la fila de acordes; la letra no cambia.</span>
        </div>
        <pre className="chord-guide__excerpt">{chordsVisible ? SONG_EXCERPT : LYRIC_EXCERPT}</pre>
        <p className="chord-guide__credit">Fragmento de <a href="https://elsilbador.com.ar/cancion/tonada-de-un-viejo-amor-a1be2">“Tonada de un viejo amor”</a>.</p>
      </section>

      <section className="chord-guide__section">
        <p className="chord-guide__label">Escribir sobre una sílaba</p>
        <div className="chord-guide__writing" aria-label="Ejemplo para escribir un acorde">
          <button type="button" className="chord-guide__slot" aria-label="Escribir un acorde sobre la sílaba nun" onClick={() => setEditingNewChord(true)}>
            {editingNewChord ? <input aria-label="Acorde nuevo" autoFocus value={newChord} placeholder="A" onChange={(event) => setNewChord(event.target.value)} onBlur={() => setEditingNewChord(false)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }} /> : newChord || " "}
          </button>
          {['Ya', 'nun', 'ca', 'te', 'he', 'de', 'ol', 'vi', 'dar'].map((syllable) => <span key={syllable} className={"chord-guide__syllable" + (syllable === "nun" ? " chord-guide__syllable--target" : "")}>{syllable}</span>)}
        </div>
        <p className="chord-guide__hint">Hacé click en el espacio de acorde sobre “nun”, escribí y presioná Enter o hacé click afuera.</p>
      </section>

      <section className="chord-guide__section">
        <p className="chord-guide__label">Mover el acorde</p>
        <p className="chord-guide__hint">Arrastralo hasta otra sílaba. Este es el mismo ejemplo que aparece en el aviso educativo del editor: también admite dejar un acorde antes o después de la frase.</p>
        <ChordDragTutorialExample />
        <div className="chord-guide__edges" aria-label="Acordes antes y después de una frase">
          <span className="chord-guide__chip">B7</span><span className="chord-guide__edge">antes</span><span className="chord-guide__phrase">mi-ran-do el mar</span><span className="chord-guide__edge">después</span><span className="chord-guide__chip">A</span>
        </div>
      </section>

      <section className="chord-guide__section">
        <p className="chord-guide__label">Consultar o cambiar un acorde</p>
        <div className="chord-guide__details">
          <div>
            {editChord ? <input className="chord-guide__edit-input" aria-label="Editar acorde" autoFocus value={currentChord} onChange={(event) => setCurrentChord(event.target.value)} onBlur={() => setEditChord(false)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === "Escape") event.currentTarget.blur(); }} /> : <button type="button" className="chord-guide__chip chord-guide__chip--action" onClick={() => setDiagramOpen((open) => !open)} onDoubleClick={() => { setDiagramOpen(false); setEditChord(true); }}>{currentChord}</button>}
            <p className="chord-guide__hint">Un click muestra su dibujo; doble click abre la escritura para actualizarlo.</p>
          </div>
          {diagramOpen && shape ? <ChordDiagram shape={shape} /> : null}
        </div>
      </section>
    </div>
  );
}
