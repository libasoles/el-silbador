import Link from "next/link";
import { NOTEBOOK_PAGES, type NotebookMode } from "./notebookSeo";

/** Introduction and crawlable links available before the editor mounts. */
export function NotebookGuide({ mode }: { mode: NotebookMode }) {
  const page = NOTEBOOK_PAGES[mode];
  return (
    <section className="notebook-guide" aria-labelledby="notebook-title">
      <h1 id="notebook-title">{page.title}</h1>
      <p>{page.explanation}</p>
      <nav aria-label="Más herramientas para escribir canciones">
        {Object.entries(NOTEBOOK_PAGES).filter(([key]) => key !== mode).map(([key, entry]) => (
          <Link key={key} href={entry.path}>{entry.title}</Link>
        ))}
        <Link href="/articulos">Guías del editor de canciones</Link>
      </nav>
    </section>
  );
}
