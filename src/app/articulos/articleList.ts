export type ArticleEntry = {
  date: string;
  href: string;
  title: string;
  summary: string;
  topics: readonly string[];
};

/** Published articles, in reading order: the index lists them and each page links to the next. */
export const ARTICLES: readonly ArticleEntry[] = [
  {
    date: "Guía del editor",
    href: "/articulos/usar-acordes-en-el-editor",
    title: "Cómo usar los acordes en el editor",
    summary:
      "Una guía práctica para mostrar, escribir, mover, consultar y corregir acordes sobre una canción.",
    topics: ["editor", "guitarra", "acordes"],
  },
  {
    date: "Guía del editor",
    href: "/articulos/notas-de-la-cancion",
    title: "Cómo escribir las notas de la canción",
    summary:
      "Escribir la melodía debajo de la letra, unir sílabas que se cantan juntas, marcar subidas y bajadas, y cambiar de tono.",
    topics: ["editor", "melodía", "notas", "canto"],
  },
  {
    date: "Guía del editor",
    href: "/articulos/marcas-de-estructura-y-bis",
    title: "Marcas de estructura y BIS",
    summary:
      "Nombrar las partes de la canción con palabras clave como Estrofa o Estribillo, y marcar con BIS una o varias líneas que se repiten.",
    topics: ["editor", "estructura", "bis"],
  },
];

/** The article that follows `slug`; the last one wraps around to the first. */
export function nextArticle(slug: string): ArticleEntry | undefined {
  const index = ARTICLES.findIndex((article) => article.href === `/articulos/${slug}`);
  if (index === -1 || ARTICLES.length < 2) return undefined;
  return ARTICLES[(index + 1) % ARTICLES.length];
}
