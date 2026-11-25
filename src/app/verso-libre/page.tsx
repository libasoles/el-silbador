import type { Metadata } from "next";
import { notebookMetadata } from "../metrica/notebookSeo";
import { NotebookGuide } from "../metrica/NotebookGuide";
import { notebookSans } from "../metrica/fonts";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "../metrica/MetricaEditor";
import "../metrica/metrica.css";

export const metadata: Metadata = notebookMetadata("libre");

export default function VersoLibrePage() {
  return <main className={`metrica-page verso-libre-page ${notebookSans.variable}`}>
    <a className="app-mark" href="/" aria-label="Volver a El Silbador"><SilbadorIcon /></a>
    <MetricaEditor mode="libre" />
    <NotebookGuide mode="libre" />
    <noscript>Activá JavaScript para usar el cuaderno de verso libre.</noscript>
  </main>;
}
