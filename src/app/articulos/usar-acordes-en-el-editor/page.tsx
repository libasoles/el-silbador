import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SilbadorIcon } from "../../../editor/components/icons";
import {
  ArticleChordEditor,
  ChordDiagramFigure,
  EDGE_EXCERPT,
  EdgeChordExample,
  EMPTY_LINE,
  EXAMPLE_LINE,
  MOVE_EXCERPT,
  MoveChordExample,
  TONADA_EXCERPT,
} from "../ArticleChordEditor";
import "../articles.css";

export const metadata: Metadata = {
  title: "Cómo usar los acordes en el editor",
  description:
    "Mostrar, escribir, mover, corregir y consultar acordes en el editor de El Silbador, con ejemplos para probar.",
};

const LYRICS_ONLY = `Ya nunca te he de olvidar
en la arena me escribias`;

const CORRECT_EXCERPT = `             A7    D
El viento lo fue borrando`;

const DIAGRAM_EXCERPT = `    A           A7     D
Ya nunca te he de olvidar`;

export default function ChordEditorArticlePage() {
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
        <p className="article-page__meta">Guía del editor · acordes</p>
        <h1>Cómo usar los acordes en el editor</h1>
        <p className="article-page__lead">
          Cada acorde va pegado a una sílaba o a un espacio en blanco. Justo
          donde conviene.
        </p>

        <div className="article-page__body">
          <h2>Mostrar u ocultar los acordes</h2>
          <p>
            El botón de la guitarra, en la barra lateral del editor, muestra u
            oculta la fila de acordes que va arriba de cada verso.
          </p>
          <p>
            El otro muestra las notas que lo forman: la-do#-mi para un A. Solo
            se puede usar cuando la canción ya tiene algún acorde.
          </p>
          <p className="article-highlight">
            Solo se puede usar cuando la canción ya tiene algún acorde.
          </p>
          <ArticleChordEditor
            sheet={TONADA_EXCERPT}
            label="Editor con los botones de acordes y de notas del acorde"
            tools={["trackToggles"]}
          />

          <h2>Escribir un acorde</h2>
          <p>
            Hacé click justo arriba de la sílaba y escribí algo, por ejemplo A.
            Después, presioná Enter o hacé click afuera, en cualquier lado.
          </p>
          <p>Con las flechas pasás a la sílaba anterior o a la siguiente.</p>
          <ArticleChordEditor
            sheet={LYRICS_ONLY}
            label="Editor con dos versos sin acordes"
            needsEditing
          />

          <h2>Copiar y Pegar</h2>
          <p>
            Si ya tenés la canción con los acordes escritos en la línea de
            arriba, pegala en el editor: El Silbador reconoce cada acorde y lo
            pone sobre la sílaba que le corresponde.
          </p>

          <p>Copia y pega este texto en el recuadro de abajo: </p>
          <pre>{EXAMPLE_LINE}</pre>

          <ArticleChordEditor
            sheet={EMPTY_LINE}
            label="Editor vacío"
            needsEditing
          />

          <h2>Mover un acorde a otra sílaba</h2>
          <p>
            Si un acorde quedó corrido, arrastralo hasta la sílaba correcta.
            Mientras lo movés, la sílaba que lo va a recibir se marca con una
            línea más gruesa; soltalo ahí.
          </p>
          <MoveChordExample />
          <p>
            Acá están los mismos tres acordes mal ubicados, para que lo hagas
            vos:
          </p>
          <ArticleChordEditor
            sheet={MOVE_EXCERPT}
            label="Editor con tres acordes corridos de lugar"
            needsEditing
          />

          <h2>Antes y después de la frase</h2>
          <p>
            A veces el acorde suena antes de que empieces a cantar, o recién
            cuando la frase termina.
          </p>
          <EdgeChordExample />
          <p>Arrastrá un acorde hasta el borde de la línea y soltalo ahí.</p>
          <ArticleChordEditor
            sheet={EDGE_EXCERPT}
            label="Editor con el último verso del fragmento"
            needsEditing
          />
          <p>
            Podés poner más de un acorde en cada borde: cuando uno ocupa el
            lugar, se habilita otro espacio libre al lado.
          </p>

          <h2>Corregir un acorde con doble click</h2>
          <p>
            Para cambiar un acorde que ya escribiste, hacele doble click.
            Modificá el texto y apretá Enter.
          </p>
          <p>Probá cambiar el A7 de este verso por un A:</p>
          <ArticleChordEditor
            sheet={CORRECT_EXCERPT}
            label="Editor con un verso para corregir"
            needsEditing
          />

          <h2>Borrar un acorde</h2>
          <p>Editalo, borra las letras, y el acorde desaparece.</p>

          <h2>Dibujo del acorde</h2>
          <p>
            Un click sobre un acorde abre su diagrama para guitarra. Si el
            acorde se puede armar en más de una posición del mástil, las flechas
            del diagrama pasan de una a otra.
          </p>

          <p className="article-highlight">
            La forma que dejes elegida queda guardada.
          </p>

          <p>Para cerrarlo, hacé click en cualquier</p>

          <ChordDiagramFigure chord="A7" />
          <p>Hacé click en cualquiera de estos acordes:</p>
          <ArticleChordEditor
            sheet={DIAGRAM_EXCERPT}
            label="Editor para ver los diagramas"
          />

          <h2>Cambiar de tono</h2>
          <p>
            Si la canción te queda alta o baja, los botones − y + suben o bajan
            todos los acordes de a medio tono. El número del medio indica
            cuántos medios tonos te moviste del original; hacé click en él para
            volver al tono de siempre.
          </p>
          <ArticleChordEditor
            sheet={TONADA_EXCERPT}
            label="Editor con el control para cambiar de tono"
            tools={["transpose"]}
          />
          <p className="article-highlight">
            El tono que elijas queda guardado para todos. Pero cada persona
            puede cambiarlo de manera independiente.
          </p>
        </div>
      </article>
    </main>
  );
}
