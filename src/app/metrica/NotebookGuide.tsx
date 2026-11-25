import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { NOTEBOOK_PAGES, type NotebookMode } from "./notebookSeo";

function HappyFace({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="9.5 7.5 45.5 39" fill="none" stroke="currentColor" strokeWidth="2.15" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M13.5 27C12.6 22.2 13.8 17.3 17.1 13.8C20.2 10.5 24.9 8.8 30.1 9.1C35.2 9.4 39.1 12.2 44.4 13.6C47.5 14.4 50.6 14.6 53.3 13.9C52.3 16.2 50.2 18.1 47.4 19.3C42.3 21.5 35.1 20.5 29.1 17.6C27.1 21.9 22.8 25.7 17.5 27.4" />
      <path d="M16.5 26.7C13.2 25.8 10.7 27.6 10.8 31C10.9 34.5 13.7 36.5 17.2 35.6" />
      <path d="M17.4 27.2C17.6 33.5 19.8 38.6 23.8 41.6C27.2 44.1 31.7 45.1 35.9 44.1C43.3 42.4 47.8 36.3 48.1 27.8L48.1 20" />
      <path d="M23.4 30.4C24.3 28.7 26.7 28.7 27.7 30.4" />
      <path d="M36.5 30.4C37.5 28.7 39.9 28.7 40.8 30.4" />
      <path d="M29.3 37.1C30.8 39.1 33.6 39.1 35.1 37.1" />
    </svg>
  );
}

/** Introduction and crawlable links available before the editor mounts. */
export function NotebookGuide({ mode }: { mode: NotebookMode }) {
  return (
    <section className="notebook-guide" aria-labelledby="notebook-title">
      <HappyFace className="notebook-guide__icon" />
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
