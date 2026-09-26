import type { SupabaseClient } from "@supabase/supabase-js";
import type { CellsByTrack, Song } from "../core/types";
import { getSupabaseClient } from "./supabaseClient";
import type {
  PublicSongSummary,
  SaveSongInput,
  SavedSong,
  SongContent,
  SongDetail,
  SongSummary,
} from "./types";

export interface StoredSongContent {
  title: string;
  author: string;
  lyricsText: string;
  song: Song;
  merges: string[];
  cells: CellsByTrack;
}

interface SongRow {
  id: string;
  slug: string;
  title: string | null;
  content: StoredSongContent;
  is_public: boolean;
  forked_from: string | null;
  created_at: string;
  updated_at: string;
}

interface PublicSongRow extends SongRow {
  profiles: { username: string | null } | null;
}

interface FavoriteRow {
  songs: SongRow | null;
}

const SUMMARY_COLUMNS = "id, slug, title, is_public, forked_from, created_at, updated_at";
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, content`;
const PUBLIC_SUMMARY_COLUMNS = `${SUMMARY_COLUMNS}, profiles!owner_id(username)`;

export function serializeContent(content: SongContent): StoredSongContent {
  return {
    title: content.title,
    author: content.author,
    lyricsText: content.lyricsText,
    song: content.song,
    cells: content.cells,
    merges: [...content.merges],
  };
}

export function deserializeContent(stored: StoredSongContent): SongContent {
  return {
    title: stored.title,
    author: stored.author,
    lyricsText: stored.lyricsText,
    song: stored.song,
    cells: stored.cells,
    merges: new Set(stored.merges),
  };
}

function toSummary(row: SongRow): SongSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    isPublic: row.is_public,
    forkedFrom: row.forked_from,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toDetail(row: SongRow): SongDetail {
  return { ...toSummary(row), content: deserializeContent(row.content) };
}

async function requireUserId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const userId = data.user?.id;
  if (!userId) throw new Error("Not authenticated.");
  return userId;
}

export async function listMySongs(): Promise<SongSummary[]> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("songs")
    .select(SUMMARY_COLUMNS)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as SongRow[]).map(toSummary);
}

export async function listPublicSongs(): Promise<PublicSongSummary[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .select(PUBLIC_SUMMARY_COLUMNS)
    .eq("is_public", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as unknown as PublicSongRow[]).map((row) => ({
    ...toSummary(row),
    authorUsername: row.profiles?.username ?? null,
  }));
}

export async function listFavorites(): Promise<SongSummary[]> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("favorites")
    .select(`songs(${SUMMARY_COLUMNS})`)
    .eq("user_id", userId);
  if (error) throw error;

  return ((data ?? []) as unknown as FavoriteRow[])
    .map((row) => row.songs)
    .filter((song): song is SongRow => song !== null)
    .map(toSummary);
}

export async function getSong(songId: string): Promise<SongDetail> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("songs").select(DETAIL_COLUMNS).eq("id", songId).single();
  if (error) throw error;

  return toDetail(data as SongRow);
}

/** Looks a song up by its URL-facing slug (see /cancion/:slug in Root.tsx) rather than its id. */
export async function getSongBySlug(slug: string): Promise<SongDetail> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.from("songs").select(DETAIL_COLUMNS).eq("slug", slug).single();
  if (error) throw error;

  return toDetail(data as SongRow);
}

export async function saveSong(input: SaveSongInput): Promise<SavedSong> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("songs")
    .upsert({
      ...(input.id ? { id: input.id } : {}),
      owner_id: userId,
      title: input.content.title || null,
      content: serializeContent(input.content),
    })
    .select("id, slug, updated_at")
    .single();
  if (error) throw error;

  return { id: data.id as string, slug: data.slug as string, updatedAt: data.updated_at as string };
}

export async function deleteSong(songId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("songs").delete().eq("id", songId);
  if (error) throw error;
}

export async function forkSong(songId: string): Promise<SongDetail> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId(supabase);

  const { data: sourceData, error: sourceError } = await supabase
    .from("songs")
    .select(DETAIL_COLUMNS)
    .eq("id", songId)
    .single();
  if (sourceError) throw sourceError;
  const source = sourceData as SongRow;

  const { data, error } = await supabase
    .from("songs")
    .insert({
      owner_id: userId,
      title: source.title,
      content: source.content,
      forked_from: songId,
      is_public: false,
    })
    .select(DETAIL_COLUMNS)
    .single();
  if (error) throw error;

  return toDetail(data as SongRow);
}

export async function toggleFavorite(songId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const userId = await requireUserId(supabase);

  const { data: existing, error: lookupError } = await supabase
    .from("favorites")
    .select("song_id")
    .eq("user_id", userId)
    .eq("song_id", songId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (existing) {
    const { error } = await supabase.from("favorites").delete().eq("user_id", userId).eq("song_id", songId);
    if (error) throw error;
    return;
  }

  const { error } = await supabase.from("favorites").insert({ user_id: userId, song_id: songId });
  if (error) throw error;
}

export async function setSongPublic(songId: string, isPublic: boolean): Promise<SongSummary> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .update({ is_public: isPublic })
    .eq("id", songId)
    .select(SUMMARY_COLUMNS)
    .single();
  if (error) throw error;

  const summary = toSummary(data as SongRow);
  // The DB trigger silently reverts is_public instead of raising when the caller isn't an admin
  // (see supabase/migrations/0001_init.sql, guard_song_publication) — surface that as a rejection
  // here so callers don't mistake a no-op for success.
  if (summary.isPublic !== isPublic) {
    throw new Error("Not authorized to change this song's visibility.");
  }
  return summary;
}
