import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SilbadorIcon } from "../../../editor/components/icons";
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
import "../articles.css";

export const metadata: Metadata = {
  title: "Cómo escribir las notas de la canción",
  description:
    "Mostrar, escribir y corregir las notas de la melodía debajo de la letra en El Silbador: unir sílabas, marcar subidas y bajadas, y cambiar de tono.",
};

const FIRST_LINE = "Una noche tibia nos conocimos";

export default function SongNotesArticlePage() {
  return (
    <main className="article-page">
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
          <h2>Mostrar u ocultar las notas</h2>
          <p>
            El botón del subrayado, en la barra lateral del editor, hace dos
            cosas a la vez: dibuja una rayita debajo de cada sílaba y muestra
            las notas que van debajo de esa rayita. Apretalo de nuevo y la letra
            queda limpia, sin notas.
          </p>
          <ArticleChordEditor
            sheet={YPACARAI_SHEET}
            melody={YPACARAI_MELODY}
            showMelody
            label="Editor con el botón del subrayado y las notas de la melodía"
            tools={["underline"]}
          />
          <p className="highlight">
            Ocultar las notas no las borra: siguen ahí para cuando las vuelvas a
            mostrar.
          </p>

          <h2>Escribir una nota</h2>
          <p>
            Con el subrayado visible, hacé click justo debajo de la rayita de
            una sílaba y escribí la nota: do, re, mi, fa, sol, la o si. Para los
            sostenidos y bemoles agregale # o b, como en fa# o sib.
          </p>
          <MelodyTypingExample />
          <p>
            Presioná Enter o hacé click afuera para terminar. Con las flechas
            del teclado pasás a la sílaba anterior o a la siguiente.
          </p>
          <p>
            Probá con el primer verso de «Recuerdos de Ypacaraí»: do, mi, sol,
            mi, la, la, sol, mi, do, la, la.
          </p>
          <ArticleChordEditor
            sheet={FIRST_LINE}
            showMelody
            label="Editor con un verso sin notas"
            needsEditing
          />
          <p>
            Para corregir una nota, hacé click sobre ella y cambiala. Si borrás
            todas las letras, la nota desaparece.
          </p>

          <h2>Una nota para varias sílabas</h2>
          <p>
            A veces dos sílabas se cantan juntas, en una sola nota. Pasa mucho
            cuando una palabra termina en vocal y la siguiente empieza con otra:
            en «Junto al», la «o» de junto y la «a» de al se cantan de un tirón.
          </p>
          <p>
            Para unirlas, hacé click en el espacio que hay entre las dos
            sílabas. La rayita de abajo se vuelve una sola y las dos comparten
            la misma nota.
          </p>
          <MelodyJoinExample />
          <p>
            En el segundo verso, «to» y «al» todavía están separadas y una de
            las dos quedó sin nota. Hacé click entre ellas para unirlas:
          </p>
          <ArticleChordEditor
            sheet={YPACARAI_SHEET}
            melody={YPACARAI_MELODY_UNJOINED}
            showMelody
            label="Editor con dos sílabas para unir en el segundo verso"
            needsEditing
          />
          <p>
            Si te equivocaste, hacé click otra vez en el mismo lugar y se
            separan.
          </p>
          <p className="highlight">
            Si las dos sílabas tenían nota, queda la de la primera.
          </p>

          <h2>Subidas y bajadas</h2>
          <p>
            Escribir «sol» no alcanza para saber si es el sol de abajo o el de
            arriba. Por eso cada nota puede llevar una flecha: ↑ si suena más
            aguda que la anterior y ↓ si suena más grave.
          </p>
          <p>
            Para ponerla, agarrá la nota y arrastrala hacia arriba o hacia
            abajo. Al soltarla, la nota vuelve a su lugar y la flecha queda
            debajo.
          </p>
          <PitchDragExample />
          <p>
            En el primer verso, el mi de «na» suena más agudo que el do de «U»:
            arrastralo hacia arriba. Después, arrastrá hacia abajo el mi de
            «che», que vuelve a bajar después del sol.
          </p>
          <ArticleChordEditor
            sheet={YPACARAI_SHEET}
            melody={YPACARAI_MELODY_FLAT}
            showMelody
            label="Editor con la melodía completa y sin flechas"
            needsEditing
          />
          <p>
            Para sacar una flecha, arrastrá la nota en la dirección contraria.
            La flecha solo se puede poner en una sílaba que ya tiene nota.
          </p>

          <h2>Cambiar de tono</h2>
          <p>
            Los botones − y + suben o bajan de a medio tono los acordes y
            también las notas de la melodía, juntos. Apretá + dos veces: el sol
            pasa a ser la, el do pasa a ser re y el C pasa a ser D.
          </p>
          <ArticleChordEditor
            sheet={YPACARAI_CHORD_SHEET}
            melody={YPACARAI_MELODY}
            showMelody
            label="Editor con acordes, notas y el control para cambiar de tono"
            tools={["transpose"]}
          />
          <p>
            Las flechas no cambian. Como toda la melodía se mueve la misma
            distancia, lo que subía sigue subiendo y lo que bajaba sigue
            bajando.
          </p>
          <p className="highlight">
            Las notas usan sostenidos o bemoles igual que los acordes: si la
            canción está escrita con Bb, la melodía va a decir sib y no la#.
          </p>
        </div>
      </article>
    </main>
  );
}
