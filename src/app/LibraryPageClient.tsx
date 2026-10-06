"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Library } from "../editor/pages/Library";
import type { LibrarySong } from "../editor/pages/librarySongs";
import { songEditPath, songPath } from "../editor/songPaths";

/** The URL parameter that mirrors the search box, so a filtered index can be shared as a link. */
const QUERY_PARAM = "q";

interface LibraryPageClientProps {
  appVersion: string;
  initialPublicSongs: LibrarySong[];
}

/**
 * The index is prerendered (ISR), and search params only exist in the browser: reading them
 * suspends up to this boundary, so the prerendered HTML is the unfiltered index and the browser
 * renders it with the URL's query (see Next's `useSearchParams` guide on prerendering).
 */
export function LibraryPageClient(props: LibraryPageClientProps) {
  return (
    <Suspense fallback={<LibraryPage {...props} />}>
      <LibraryPageWithUrlQuery {...props} />
    </Suspense>
  );
}

function LibraryPageWithUrlQuery(props: LibraryPageClientProps) {
  const searchParams = useSearchParams();

  return (
    <LibraryPage
      {...props}
      initialQuery={searchParams.get(QUERY_PARAM) ?? ""}
      onQueryChange={replaceUrlQuery}
    />
  );
}

/** Replaces rather than pushes, so typing doesn't add one history entry per keystroke. */
function replaceUrlQuery(query: string) {
  const url = new URL(window.location.href);
  if (query.trim()) url.searchParams.set(QUERY_PARAM, query);
  else url.searchParams.delete(QUERY_PARAM);
  window.history.replaceState(window.history.state, "", url);
}

function LibraryPage({
  appVersion,
  initialPublicSongs,
  initialQuery,
  onQueryChange,
}: LibraryPageClientProps & {
  initialQuery?: string;
  onQueryChange?: (query: string) => void;
}) {
  const router = useRouter();

  return (
    <Library
      appVersion={appVersion}
      initialPublicSongs={initialPublicSongs}
      initialQuery={initialQuery}
      onQueryChange={onQueryChange}
      onOpenSong={(song) => router.push(songPath(song.slug))}
      onEditSong={(song) => router.push(songEditPath(song.slug))}
      onNewSong={() => router.push("/nueva")}
    />
  );
}
