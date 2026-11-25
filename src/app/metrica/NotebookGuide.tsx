import Link from "next/link";
import { ArrowRight, PersonStanding } from "lucide-react";
import { NOTEBOOK_PAGES, type NotebookMode } from "./notebookSeo";

/** Introduction and crawlable links available before the editor mounts. */
export function NotebookGuide({ mode }: { mode: NotebookMode }) {
  return (
    <section className="notebook-guide" aria-labelledby="notebook-title">
      <PersonStanding className="notebook-guide__icon" aria-hidden="true" size={32} strokeWidth={1.5} />
      <h1 id="notebook-title">Herramientas de métrica y rima</h1>
      <p>Analizá poemas, canciones o escribí tus propios versos.</p>
      <nav aria-label="Más herramientas para escribir canciones">
        {Object.entries(NOTEBOOK_PAGES).filter(([key]) => key !== mode).map(([key, entry]) => (
          <Link key={key} href={entry.path}>
            <ArrowRight aria-hidden="true" size={16} strokeWidth={1.75} />
            {entry.title}
          </Link>
        ))}
      </nav>
    </section>
  );
}
