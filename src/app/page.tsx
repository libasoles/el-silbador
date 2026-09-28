import { listPublicSongs } from "../data/songs";
import { toPublicLibrarySong } from "../editor/pages/librarySongs";
import { LibraryPageClient } from "./LibraryPageClient";

// Public songs rarely change; re-fetching on every request would be wasteful. ISR keeps the
// listing fresh within a few minutes of a song being published without a full rebuild.
export const revalidate = 300;

export default async function HomePage() {
  const initialPublicSongs = (await listPublicSongs()).map(toPublicLibrarySong);
  return <LibraryPageClient initialPublicSongs={initialPublicSongs} />;
}
