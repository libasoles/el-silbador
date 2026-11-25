import type { Metadata } from "next";
import { notebookMetadata } from "../metrica/notebookSeo";
import { NotebookGuide } from "../metrica/NotebookGuide";
import { notebookSans } from "../metrica/fonts";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "../metrica/MetricaEditor";
import "../metrica/metrica.css";
import "./campo.css";

export const metadata: Metadata = notebookMetadata("campo");

export default function CampoSemanticoPage() {
  return <main className={`metrica-page campo-semantico-page ${notebookSans.variable}`}>
    <a className="app-mark" href="/" aria-label="Volver a El Silbador"><SilbadorIcon /></a>
    <MetricaEditor mode="campo" />
    <NotebookGuide mode="campo" />
    <noscript>Activá JavaScript para usar el cuaderno de campo semántico.</noscript>
  </main>;
}
