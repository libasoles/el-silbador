"use client";

import { useRouter } from "next/navigation";
import App from "../../../editor/App";
import { useAuthRequired } from "../../../editor/authRequiredContext";
import type { EditorState } from "../../../core/types";
import { SongNotFoundStatic } from "./SongNotFoundStatic";
import { StaticSongView } from "./StaticSongView";

interface SongPageClientProps {
  slug: string;
  /** The song's content as fetched anonymously on the server — present only when the song is
   *  public. `null` covers both "doesn't exist" and "private, not yours", which are
   *  indistinguishable without a session. */
  initialState: EditorState | null;
}

/**
 * Anonymous visitors (crawlers included) get exactly what the server already rendered: no
 * client-side fetch, no loading flash. Once a session resolves, this hands off to `App`, which
 * does its own authenticated fetch and — unchanged from before this migration — renders either
 * the full editor (owner) or a read-only view (signed-in non-owner) on its own.
 */
export function SongPageClient({ slug, initialState }: SongPageClientProps) {
  const router = useRouter();
  const { session } = useAuthRequired();

  if (!session) {
    return initialState ? <StaticSongView state={initialState} /> : <SongNotFoundStatic />;
  }

  return (
    <App
      songSlug={slug}
      onSongCreated={(_id, newSlug) => router.replace(`/cancion/${newSlug}`)}
      onDeleted={() => router.replace("/")}
    />
  );
}
