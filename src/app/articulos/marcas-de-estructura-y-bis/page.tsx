import type { Metadata } from "next";
import { ArrowLeft, ArrowUpLeft } from "lucide-react";
import Link from "next/link";
import { SilbadorIcon } from "../../../editor/components/icons";
import { ArticleChordEditor } from "../ArticleChordEditor";
import { ArticleJsonLd } from "../ArticleJsonLd";
import { articleMetadata } from "../articleSeo";
import {
  BIS_EXCERPT,
  LABELED_EXCERPT,
  MULTI_BIS_GROUPS,
  STRUCTURE_KEYWORDS,
  TONADA_SHEET,
  UNLABELED_EXCERPT,
} from "../structureSong";
import "../articles.css";

const ARTICLE = {
  title: "Estrofas, estribillos y BIS",
  description:
    "Separar la canción en partes con palabras clave como Estrofa o Estribillo, y marcar con BIS las líneas que se repiten en El Silbador.",
  slug: "marcas-de-estructura-y-bis",
} as const;

export const metadata: Metadata = articleMetadata(ARTICLE);

export default function StructureAndBisArticlePage() {
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
        <p className="article-page__meta">Guía del editor · estructura</p>
        <h1>Marcas de estructura y BIS</h1>
        <p className="article-page__lead">
          Algunas palabras ordenan la canción: dicen qué parte es cuál y qué se
          repite.
        </p>

        <div className="article-page__body">
          <h2>Palabras clave</h2>
          <p>
            Hay palabras que el editor reconoce como el nombre de una parte de
            la canción. Son estas:{" "}
            {STRUCTURE_KEYWORDS.map((keyword, index) => (
              <span key={keyword}>
                <span className="article-syllable">{keyword}</span>
                {index < STRUCTURE_KEYWORDS.length - 2
                  ? ", "
                  : index === STRUCTURE_KEYWORDS.length - 2
                    ? " y "
                    : "."}
              </span>
            ))}
          </p>

          <ArticleChordEditor
            sheet={LABELED_EXCERPT}
            label="Editor con una estrofa marcada con su subtítulo"
          />

          <h2>Cómo se aplican</h2>
          <p>
            Escribí la palabra en su propia línea. No importa si usás mayúsculas
            o minúsculas, ni si le ponés el acento:{" "}
            <span className="article-syllable">ESTRIBILLO</span>,{" "}
            <span className="article-syllable">estribillo</span> e{" "}
            <span className="article-syllable">introduccion</span> también
            valen.
          </p>
          <p>
            Probá escribir <span className="article-syllable">Estrofa</span> en
            la primera línea:
          </p>
          <ArticleChordEditor
            sheet={UNLABELED_EXCERPT}
            label="Editor con una línea vacía antes de la estrofa"
            needsEditing
          />
          <p className="article-highlight">
            Si la línea tiene algo más, como «Estribillo final», no va a
            funcionar.
          </p>

          <h2>BIS</h2>
          <p>
            <span className="article-syllable">BIS</span> quiere decir que una
            parte se canta dos veces. Es usual en géneros como la zamba.
          </p>

          <h2>BIS de una línea</h2>
          <p>Hay dos maneras de marcar una sola línea.</p>
          <p>
            Escribí <span className="article-syllable">BIS</span> al final de la
            línea, en mayúsculas y separado de la última palabra por un espacio.
          </p>
          <ArticleChordEditor
            sheet={BIS_EXCERPT}
            label="Editor con la última línea marcada con BIS"
          />
          <p>
            O poné el cursor en cualquier lugar de la línea y presioná{" "}
            <span className="article-action">Tab</span>: el editor agrega la
            palabra por vos.
          </p>
          <p>
            Probá marcar la última línea de este fragmento con{" "}
            <span className="article-action">Tab</span>:
          </p>
          <ArticleChordEditor
            sheet={TONADA_SHEET}
            label="Editor con un fragmento sin BIS"
            needsEditing
          />

          <h2>BIS de varias líneas</h2>
          <p>
            Cuando se repiten dos o más líneas juntas, seleccioná desde la
            primera hasta la última, aunque sea solo un pedacito de cada una, y
            presioná <span className="article-action">Tab</span>.
          </p>
          <p>
            El BIS queda al final de la última línea, todas las líneas del grupo
            se ven en negrita y la flechita{" "}
            <span className="article-inline-icon">
              <ArrowUpLeft aria-hidden="true" size="1em" strokeWidth={1.75} />
            </span>{" "}
            apunta hacia arriba, para indicar que la repetición empieza más
            arriba.
          </p>
          <ArticleChordEditor
            sheet={BIS_EXCERPT}
            bisGroups={MULTI_BIS_GROUPS}
            label="Editor con las dos últimas líneas marcadas con BIS"
          />
          <p>
            Probá seleccionar las dos últimas líneas de este fragmento y
            presionar <span className="article-action">Tab</span>:
          </p>
          <ArticleChordEditor
            sheet={TONADA_SHEET}
            label="Editor con un fragmento sin BIS para marcar varias líneas"
            needsEditing
          />
          <p className="article-highlight">
            Escribir BIS a mano marca una sola línea. Para un grupo, usá la
            selección y <span className="article-action">Tab</span>.
          </p>

          <h2>Quitar un BIS</h2>
          <p>
            Poné el cursor en la línea y presioná{" "}
            <span className="article-action">Shift</span> +{" "}
            <span className="article-action">Tab</span>. También podés borrar la
            palabra BIS como cualquier otro texto.
          </p>
          <p>
            En un BIS de varias líneas,{" "}
            <span className="article-action">Shift</span> +{" "}
            <span className="article-action">Tab</span> sobre la primera o la
            última línea la saca del grupo elimina esa linea sola. Para quitarlo
            entero, seleccioná todas sus líneas antes de presionar{" "}
            <span className="article-action">Shift</span> +{" "}
            <span className="article-action">Tab</span>.
          </p>
          <ArticleChordEditor
            sheet={BIS_EXCERPT}
            bisGroups={MULTI_BIS_GROUPS}
            label="Editor con un BIS de dos líneas para quitar"
            needsEditing
          />
        </div>
      </article>
    </main>
  );
}
