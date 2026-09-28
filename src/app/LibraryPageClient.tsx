"use client";

import { useRouter } from "next/navigation";
import { Library } from "../editor/pages/Library";
import type { LibrarySong } from "../editor/pages/librarySongs";

export function LibraryPageClient({ initialPublicSongs }: { initialPublicSongs: LibrarySong[] }) {
  const router = useRouter();

  return (
    <Library
      initialPublicSongs={initialPublicSongs}
      onOpenSong={(song) => router.push(`/cancion/${song.slug}`)}
      onNewSong={() => router.push("/nueva")}
    />
  );
}
