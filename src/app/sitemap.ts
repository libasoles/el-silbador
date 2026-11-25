import type { MetadataRoute } from "next";
import { ARTICLES } from "./articulos/articleList";
import { NOTEBOOK_PAGES } from "./metrica/notebookSeo";
import { listPublicSongs } from "../data/songs";

// Without this, Next treats sitemap.xml as static and bakes it once at build time, so a song
// published afterwards — its slug generated dynamically, unknown at build — would never appear
// until the next deploy. Matches the revalidate window used by the song and library pages.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const songs = await listPublicSongs();

  return [
    { url: "https://elsilbador.com.ar/", changeFrequency: "weekly", priority: 1 },
    ...Object.values(NOTEBOOK_PAGES).map((page) => ({
      url: `https://elsilbador.com.ar${page.path}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    { url: "https://elsilbador.com.ar/articulos", changeFrequency: "monthly", priority: 0.7 },
    ...ARTICLES.map((article) => ({
      url: `https://elsilbador.com.ar${article.href}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...songs.map((song) => ({
      url: `https://elsilbador.com.ar/cancion/${song.slug}`,
      lastModified: song.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
