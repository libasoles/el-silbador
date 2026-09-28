import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const songPageClient = readFileSync(new URL("./SongPageClient.tsx", import.meta.url), "utf8");

describe("song page authentication handoff", () => {
  it("keeps loading when the anonymous request has no song and auth has not resolved", () => {
    // A private song cannot be returned by the server's anonymous request. During a page reload,
    // its owner is briefly in this state until the browser restores their session.
    expect(songPageClient).toMatch(
      /if \(session === undefined\) \{\s*return initialState \? <StaticSongView state=\{initialState\} \/> : <SongPageLoading \/>;\s*\}/,
    );
  });
});
