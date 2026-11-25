import type { Metadata } from "next";

export const NOTEBOOK_PAGES = {
  libre: {
    path: "/verso-libre",
    title: "Verso libre: contador de sílabas y rimas",
    description: "Escribí o pegá tus versos para contar sílabas métricas, analizar rimas y reconocer formas poéticas con el cuaderno de verso libre de El Silbador.",
    explanation: "Analizá un poema o la letra de una canción, un verso por renglón. El cuaderno muestra las sílabas métricas, las rimas asonantes y consonantes y las formas poéticas que coinciden con tu texto.",
  },
  campo: {
    path: "/campo-semantico",
    title: "Campo semántico para escribir canciones",
    description: "Creá el campo semántico de tu canción: reuní palabras de un tema, explorá rimas, sinónimos y antónimos, y escribí versos con métrica en El Silbador.",
    explanation: "Partí del tema y el argumento de tu canción. Reuní palabras relacionadas, elegí las que mejor expresan tu idea y explorá sus rimas, sinónimos y antónimos. Usá ese campo semántico para escribir con libertad o armar estrofas con un esquema de métrica y rima.",
  },
  metrica: {
    path: "/metrica",
    title: "Métrica de versos y rimas",
    description: "Escribí versos con métrica y rima: elegí formas poéticas tradicionales y revisá las sílabas de cada verso con el cuaderno de composición de El Silbador.",
    explanation: "Elegí una forma poética tradicional y escribí siguiendo su esquema de sílabas y rimas. El cuaderno te ayuda a revisar la métrica de cada verso y a encontrar palabras que rimen para completar tus estrofas.",
  },
} as const;
export type NotebookMode = keyof typeof NOTEBOOK_PAGES;

export function notebookMetadata(mode: NotebookMode): Metadata {
  const page = NOTEBOOK_PAGES[mode];
  const title = `${page.title} — El Silbador`;
  const image = {
    url: mode === "metrica" ? "/og-metrica.png" : "/banner.png",
    width: mode === "metrica" ? 1200 : 1734,
    height: mode === "metrica" ? 630 : 907,
    alt: mode === "metrica"
      ? "Métrica de versos y rimas en El Silbador: una décima con conteo de sílabas y familias de rima."
      : "El Silbador, cancionero y cuadernos para escribir canciones",
  };
  // Next replaces nested objects; each route needs complete social metadata.
  return {
    title: page.title, description: page.description,
    alternates: { canonical: page.path },
    openGraph: {
      type: "website", siteName: "El Silbador", locale: "es_AR",
      url: page.path, title, description: page.description, images: [image],
    },
    twitter: {
      card: "summary_large_image", title,
      description: page.description, images: [image],
    },
  };
}
