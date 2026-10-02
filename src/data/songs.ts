import { nextId, reserveIds } from "../core/ids";
import type { CellsByTrack, Song } from "../core/types";
import { getSupabaseClient, type SupabaseClient } from "./supabaseClient";
import type {
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
  chordVariants: Record<string, number>;
}

interface SongRow {
  id: string;
  slug: string;
  title: string | null;
  owner_id: string;
  content: StoredSongContent;
  is_public: boolean;
  is_listed: boolean;
  youtube_url: string | null;
  forked_from: string | null;
  created_at: string;
  updated_at: string;
}

interface FavoriteRow {
  songs: SongRow | null;
}

// The author belongs to the song content rather than the owner profile, so summaries include the
// content needed to show the work's own author or performer in the index.
const SUMMARY_COLUMNS =
  "id, slug, title, owner_id, content, is_public, is_listed, youtube_url, forked_from, created_at, updated_at";
const DETAIL_COLUMNS = SUMMARY_COLUMNS;

export function serializeContent(content: SongContent): StoredSongContent {
  return {
    title: content.title,
    author: content.author,
    lyricsText: content.lyricsText,
    song: content.song,
    cells: content.cells,
    chordVariants: content.chordVariants,
    merges: [...content.merges],
  };
}

/** Songs saved before ids were reserved on load can hold two lines with the same id, which React
 * rejects as a duplicate key. Line ids are only used as keys, so the later duplicate gets a fresh one. */
function withUniqueLineIds(song: Song): Song {
  const seen = new Set<string>();
  return song.map((line) => {
    if (!seen.has(line.id)) {
      seen.add(line.id);
      return line;
    }
    const id = nextId("line");
    seen.add(id);
    return { ...line, id };
  });
}

export function deserializeContent(stored: StoredSongContent): SongContent {
  reserveIds(
    stored.song.flatMap((line) => [
      line.id,
      ...line.words.flatMap((word) => [word.id, ...word.syllables.map((syl) => syl.id)]),
    ]),
  );
  return {
    title: stored.title,
    author: stored.author,
    lyricsText: stored.lyricsText,
    song: withUniqueLineIds(stored.song),
    cells: stored.cells,
    // Songs saved before chord variants existed have no such column in their stored jsonb.
    chordVariants: stored.chordVariants ?? {},
    merges: new Set(stored.merges),
  };
}

function toSummary(row: SongRow): SongSummary {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    author: row.content.author ?? "",
    ownerId: row.owner_id,
    isPublic: row.is_public,
    isListed: row.is_listed,
    youtubeUrl: row.youtube_url,
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
  const supabase = await getSupabaseClient();
  const userId = await requireUserId(supabase);

  const { data, error } = await supabase
    .from("songs")
    .select(SUMMARY_COLUMNS)
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as SongRow[]).map(toSummary);
}

export async function listPublicSongs(): Promise<SongSummary[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .select(SUMMARY_COLUMNS)
    .eq("is_public", true)
    .eq("is_listed", true)
    .order("updated_at", { ascending: false });
  if (error) throw error;

  return ((data ?? []) as SongRow[]).map(toSummary);
}

export async function listFavorites(): Promise<SongSummary[]> {
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.from("songs").select(DETAIL_COLUMNS).eq("id", songId).single();
  if (error) throw error;

  return toDetail(data as SongRow);
}

/** Looks a song up by its URL-facing slug (see /cancion/:slug in Root.tsx) rather than its id. */
export async function getSongBySlug(slug: string): Promise<SongDetail> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.from("songs").select(DETAIL_COLUMNS).eq("slug", slug).single();
  if (error) throw error;

  return toDetail(data as SongRow);
}

export async function saveSong(input: SaveSongInput): Promise<SavedSong> {
  const supabase = await getSupabaseClient();
  const userId = await requireUserId(supabase);

  if (input.id) {
    const { data: existing, error: ownerError } = await supabase
      .from("songs")
      .select("owner_id")
      .eq("id", input.id)
      .maybeSingle();
    if (ownerError) throw ownerError;
    if (existing && existing.owner_id !== userId) {
      throw new Error("You don't own this song.");
    }
  }

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
  if (error) {
    if (error.code === "42501") throw new Error("You don't own this song.");
    throw error;
  }

  return { id: data.id as string, slug: data.slug as string, updatedAt: data.updated_at as string };
}

export async function deleteSong(songId: string): Promise<void> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.from("songs").delete().eq("id", songId).select("id");
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error("You don't own this song.");
  }
}

export async function forkSong(songId: string): Promise<SongDetail> {
  const supabase = await getSupabaseClient();
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
  const supabase = await getSupabaseClient();
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
  if (error) {
    if (error.code === "42501") throw new Error("You can only favorite public songs.");
    throw error;
  }
}

export async function setSongPublic(songId: string, isPublic: boolean): Promise<SongSummary> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .update({ is_public: isPublic })
    .eq("id", songId)
    .select(SUMMARY_COLUMNS)
    .single();
  if (error) throw error;

  const summary = toSummary(data as SongRow);
  return summary;
}

export async function setSongYoutubeUrl(songId: string, youtubeUrl: string | null): Promise<SongSummary> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase
    .from("songs")
    .update({ youtube_url: youtubeUrl })
    .eq("id", songId)
    .select(SUMMARY_COLUMNS)
    .single();
  if (error) throw error;

  return toSummary(data as SongRow);
}
