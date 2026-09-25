import type { EditorState } from "../core/types";

/**
 * The subset of `EditorState` that gets persisted as `songs.content` (see the spec's serialization
 * note): `tracks`/`showUnderline` are app-layer display settings, not song data, so they're dropped
 * here rather than in the core reducer.
 */
export type SongContent = Pick<EditorState, "title" | "author" | "lyricsText" | "song" | "cells"> & {
  merges: Set<string>;
};

export interface SongSummary {
  id: string;
  title: string | null;
  isPublic: boolean;
  forkedFrom: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicSongSummary extends SongSummary {
  authorUsername: string | null;
}

export interface SongDetail extends SongSummary {
  content: SongContent;
}

export interface SaveSongInput {
  /** Omit to create a new song; the returned id then identifies it going forward. */
  id?: string;
  content: SongContent;
}

export interface SavedSong {
  id: string;
  updatedAt: string;
}
