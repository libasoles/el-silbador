import type { MetadataRoute } from "next";
import { listPublicSongs } from "../data/songs";

// Without this, Next treats sitemap.xml as static and bakes it once at build time, so a song
// published afterwards — its slug generated dynamically, unknown at build — would never appear
// until the next deploy. Matches the revalidate window used by the song and library pages.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const songs = await listPublicSongs();

  return [
    { url: "https://elsilbador.com.ar/", changeFrequency: "weekly", priority: 1 },
    ...songs.map((song) => ({
      url: `https://elsilbador.com.ar/cancion/${song.slug}`,
      lastModified: song.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
