import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SilbadorIcon } from "../../../editor/components/icons";
import {
  ArticleChordEditor,
  ChordDiagramFigure,
  EDGE_EXCERPT,
  EdgeChordExample,
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
          En El Silbador cada acorde va pegado a una sílaba de la letra. Así queda justo donde
          cambia la armonía, aunque la línea se corra o cambie el tamaño de la pantalla.
        </p>

        <div className="article-page__body">
          <h2>Mostrar u ocultar los acordes</h2>
          <p>
            El botón de la guitarra, en la barra lateral del editor, muestra u oculta la fila de
            acordes que va arriba de cada verso. Apagarlo no borra nada: los acordes siguen
            ahí y vuelven a aparecer en el mismo lugar cuando lo prendés. Sirve para leer o
            cantar solo la letra.
          </p>
          <p>
            El botón de al lado agrega, abajo de cada acorde, las notas que lo forman: la-do#-mi
            para un A. Solo se puede usar cuando la canción ya tiene algún acorde.
          </p>
          <ArticleChordEditor
            sheet={TONADA_EXCERPT}
            label="Editor con los botones de acordes y de notas del acorde"
            tools={["trackToggles"]}
          />

          <h2>Escribir un acorde</h2>
          <p>
            Hacé click justo arriba de la sílaba donde cambia el acorde y escribilo: A, Dm, E7,
            F#m… Cuando terminás, apretá Enter o hacé click en cualquier otro lado. Con las
            flechas pasás a la sílaba anterior o a la siguiente sin soltar el teclado.
          </p>
          <p>
            Probá ponerle los acordes a estos dos versos: A sobre <em>nun</em>, A7 sobre{" "}
            <em>de</em> y D sobre <em>dar</em>; después E7 sobre <em>re</em> y A sobre{" "}
            <em>bias</em>.
          </p>
          <ArticleChordEditor
            sheet={LYRICS_ONLY}
            label="Editor con dos versos sin acordes"
            needsEditing
          />
          <p>
            Si ya tenés la canción con los acordes escritos en la línea de arriba, como en
            cualquier cancionero, pegala entera en el editor: El Silbador reconoce cada acorde y
            lo pone sobre la sílaba que le corresponde.
          </p>

          <h2>Mover un acorde a otra sílaba</h2>
          <p>
            Si un acorde quedó corrido, arrastralo hasta la sílaba correcta. Mientras lo movés,
            la sílaba que lo va a recibir se marca con una línea más gruesa; soltalo ahí.
          </p>
          <MoveChordExample />
          <p>Acá están los mismos tres acordes mal ubicados, para que lo hagas vos:</p>
          <ArticleChordEditor
            sheet={MOVE_EXCERPT}
            label="Editor con tres acordes corridos de lugar"
            needsEditing
          />

          <h2>Antes y después de la frase</h2>
          <p>
            A veces el acorde suena antes de que empieces a cantar, o recién cuando la frase ya
            terminó. Para eso cada verso tiene un lugar libre antes de la primera sílaba y otro
            después de la última: arrastrá el acorde hasta el borde de la línea y se marca el
            espacio donde va a quedar.
          </p>
          <EdgeChordExample />
          <p>
            Podés poner más de un acorde en cada borde: cuando uno ocupa el lugar, aparece otro
            libre al lado.
          </p>
          <ArticleChordEditor
            sheet={EDGE_EXCERPT}
            label="Editor con el último verso del fragmento"
            needsEditing
          />

          <h2>Corregir un acorde con doble click</h2>
          <p>
            Para cambiar un acorde que ya escribiste, hacé doble click sobre él: se convierte en
            un campo de texto con el acorde adentro. Escribí el nuevo y apretá Enter. Si borrás
            todo el texto, el acorde desaparece.
          </p>
          <p>Probá cambiar el A7 de este verso por un A:</p>
          <ArticleChordEditor
            sheet={CORRECT_EXCERPT}
            label="Editor con un verso para corregir"
            needsEditing
          />

          <h2>Ver cómo se toca</h2>
          <p>
            Un solo click sobre un acorde abre su diagrama para guitarra: qué traste pisar en
            cada cuerda y qué cuerdas no se tocan. Si el acorde se puede armar en más de una
            posición del mástil, las flechas del diagrama pasan de una a otra, y la que dejes
            elegida queda guardada para ese acorde. Para cerrarlo, hacé click en cualquier otro
            lado.
          </p>
          <ChordDiagramFigure chord="A7" />
          <p>Hacé click en cualquiera de estos acordes:</p>
          <ArticleChordEditor sheet={DIAGRAM_EXCERPT} label="Editor para ver los diagramas" />
          <p>
            El diagrama también se abre en el celular y en las canciones de otras personas,
            aunque no las puedas editar.
          </p>

          <h2>Cambiar de tono</h2>
          <p>
            Si la canción te queda alta o baja, los botones − y + suben o bajan todos los
            acordes de a medio tono. El número del medio indica cuántos medios tonos te moviste
            del original; hacé click en él para volver al tono de siempre.
          </p>
          <ArticleChordEditor
            sheet={TONADA_EXCERPT}
            label="Editor con el control para cambiar de tono"
            tools={["transpose"]}
          />
        </div>
      </article>
    </main>
  );
}
