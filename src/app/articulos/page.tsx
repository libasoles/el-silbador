import type { Metadata } from "next";
import { ArrowRight, Music2 } from "lucide-react";
import Link from "next/link";
import "./articles.css";

export const metadata: Metadata = {
  title: "Artículos",
  description: "Borrador de artículos de El Silbador.",
  robots: { index: false, follow: false },
};

const articles = [
  {
    date: "Próximamente",
    title: "Lorem ipsum y el arte de escuchar una canción",
    summary:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed posuere, justo a tempus feugiat, deja espacio para que la melodía encuentre su propia forma.",
    topics: ["lorem", "música", "cancionero"],
  },
  {
    date: "Próximamente",
    title: "Una vuelta más sobre los acordes",
    summary:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Quisque en una rueda de acordes abre una puerta distinta para cantar, tocar y volver a empezar.",
    topics: ["lorem", "guitarra", "acordes"],
  },
  {
    date: "Próximamente",
    title: "Canciones que se aprenden de oído",
    summary:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Nulla facilisi: una voz, unas cuerdas y el tiempo suficiente para descubrir dónde cae cada palabra.",
    topics: ["lorem", "oído", "práctica"],
  },
  {
    date: "Próximamente",
    title: "El cuaderno antes del cancionero",
    summary:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vestibulum ante ipsum primis in faucibus: apuntes, tachaduras y versos que todavía buscan su canto.",
    topics: ["lorem", "escritura", "canciones"],
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

      <section className="articles__list" aria-label="Borradores de artículos">
        {articles.map((article) => (
          <article className="article-preview" key={article.title}>
            <p className="article-preview__date">{article.date}</p>
            <h2>
              <Link href="/articulos/ejemplo">{article.title}</Link>
            </h2>
            <p className="article-preview__summary">{article.summary}</p>
            <Link className="article-preview__more" href="/articulos/ejemplo">
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
