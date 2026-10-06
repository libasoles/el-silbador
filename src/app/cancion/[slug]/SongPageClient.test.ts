import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const songPageClient = readFileSync(new URL("./SongPageClient.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../../../editor/App.tsx", import.meta.url), "utf8");

describe("song page authentication handoff", () => {
  it("leaves the private-song auth wait to App's skeleton instead of a page-level loader", () => {
    // A private song cannot be returned by the server's anonymous request. During a page reload,
    // its owner briefly waits for the browser to restore their session; App covers that with the
    // same skeleton (inside the page layout) as any other load, so there's only one loading state.
    expect(songPageClient).not.toMatch(/SongPageLoading|session === undefined/);
    expect(app).toMatch(/const waitForAuth = !initialSong && session === undefined;/);
    expect(app).toMatch(/if \(waitForAuth\) return;/);
  });

  it("mounts App exactly once, seeded with initialSong, instead of swapping trees on auth", () => {
    // Regression guard for the mobile crash this replaced: rendering a separate read-only tree
    // first and swapping to `App` once auth resolved meant fully unmounting and rebuilding a
    // potentially large SongView/LineView tree right after first paint.
    expect(songPageClient).not.toMatch(/StaticSongView/);
    expect(songPageClient).toMatch(/<App\s+songSlug=\{slug\}\s+initialSong=\{initialSong\}/);
  });
});

describe("read-only song page vs. its editor", () => {
  const songPage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");
  const editPage = readFileSync(new URL("./editar/page.tsx", import.meta.url), "utf8");

  it("keeps the song's plain URL read-only, even for its owner", () => {
    expect(songPageClient).toMatch(/editing = false/);
    expect(songPageClient).toMatch(/readOnly=\{!editing\}/);
    expect(songPage).toMatch(/<SongPageClient slug=\{slug\} initialSong=\{song\} \/>/);
  });

  it("opens the editor only at /editar, with a fresh fetch and out of search results", () => {
    expect(editPage).toMatch(/<SongPageClient slug=\{slug\} initialSong=\{null\} editing \/>/);
    expect(editPage).toMatch(/robots: \{ index: false, follow: false \}/);
  });
});
