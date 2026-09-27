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
