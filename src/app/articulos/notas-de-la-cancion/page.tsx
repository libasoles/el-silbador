import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SilbadorIcon, UnderlineIcon } from "../../../editor/components/icons";
import { ArticleChordEditor } from "../ArticleChordEditor";
import {
  MelodyJoinExample,
  MelodyTypingExample,
  PitchDragExample,
} from "../ArticleMelodyExamples";
import {
  YPACARAI_CHORD_SHEET,
  YPACARAI_MELODY,
  YPACARAI_MELODY_FLAT,
  YPACARAI_MELODY_UNJOINED,
  YPACARAI_SHEET,
} from "../ypacaraiSong";
import { ArticleJsonLd } from "../ArticleJsonLd";
import { articleMetadata } from "../articleSeo";
import "../articles.css";

const ARTICLE = {
  title: "Cómo escribir las notas de la canción",
  description:
    "Mostrar, escribir y corregir las notas de la melodía debajo de la letra en El Silbador: unir sílabas, marcar ascensos y descensos, y cambiar de tono.",
  slug: "notas-de-la-cancion",
} as const;

export const metadata: Metadata = articleMetadata(ARTICLE);

const FIRST_LINE = "Una noche tibia nos conocimos";

export default function SongNotesArticlePage() {
  return (
    <main className="article-page">
      <ArticleJsonLd {...ARTICLE} />
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <SilbadorIcon />
      </a>

      <Link className="article-page__back" href="/articulos">
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Artículos
      </Link>

      <article className="article-page__content">
        <p className="article-page__meta">Guía del editor · melodía</p>
        <h1>Cómo escribir las notas de la canción</h1>
        <p className="article-page__lead">
          Los acordes van arriba, la melodía abajo.
        </p>

        <div className="article-page__body">
          <h2>Separación en sílabas</h2>

          <p>
            Todo el texto de la canción se divide automáticamente en sílabas
            para facilitar la escritura de las notas.
          </p>
          <p className="article-highlight">
            Funciona para español. No hay garantía de que funcione en otros
            idiomas.
          </p>

          <h2>Mostrar u ocultar las notas</h2>
          <p>
            El botón del subrayado, en la barra lateral, dibuja una rayita
            debajo de cada sílaba y muestra las notas que van debajo de esa
            rayita, si existen.
          </p>
          <ArticleChordEditor
            sheet={YPACARAI_SHEET}
            melody={YPACARAI_MELODY}
            showMelody
            label="Editor con el botón del subrayado y las notas de la melodía"
            tools={["underline"]}
          />
          <p className="highlight">
            Ocultar las notas con el botón no las borra.
          </p>

          <h2>Escribir una nota</h2>
          <p>
            Hacé <span className="article-action">click</span> justo debajo de
            la rayita de una sílaba y escribí la nota: do, re, mi, fa, sol, la o
            si. Para los sostenidos y bemoles agregale{" "}
            <span className="article-action">#</span> o{" "}
            <span className="article-action">b</span>, como en fa# o sib.
          </p>
          <MelodyTypingExample />
          <p>
            Presioná <span className="article-action">Enter</span> o hacé{" "}
            <span className="article-action">click</span> afuera para terminar.
            Con las <span className="article-action">flechas</span> del teclado
            pasás a la sílaba anterior o a la siguiente.
          </p>
          <p>
            Probá con el primer verso de «Recuerdos de Ypacaraí»: do, mi, sol,
            mi, la, la, sol, mi, do, la, la. Presioná{" "}
            <span className="article-action">Tab</span> cada vez que escribas
            una para pasar al próximo casillero.
          </p>

          <ArticleChordEditor
            sheet={FIRST_LINE}
            showMelody
            label="Editor con un verso sin notas"
            needsEditing
          />

          <p className="article-highlight">
            Solo podes escribir notas con el subrayado visible. Es decir, con
            este botón activo: {"  "}{" "}
            <span className="article-inline-icon">
              <UnderlineIcon />
            </span>
          </p>

          <h2>Editar y borrar notas</h2>
          <p>
            Para corregir una nota, hacé{" "}
            <span className="article-action">click</span> sobre ella y cambiala.
            Si borrás todas las letras, la nota desaparece.
          </p>

          <h2>Una nota para varias sílabas</h2>
          <p>
            A veces dos o más sílabas se cantan juntas, en una sola nota. Pasa
            mucho cuando una palabra termina en vocal y la siguiente empieza con
            otra.
          </p>
          <MelodyJoinExample />
          <p>
            Para unirlas, hacé <span className="article-action">click</span> en
            el espacio que hay entre las dos sílabas. La rayita de abajo se
            vuelve una sola y las dos comparten la misma nota.
          </p>
          <p>
            En el segundo verso, <span className="article-syllable">to</span> y{" "}
            <span className="article-syllable">al</span> todavía están separadas
            y una de las dos quedó sin nota. Hacé{" "}
            <span className="article-action">click</span> entre ellas para
            unirlas:
          </p>
          <ArticleChordEditor
            sheet={YPACARAI_SHEET}
            melody={YPACARAI_MELODY_UNJOINED}
            showMelody
            label="Editor con dos sílabas para unir en el segundo verso"
            needsEditing
          />
          <p>
            Si te equivocaste, hacé{" "}
            <span className="article-action">click</span> otra vez en el mismo
            lugar y se separan.
          </p>
          <p className="highlight">
            Si las dos sílabas tenían nota, queda la de la primera.
          </p>

          <h2>¿Silabas mal unidas?</h2>
          <p>
            A veces da la impresión de que una palabra no está bien separa en
            sílabas. Revisá los acentos, porque por ejemplo la palabra
            "escribias" consideraría{" "}
            <span className="article-syllable">bias</span> como una sola sílaba.
            Pero si agregaras el acento, quedarían{" "}
            <span className="article-syllable">bi</span> y{" "}
            <span className="article-syllable">as</span> como dos sílabas.
          </p>

          <h2>Ascensos y descensos</h2>
          <p>
            Escribir <span className="article-syllable">sol</span> no alcanza
            para saber si es el sol de abajo o el de arriba. Por eso cada nota
            puede llevar una flecha: <span className="article-action">↑</span>{" "}
            si suena más aguda que la anterior y{" "}
            <span className="article-action">↓</span> si suena más grave.
          </p>
          <PitchDragExample />
          <p>La flecha solo se puede poner en una sílaba que tenga nota.</p>
          <p>
            Para ponerla, agarrá la nota y arrastrala hacia arriba o hacia
            abajo. Probá:
          </p>

          <ArticleChordEditor
            sheet={YPACARAI_SHEET}
            melody={YPACARAI_MELODY_FLAT}
            showMelody
            label="Editor con la melodía completa y sin flechas"
            needsEditing
          />
          <p className="article-highlight">
            Para sacar una flecha, arrastrá la nota en la dirección contraria.
          </p>

          <h2>Cambiar de tono</h2>
          <p>
            Los botones − y + suben o bajan de a medio tono los acordes y
            también las notas de la melodía, juntos. Apretá{" "}
            <span className="article-action">+</span> dos veces: el{" "}
            <span className="article-syllable">sol</span> pasa a ser{" "}
            <span className="article-syllable">la</span>, el{" "}
            <span className="article-syllable">do</span> pasa a ser{" "}
            <span className="article-syllable">re</span> y el{" "}
            <span className="article-syllable">C</span> pasa a ser{" "}
            <span className="article-syllable">D</span>.
          </p>
          <ArticleChordEditor
            sheet={YPACARAI_CHORD_SHEET}
            melody={YPACARAI_MELODY}
            showMelody
            label="Editor con acordes, notas y el control para cambiar de tono"
            tools={["transpose"]}
          />
          <p>Las flechas no cambian.</p>
          <p className="highlight">
            Las notas usan sostenidos o bemoles igual que los acordes: si la
            canción está escrita con{" "}
            <span className="article-syllable">Bb</span>, la melodía va a decir{" "}
            <span className="article-syllable">sib</span> y no{" "}
            <span className="article-syllable">la#</span>.
          </p>
        </div>
      </article>
    </main>
  );
}
