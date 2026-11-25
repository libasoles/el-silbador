import type { Metadata } from "next";
import { SilbadorIcon } from "../../editor/components/icons";
import { MetricaEditor } from "./MetricaEditor";
import "./metrica.css";

const description = "Escribí versos, contá sus sílabas y encontrá rimas. Explorá formas de estrofa y creá tus propios esquemas en El Silbador.";

export const metadata: Metadata = {
  title: "Métrica",
  description,
  alternates: { canonical: "/metrica" },
  openGraph: {
    title: "Métrica — El Silbador",
    description,
    url: "/metrica",
    siteName: "El Silbador",
    locale: "es_AR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Métrica — El Silbador", description },
};

export default function MetricaPage() {
  return (
    <main className="metrica-page">
      <a className="app-mark" href="/" aria-label="Volver a El Silbador">
        <SilbadorIcon />
      </a>
      <header className="metrica-page__heading">
        <h1>Métrica</h1>
        <p>Un cuaderno para escribir versos, contar sílabas y encontrar rimas.</p>
      </header>
      <MetricaEditor />
      <noscript>Activá JavaScript para usar el cuaderno de métrica.</noscript>
    </main>
  );
}
