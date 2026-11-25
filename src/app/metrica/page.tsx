import type { Metadata } from "next";
import { notebookMetadata } from "./notebookSeo";
import { NotebookGuide } from "./NotebookGuide";
import { notebookSans } from "./fonts";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "./MetricaEditor";
import "./metrica.css";

export const metadata: Metadata = notebookMetadata("metrica");

export default function MetricaPage() {
  return (
    <main className={`metrica-page ${notebookSans.variable}`}>
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <SilbadorIcon />
      </a>
      <MetricaEditor />
      <NotebookGuide mode="metrica" />
      <noscript>Activá JavaScript para usar el cuaderno de métrica.</noscript>
    </main>
  );
}
