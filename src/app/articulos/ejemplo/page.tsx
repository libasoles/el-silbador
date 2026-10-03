import type { Metadata } from "next";
import { ArrowLeft, Music2 } from "lucide-react";
import Link from "next/link";
import "../articles.css";

export const metadata: Metadata = {
  title: "Artículo de ejemplo",
  description: "Borrador de artículo de ejemplo de El Silbador.",
  robots: { index: false, follow: false },
};

export default function ExampleArticlePage() {
  return (
    <main className="article-page">
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <Music2 aria-hidden="true" />
      </a>

      <Link className="article-page__back" href="/articulos">
        <ArrowLeft aria-hidden="true" size={16} strokeWidth={1.75} />
        Artículos
      </Link>

      <article className="article-page__content">
        <p className="article-page__meta">Próximamente · borrador</p>
        <h1>Lorem ipsum y el arte de escuchar una canción</h1>
        <p className="article-page__lead">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Una página de ejemplo para
          probar el ritmo de lectura y la estructura de los próximos artículos de El Silbador.
        </p>

        <div className="article-page__body">
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam condimentum, mauris
            quis eleifend aliquam, justo sapien dignissim eros, a posuere felis mi at purus.
          </p>
          <h2>Un subtítulo de muestra</h2>
          <p>
            Nulla facilisi. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices
            posuere cubilia curae; integer una canción puede empezar en una frase, una melodía o
            apenas dos acordes.
          </p>
          <p>
            Donec vitae lorem ipsum. Sed ut perspiciatis unde omnis iste natus error sit
            voluptatem accusantium doloremque laudantium, totam rem aperiam.
          </p>
        </div>
      </article>
    </main>
  );
}
