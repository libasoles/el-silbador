import type { Metadata } from "next";
import { getSongBySlug, listPublicSongs } from "../../../data/songs";
import type { SongDetail } from "../../../data/types";
import { SongPageClient } from "./SongPageClient";
import { songDescription, songJsonLd } from "./songSeo";

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

function displayTitle(song: SongDetail): string {
  return song.title || "Canción sin título";
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

  const songTitle = displayTitle(song);
  const artist = song.author.trim();
  // Use an absolute title so the root layout's brand template does not displace the artist.
  // The resulting title directly answers searches such as "letra de …" and "acordes de … para
  // guitarra", while still retaining the song's primary identifying information first.
  const title = `${artist ? `${songTitle} - ${artist}` : songTitle} | Letra y Acordes para Guitarra`;
  const description = songDescription({ title: songTitle, author: artist, performers: song.performers });
  const url = `/cancion/${slug}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url },
    twitter: { title, description },
    // A public song by a non-admin is deliberately shareable only by its direct URL. Keep it
    // crawlable so Google can process this directive, but do not let it enter search results.
    robots: song.isListed ? undefined : { index: false, follow: false },
  };
}

export default async function SongPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const song = await fetchPublicSong(slug);

  return (
    <>
      {song && (
        <script
          type="application/ld+json"
          // Escaping `<` keeps a title or name like "</script>" from closing the tag early.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              songJsonLd({ title: displayTitle(song), author: song.author, performers: song.performers }),
            ).replace(/</g, "\\u003c"),
          }}
        />
      )}
      <SongPageClient slug={slug} initialSong={song} />
    </>
  );
}
