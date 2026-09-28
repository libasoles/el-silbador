"use client";

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

  if (session === undefined) {
    return initialState ? <StaticSongView state={initialState} /> : <SongPageLoading />;
  }

  return (
    <App
      songSlug={slug}
      onSongCreated={(_id, newSlug) => {
        // `onSongCreated` fires after every autosave, not just when the slug actually changed
        // (see useAutosave.ts) — skip the navigation entirely when it didn't, and suppress the
        // scroll-to-top when it did, so a save in the background doesn't yank the editor's
        // scroll position back up mid-edit.
        if (newSlug === slug) return;
        router.replace(`/cancion/${newSlug}`, { scroll: false });
      }}
      onDeleted={() => router.replace("/")}
    />
  );
}
