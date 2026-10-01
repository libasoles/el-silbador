import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const songPage = readFileSync(new URL("./page.tsx", import.meta.url), "utf8");

describe("song metadata", () => {
  it("uses the song, artist, lyrics, chords, and guitar in the search title", () => {
    expect(songPage).toMatch(
      /const title = `\$\{artist \? `\$\{songTitle\} - \$\{artist\}` : songTitle\} \| Letra y Acordes para Guitarra`/,
    );
    expect(songPage).toContain("title: { absolute: title }");
    expect(songPage).toMatch(/Letra y acordes para guitarra de \$\{songTitle\}, de \$\{artist\}/);
  });

  it("tells search engines not to index public songs that are not listed", () => {
    expect(songPage).toMatch(/robots: song\.isListed \? undefined : \{ index: false, follow: false \}/);
  });
});
