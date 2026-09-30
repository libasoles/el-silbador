import { describe, expect, it } from "vitest";
import { toLibrarySong, toPublicLibrarySong } from "./librarySongs";
import { getHighlightParts } from "./searchHighlights";
import type { SongSummary } from "../../data/types";

function makeSong(overrides: Partial<SongSummary> = {}): SongSummary {
  return {
    id: "song-1",
    slug: "cancion-1",
    title: "Canción",
    author: "Mercedes Sosa",
    ownerId: "owner-1",
    isPublic: false,
    isListed: false,
    youtubeUrl: null,
    forkedFrom: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toLibrarySong", () => {
  it("preserves the song author for the index row", () => {
    expect(toLibrarySong(makeSong())).toMatchObject({
      title: "Canción",
      author: "Mercedes Sosa",
    });
  });

  it("uses the work author for public rows", () => {
    const publicSong: SongSummary = {
      ...makeSong(),
      isPublic: true,
    };

    expect(toPublicLibrarySong(publicSong)).toMatchObject({ author: "Mercedes Sosa" });
  });
});

describe("getHighlightParts", () => {
  it("marks every search word while preserving the original text", () => {
    expect(getHighlightParts("Mercedes Sosa", "mercedes so")).toEqual([
      { text: "Mercedes", matches: true },
      { text: " ", matches: false },
      { text: "So", matches: true },
      { text: "sa", matches: false },
    ]);
  });

  it("treats special characters in a query as text", () => {
    expect(getHighlightParts("Canción (en vivo)", "(en")).toEqual([
      { text: "Canción ", matches: false },
      { text: "(en", matches: true },
      { text: " vivo)", matches: false },
    ]);
  });
});
