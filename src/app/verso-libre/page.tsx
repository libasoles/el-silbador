import type { Metadata } from "next";
import { notebookSans } from "../metrica/fonts";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "../metrica/MetricaEditor";
import "../metrica/metrica.css";

const description = "Escribí tus versos, contá sus sílabas y descubrí sus rimas y formas poéticas en El Silbador.";
export const metadata: Metadata = {
  title: "Verso libre",
  description,
  alternates: { canonical: "/verso-libre" },
  openGraph: { title: "Verso libre — El Silbador", description, url: "/verso-libre" },
  twitter: { title: "Verso libre — El Silbador", description },
};
export default function VersoLibrePage() {
  return <main className={`metrica-page verso-libre-page ${notebookSans.variable}`}>
    <a className="app-mark" href="/" aria-label="Volver a El Silbador"><SilbadorIcon /></a>
    <MetricaEditor mode="libre" />
    <noscript>Activá JavaScript para usar el cuaderno de verso libre.</noscript>
  </main>;
}
