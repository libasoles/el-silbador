import type { MetadataRoute } from "next";
import { listPublicSongs } from "../data/songs";

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
