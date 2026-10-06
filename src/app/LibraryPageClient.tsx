"use client";

import { useRouter } from "next/navigation";
import { Library } from "../editor/pages/Library";
import type { LibrarySong } from "../editor/pages/librarySongs";
import { songEditPath, songPath } from "../editor/songPaths";

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
      onOpenSong={(song) => router.push(songPath(song.slug))}
      onEditSong={(song) => router.push(songEditPath(song.slug))}
      onNewSong={() => router.push("/nueva")}
    />
  );
}
