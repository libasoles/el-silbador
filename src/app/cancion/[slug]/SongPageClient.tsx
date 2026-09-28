"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import App from "../../../editor/App";
import { useAuthRequired } from "../../../editor/authRequiredContext";
import type { EditorState } from "../../../core/types";
import { SongPageLoading } from "./SongPageLoading";
import { StaticSongView } from "./StaticSongView";

interface SongPageClientProps {
  slug: string;
  /** The song's content as fetched anonymously on the server — present only when the song is
   *  public. `null` covers both "doesn't exist" and "private, not yours", which are
   *  indistinguishable without a session. */
  initialState: EditorState | null;
}

/**
 * Before the initial auth check resolves (`session === undefined`), show a loading state. A
 * private song cannot be returned by the server's anonymous request, so its owner would otherwise
 * briefly see an incorrect not-found message after a hard reload. Once auth resolves — whether to
 * a session or to confirmed signed-out — this hands off to `App`, which does its own fetch and —
 * unchanged from before this migration — renders the full editor (owner), a read-only view
 * (signed-in non-owner), or the same read-only view for an anonymous visitor, header/toolbar
 * included, on its own. Gating on `session` truthiness instead would leave anonymous visitors
 * stuck on the header-less static view forever, since their session never resolves to anything
 * truthy.
 */
export function SongPageClient({ slug, initialState }: SongPageClientProps) {
  const router = useRouter();
  const { session } = useAuthRequired();
  // Tracks whatever slug is currently in the address bar, independent of the `slug` prop (which
  // never changes — see below). Starts at the slug this page was loaded with.
  const currentSlugRef = useRef(slug);

  if (session === undefined) {
    return initialState ? <StaticSongView state={initialState} /> : <SongPageLoading />;
  }

  return (
    <App
      songSlug={slug}
      onSongCreated={(_id, newSlug) => {
        // `onSongCreated` fires after every autosave, not just when the slug actually changed
        // (see useAutosave.ts) — skip entirely when it didn't.
        if (newSlug === currentSlugRef.current) return;
        currentSlugRef.current = newSlug;
        // A title edit on the song already open here regenerates its slug (see
        // supabase/migrations/0006_regenerate_slug_on_title_change.sql), but the content shown is
        // already correct and doesn't need refetching — only the address bar is stale. Using the
        // History API directly (instead of `router.replace`) keeps this a same-page URL swap:
        // `router.replace` would ask Next to navigate to what looks like a different dynamic route
        // segment, refetching the page's server data and rerunning App's song-loading effect for a
        // song that's already loaded, which is the visible "reload" flash this avoids.
        window.history.replaceState(window.history.state, "", `/cancion/${newSlug}`);
      }}
      onDeleted={() => router.replace("/")}
    />
  );
}
