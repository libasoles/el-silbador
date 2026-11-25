import type { Metadata } from "next";
import { notebookSans } from "../metrica/fonts";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "../metrica/MetricaEditor";
import "../metrica/metrica.css";
import "./campo.css";

const description = "Explorá rimas, sinónimos y antónimos, reuní las palabras de tu canción y escribí versos con métrica en El Silbador.";
export const metadata: Metadata = {
  title: "Campo semántico",
  description,
  alternates: { canonical: "/campo-semantico" },
  openGraph: { title: "Campo semántico — El Silbador", description, url: "/campo-semantico" },
  twitter: { title: "Campo semántico — El Silbador", description },
};
export default function CampoSemanticoPage() {
  return <main className={`metrica-page campo-semantico-page ${notebookSans.variable}`}>
    <a className="app-mark" href="/" aria-label="Volver a El Silbador"><SilbadorIcon /></a>
    <MetricaEditor mode="campo" />
    <noscript>Activá JavaScript para usar el cuaderno de campo semántico.</noscript>
  </main>;
}
