import type { Metadata } from "next";
import { ArrowLeft, Music2 } from "lucide-react";
import Link from "next/link";
import { ArticleChordEditor } from "../ArticleChordEditor";
import "../articles.css";

export const metadata: Metadata = {
  title: "Cómo usar los acordes en el editor",
  description: "Guía para usar, mover y editar acordes en el editor de El Silbador.",
};

export default function ChordEditorArticlePage() {
  return (
    <main className="article-page">
      <a className="app-mark" href="/" aria-label="Volver a El Silbador"><Music2 aria-hidden="true" /></a>
      <Link className="article-page__back" href="/articulos"><ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />Artículos</Link>
      <article className="article-page__content">
        <p className="article-page__meta">Guía del editor · acordes</p>
        <h1>Cómo usar los acordes en el editor</h1>
        <p className="article-page__lead">Los acordes se escriben sobre la letra, se acomodan con un arrastre y quedan siempre ligados al momento de la canción donde los necesitás.</p>
        <div className="article-page__body">
          <p>Abrí una canción propia y usá el botón de acordes de la barra lateral. Cuando está activo aparece la fila sobre cada verso; cuando lo apagás, la letra sigue intacta y simplemente deja de mostrarse esa fila.</p>
          <p>El ejemplo usa el comienzo de <a href="https://elsilbador.com.ar/cancion/tonada-de-un-viejo-amor-a1be2">“Tonada de un viejo amor”</a>. Hacé click en la fila de acordes, justo sobre una sílaba, para escribir una cifra nueva.</p>
          <ArticleChordEditor />
          <h2>Un lugar para cada entrada</h2>
          <p>Cada acorde ocupa una posición de la frase. Podés arrastrarlo a la sílaba que marque mejor el cambio. También hay posiciones en los extremos: soltalo antes de la primera sílaba si empieza antes de cantar, o después de la última si el cambio llega al final.</p>
          <h2>Ver y corregir</h2>
          <p>Al hacer click en un acorde reconocido se abre su diagrama de guitarra. Si querés cambiar el nombre, hacé doble click, escribí la nueva cifra y confirmala al salir del campo. El editor guarda los cambios automáticamente.</p>
        </div>
      </article>
    </main>
  );
}
