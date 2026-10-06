import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { SilbadorIcon } from "../../editor/components/icons";
import { ARTICLES } from "./articleList";
import "./articles.css";

export const metadata: Metadata = {
  title: "Artículos",
  description: "Guías para escribir canciones con acordes y melodías en El Silbador.",
  alternates: { canonical: "/articulos" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    url: "/articulos",
    siteName: "El Silbador",
    locale: "es_AR",
    title: "Artículos",
    description: "Guías para escribir canciones con acordes y melodías en El Silbador.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Artículos",
    description: "Guías para escribir canciones con acordes y melodías en El Silbador.",
  },
};

export default function ArticlesPage() {
  return (
    <main className="articles">
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <SilbadorIcon />
      </a>

      <header className="articles__header">
        <p className="articles__eyebrow">El Silbador</p>
        <h1>Artículos</h1>
        <p className="articles__intro">
          Conocé cómo usar el editor de canciones.
        </p>
      </header>

      <section aria-label="Artículos">
        {ARTICLES.map((article) => (
          <article className="article-preview" key={article.title}>
            <p className="article-preview__date">{article.date}</p>
            <h2>
              <Link href={article.href}>{article.title}</Link>
            </h2>
            <p className="article-preview__summary">{article.summary}</p>
            <Link className="article-preview__more" href={article.href}>
              Leer artículo{" "}
              <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
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
