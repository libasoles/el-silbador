import type { SongSummary } from "../../data/types";

export interface LibrarySong {
  id: string;
  slug: string;
  title: string;
  author: string | null;
}

export function toLibrarySong(song: SongSummary): LibrarySong {
  return {
    id: song.id,
    slug: song.slug,
    title: song.title ?? "Sin título",
    author: song.author || null,
  };
}

export function toPublicLibrarySong(song: SongSummary): LibrarySong {
  return {
    id: song.id,
    slug: song.slug,
    title: song.title ?? "Sin título",
    author: song.author || null,
  };
}
