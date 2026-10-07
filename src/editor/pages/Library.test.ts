import { describe, expect, it } from "vitest";
import { toLibrarySong, toPublicLibrarySong } from "./librarySongs";
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
    category: null,
    forkedFrom: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    performers: [],
    ...overrides,
  };
}

describe("toLibrarySong", () => {
  it("preserves the song author for the index row", () => {
    expect(toLibrarySong(makeSong())).toMatchObject({
      title: "Canción",
      author: "Mercedes Sosa",
      isPublic: false,
    });
  });

  it("uses the work author for public rows", () => {
    const publicSong: SongSummary = {
      ...makeSong(),
      isPublic: true,
    };

    expect(toPublicLibrarySong(publicSong)).toMatchObject({ author: "Mercedes Sosa" });
  });

  it("carries the performers in load order so the library can search them", () => {
    const zamba = makeSong({ author: "Jorge Milikota", performers: ["Tamara Castro", "Soledad"] });

    expect(toLibrarySong(zamba).performers).toEqual(["Tamara Castro", "Soledad"]);
    expect(toPublicLibrarySong(zamba).performers).toEqual(["Tamara Castro", "Soledad"]);
  });
});
