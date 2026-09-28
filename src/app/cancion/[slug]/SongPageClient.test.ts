import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const songPageClient = readFileSync(new URL("./SongPageClient.tsx", import.meta.url), "utf8");

describe("song page authentication handoff", () => {
  it("keeps loading when the anonymous request has no song and auth has not resolved", () => {
    // A private song cannot be returned by the server's anonymous request. During a page reload,
    // its owner is briefly in this state until the browser restores their session.
    expect(songPageClient).toMatch(
      /if \(!initialSong && session === undefined\) \{\s*return <SongPageLoading \/>;\s*\}/,
    );
  });

  it("mounts App exactly once, seeded with initialSong, instead of swapping trees on auth", () => {
    // Regression guard for the mobile crash this replaced: rendering a separate read-only tree
    // first and swapping to `App` once auth resolved meant fully unmounting and rebuilding a
    // potentially large SongView/LineView tree right after first paint.
    expect(songPageClient).not.toMatch(/StaticSongView/);
    expect(songPageClient).toMatch(/<App\s+songSlug=\{slug\}\s+initialSong=\{initialSong\}/);
  });
});
