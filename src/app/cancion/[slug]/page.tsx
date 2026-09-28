import type { Metadata } from "next";
import { getSongBySlug, listPublicSongs } from "../../../data/songs";
import type { SongDetail } from "../../../data/types";
import { SongPageClient } from "./SongPageClient";

// Public songs are read here with the anon key, so RLS (see
// supabase/migrations/0004_anon_public_songs.sql) already limits this to songs that are public —
// a private song, or a slug that doesn't exist at all, both fail `.single()` the same way.
async function fetchPublicSong(slug: string): Promise<SongDetail | null> {
  try {
    return await getSongBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateStaticParams() {
  const songs = await listPublicSongs();
  return songs.map((song) => ({ slug: song.slug }));
}

// A song's on-page content changes only through edits, which don't happen anonymously — a few
// minutes of staleness is an acceptable trade for not hitting Supabase on every crawl.
export const revalidate = 300;
// New songs (not yet known at build time) are still rendered and cached on their first visit.
export const dynamicParams = true;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const song = await fetchPublicSong(slug);
  if (!song) return { title: "Canción" };

  const title = song.title || "Canción sin título";
  const description = song.author
    ? `${title}, por ${song.author} — El Silbador`
    : `${title} — El Silbador`;
  const url = `/cancion/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
  };
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await fetchPublicSong(slug);

  return <SongPageClient slug={slug} initialSong={song} />;
}
