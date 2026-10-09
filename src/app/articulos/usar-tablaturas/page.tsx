import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { SilbadorIcon, TabsIcon } from "../../../editor/components/icons";
import { ArticleChordEditor } from "../ArticleChordEditor";
import { ArticleJsonLd } from "../ArticleJsonLd";
import { ArticleNextLink } from "../ArticleNextLink";
import { articleMetadata } from "../articleSeo";
import "../articles.css";

const ARTICLE = {
  title: "Cómo usar las tablaturas",
  description:
    "Agregar, escribir, copiar y mostrar tablaturas de guitarra dentro de una canción en El Silbador.",
  slug: "usar-tablaturas",
};

export const metadata: Metadata = articleMetadata(ARTICLE);

const RIFF = ["Introducción", "TAB", "Ya llega el alba"].join("\n");

const RIFF_TABS = {
  1: {
    tabs: [
      [
        [3, null, null, null, null, null],
        [null, null, null, 5, null, null],
        [null, 3, null, null, null, null],
        [3, null, null, null, null, null],
      ],
    ],
  },
};

const EMPTY_TAB = ["", "", ""].join("\n");

export default function TabsArticlePage() {
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
        <p className="article-page__meta">Guía del editor · tablaturas</p>
        <h1>Cómo usar las tablaturas</h1>
        <p className="article-page__lead">
          Podés agregar tablaturas a una canción.
        </p>

        <div className="article-page__body">
          <h2>Mostrar u ocultar las tablaturas</h2>
          <p>
            Cuando una canción tiene tablaturas, el botón{" "}
            <span className="article-inline-icon">
              <TabsIcon />
            </span>{" "}
            de la barra lateral las muestra u oculta.
          </p>

          <h2>Agregar una tablatura</h2>
          <p>
            En una computadora, escribí{" "}
            <span className="article-syllable">TAB</span> en una línea vacía.
            Después presioná <span className="article-action">Enter</span>,{" "}
            <span className="article-action">Tab</span> o la barra espaciadora.
            Esa línea se convierte en una tablatura vacía.
          </p>
          <p>Probá escribir TAB y presioná Enter:</p>
          <ArticleChordEditor
            sheet={EMPTY_TAB}
            label="Editor con una línea vacía para agregar una tablatura"
          />
          <p className="article-highlight">
            TAB debe escribirse en un renglón en blanco y en mayúsculas.
          </p>

          <h2>Escribir los trastes</h2>
          <p>
            Hacé <span className="article-action">click</span> en una cuerda y
            escribí el número de traste, entre 0 y 24. Con las flechas,{" "}
            <span className="article-action">Enter</span> o{" "}
            <span className="article-action">Tab</span> podés pasar al próximo
            casillero.
          </p>
          <p>
            Si dos notas van juntas, escribilas en la misma columna: una arriba
            de la otra. Para borrar un número, seleccioná el casillero y usá{" "}
            <span className="article-action">Backspace</span> o{" "}
            <span className="article-action">Supr</span>.
          </p>
          <p>Probá cambiar los trastes en esta tablatura:</p>
          <ArticleChordEditor
            sheet={RIFF}
            tabBlocks={RIFF_TABS}
            label="Editor con una tablatura de guitarra entre dos líneas de la canción"
          />

          <h2>Copiar y pegar</h2>
          <p>
            El botón de copiar, al lado de la tablatura, la copia como texto.
            Podés pegarlo en otro lugar de la canción o guardarlo donde quieras.
          </p>
          <p>
            También podés pegar una tablatura de seis líneas que ya tengas: El
            Silbador la reconoce y crea el bloque automáticamente.
          </p>

          <h2>Más de una tablatura</h2>
          <p>
            El botón <span className="article-action">Nueva tablatura</span>{" "}
            agrega otra debajo de la primera, dentro del mismo bloque. Es útil
            para separar una introducción de un punteo o para mostrar una
            segunda guitarra.
          </p>
          <p>
            La papelera borra esa tablatura. Si es la única que queda, también
            se borra el bloque completo.
          </p>

          <h2>Espaciado</h2>
          <p>
            El control <span className="article-action">Espaciado</span> cambia
            la distancia entre las notas para que el ritmo se lea mejor. No
            cambia los trastes ni cómo suena la canción.
          </p>

          <h2>En el celular</h2>
          <p>
            En el celular podés mostrar u ocultar las tablaturas, leerlas,
            copiarlas y exportarlas en PDF. Para agregarlas o modificarlas, abrí
            la canción desde una computadora.
          </p>
        </div>
      </article>

      <ArticleNextLink slug={ARTICLE.slug} />
    </main>
  );
}
