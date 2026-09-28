"use client";

import { useRouter } from "next/navigation";
import { Library } from "../editor/pages/Library";
import type { LibrarySong } from "../editor/pages/librarySongs";

export function LibraryPageClient({
  appVersion,
  initialPublicSongs,
}: {
  appVersion: string;
  initialPublicSongs: LibrarySong[];
}) {
  const router = useRouter();

  return (
    <Library
      appVersion={appVersion}
      initialPublicSongs={initialPublicSongs}
      onOpenSong={(song) => router.push(`/cancion/${song.slug}`)}
      onNewSong={() => router.push("/nueva")}
    />
  );
}
