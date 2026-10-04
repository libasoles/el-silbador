"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import App from "../../../editor/App";
import type { SongDetail } from "../../../data/types";

interface SongPageClientProps {
  slug: string;
  /** The song's full detail as fetched anonymously on the server — present only when the song is
   *  public. `null` covers both "doesn't exist" and "private, not yours", which are
   *  indistinguishable without a session. */
  initialSong: SongDetail | null;
}

/**
 * A public song's `initialSong` seeds `App` directly, so it mounts exactly once — the server's
 * HTML (for SEO and anonymous visitors) and the client's post-hydration render are the same tree.
 * `App` itself treats `initialSong` as read-only content until `session` resolves and (for the
 * owner) turns on editing — see its own doc comment. Mounting a lighter read-only view first and
 * swapping to `App` once auth resolved used to be how this worked, but for a long song that meant
 * fully unmounting and rebuilding a large `SongView`/`LineView` tree (every line's syllable refs,
 * measurement effects, and its own `resize` listener) right after first paint — on mobile,
 * memory-constrained browsers could crash the tab mid-swap. A single mount avoids that.
 *
 * A private song is invisible to the anonymous server request, so there's nothing to seed with:
 * `App` still mounts right away with the page layout and its content skeleton, but holds its own
 * fetch until auth resolves, so the owner doesn't briefly see a false not-found while the browser
 * restores their session on a hard reload. It then renders the full editor (owner), a read-only
 * view (signed-in non-owner), or the same read-only view for an anonymous visitor.
 */
export function SongPageClient({ slug, initialSong }: SongPageClientProps) {
  const router = useRouter();
  // Tracks whatever slug is currently in the address bar, independent of the `slug` prop (which
  // never changes — see below). Starts at the slug this page was loaded with.
  const currentSlugRef = useRef(slug);

  return (
    <App
      songSlug={slug}
      initialSong={initialSong}
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
