import type { EditorState } from "../core/types";

/**
 * The subset of `EditorState` that gets persisted as `songs.content` (see the spec's serialization
 * note): `tracks`/`showUnderline` are app-layer display settings, not song data, so they're dropped
 * here rather than in the core reducer.
 */
export type SongContent = Pick<
  EditorState,
  "title" | "author" | "lyricsText" | "song" | "cells" | "chordVariants" | "pitchDirections"
> & {
  merges: Set<string>;
};

export interface SongSummary {
  id: string;
  /** Stable, URL-facing identifier (title-derived + a 5-character hash), used for /cancion/:slug. */
  slug: string;
  title: string | null;
  /** Autor o intérprete indicado en el contenido de la canción. */
  author: string;
  ownerId: string;
  isPublic: boolean;
  /** Whether this public song is discoverable in El Silbador's library and sitemap. Only songs
   *  created by admins are listed; other public songs are available by their direct URL only. */
  isListed: boolean;
  /** Set by an admin only (see supabase/migrations/0007_song_youtube_link.sql); rendered below
   *  the lyrics on the song page. `null` when no link has been attached. */
  youtubeUrl: string | null;
  forkedFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SongDetail extends SongSummary {
  content: SongContent;
}

export interface SaveSongInput {
  /** Omit to create a new song; the returned id/slug then identify it going forward. */
  id?: string;
  content: SongContent;
}

export interface SavedSong {
  id: string;
  slug: string;
  updatedAt: string;
}
