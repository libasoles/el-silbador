import type { Metadata } from "next";
import { ArrowRight, Music2 } from "lucide-react";
import Link from "next/link";
import "./articles.css";

export const metadata: Metadata = {
  title: "Artículos",
  description: "Guías y notas sobre canciones en El Silbador.",
};

const articles = [
  {
    date: "Guía del editor",
    title: "Cómo usar los acordes en el editor",
    summary:
      "Una guía práctica para mostrar, escribir, mover, consultar y corregir acordes sobre una canción.",
    topics: ["editor", "guitarra", "acordes"],
  },
] as const;

export default function ArticlesPage() {
  return (
    <main className="articles">
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <Music2 aria-hidden="true" />
      </a>

      <header className="articles__header">
        <p className="articles__eyebrow">El Silbador</p>
        <h1>Artículos</h1>
        <p className="articles__intro">
          Notas, ideas y pequeñas historias alrededor de las canciones.
        </p>
      </header>

      <section className="articles__list" aria-label="Artículos">
        {articles.map((article) => (
          <article className="article-preview" key={article.title}>
            <p className="article-preview__date">{article.date}</p>
            <h2>
              <Link href="/articulos/usar-acordes-en-el-editor">{article.title}</Link>
            </h2>
            <p className="article-preview__summary">{article.summary}</p>
            <Link className="article-preview__more" href="/articulos/usar-acordes-en-el-editor">
              Leer artículo <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
            </Link>
            <ul className="article-preview__topics" aria-label="Temas">
              {article.topics.map((topic) => (
                <li key={topic}>{topic}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
