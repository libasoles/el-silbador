import type { SongSummary } from "../../data/types";

export interface LibrarySong {
  id: string;
  slug: string;
  title: string;
  author: string | null;
  /** Who performs the song ("intérpretes"), in load order; searchable from the library. */
  performers: string[];
  isPublic: boolean;
}

export function toLibrarySong(song: SongSummary): LibrarySong {
  return {
    id: song.id,
    slug: song.slug,
    title: song.title ?? "Sin título",
    author: song.author || null,
    performers: song.performers,
    isPublic: song.isPublic,
  };
}

export function toPublicLibrarySong(song: SongSummary): LibrarySong {
  return {
    id: song.id,
    slug: song.slug,
    title: song.title ?? "Sin título",
    author: song.author || null,
    performers: song.performers,
    isPublic: song.isPublic,
  };
}
