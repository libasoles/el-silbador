import type { Metadata } from "next";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "./MetricaEditor";
import "./metrica.css";

const description = "Un cuaderno para escribir versos en métricas tradicionales, y encontrar rimas.";

export const metadata: Metadata = {
  title: "Métrica de versos y rimas",
  description,
  alternates: { canonical: "/metrica" },
  openGraph: {
    title: "Métrica de versos y rimas — El Silbador",
    description,
    url: "/metrica",
    siteName: "El Silbador",
    locale: "es_AR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Métrica de versos y rimas — El Silbador", description },
};

export default function MetricaPage() {
  return (
    <main className="metrica-page">
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <SilbadorIcon />
      </a>
      <MetricaEditor />
      <noscript>Activá JavaScript para usar el cuaderno de métrica.</noscript>
    </main>
  );
}
