import type { Metadata } from "next";
import { notebookSans } from "./fonts";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "./MetricaEditor";
import "./metrica.css";

const description = "Un cuaderno para escribir versos en métricas tradicionales, y encontrar rimas.";

const shareImage = {
  url: "/og-metrica.png",
  width: 1200,
  height: 630,
  alt: "Métrica de versos y rimas en El Silbador: una décima con conteo de sílabas y familias de rima.",
};

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
    images: [shareImage],
  },
  twitter: {
    card: "summary_large_image",
    title: "Métrica de versos y rimas — El Silbador",
    description,
    images: [shareImage],
  },
};

export default function MetricaPage() {
  return (
    <main className={`metrica-page ${notebookSans.variable}`}>
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <SilbadorIcon />
      </a>
      <MetricaEditor />
      <noscript>Activá JavaScript para usar el cuaderno de métrica.</noscript>
    </main>
  );
}
