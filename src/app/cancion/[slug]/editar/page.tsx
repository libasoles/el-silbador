import type { Metadata } from "next";
import { SongPageClient } from "../SongPageClient";

export const metadata: Metadata = {
  title: "Editar canción",
  // The editor is for the song's owner; readers and crawlers belong on the song's plain URL.
  robots: { index: false, follow: false },
};

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // Not seeded with the server's cached copy: the song page is ISR-cached for minutes, and editing
  // a stale copy would autosave over newer content. App fetches the current song once auth
  // resolves, as it does for a private song.
  return <SongPageClient slug={slug} initialSong={null} editing />;
}
