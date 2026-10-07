import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SongDetail } from "../../../data/types";

const getSongBySlug = vi.fn<(slug: string) => Promise<SongDetail>>();
vi.mock("../../../data/songs", () => ({ getSongBySlug, listPublicSongs: vi.fn(async () => []) }));
vi.mock("./SongPageClient", () => ({ SongPageClient: () => null }));

const { default: SongPage, generateMetadata } = await import("./page");

function song(overrides: Partial<SongDetail> = {}): SongDetail {
  return {
    id: "song-1",
    slug: "zamba-de-amor-en-vuelo-ab12c",
    title: "Zamba de amor en vuelo",
    author: "Jorge Milikota",
    ownerId: "owner-1",
    isPublic: true,
    isListed: true,
    youtubeUrl: null,
    category: null,
    forkedFrom: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    content: {} as SongDetail["content"],
    performers: ["Tamara Castro"],
    ...overrides,
  };
}

const params = Promise.resolve({ slug: "zamba-de-amor-en-vuelo-ab12c" });

async function pageMarkup() {
  return renderToStaticMarkup(await SongPage({ params: Promise.resolve({ slug: "zamba-de-amor-en-vuelo-ab12c" }) }));
}

beforeEach(() => {
  getSongBySlug.mockReset();
});

describe("song metadata", () => {
  it("mentions the performers in the description shared with OpenGraph and Twitter", async () => {
    getSongBySlug.mockResolvedValue(song());

    const metadata = await generateMetadata({ params });

    const description =
      "Letra y acordes para guitarra de Zamba de amor en vuelo, de Jorge Milikota. Interpretada por Tamara Castro. Consultá la canción en El Silbador.";
    expect(metadata.description).toBe(description);
    expect(metadata.openGraph?.description).toBe(description);
    expect(metadata.twitter?.description).toBe(description);
  });

  it("keeps the description as before when the song has no performers", async () => {
    getSongBySlug.mockResolvedValue(song({ performers: [] }));

    const metadata = await generateMetadata({ params });

    const description =
      "Letra y acordes para guitarra de Zamba de amor en vuelo, de Jorge Milikota. Consultá la canción en El Silbador.";
    expect(metadata.description).toBe(description);
    expect(metadata.openGraph?.description).toBe(description);
    expect(metadata.twitter?.description).toBe(description);
  });

  it("uses the song, artist, lyrics, chords, and guitar in the search title, regardless of performers", async () => {
    getSongBySlug.mockResolvedValue(song());

    const metadata = await generateMetadata({ params });

    const title = "Zamba de amor en vuelo - Jorge Milikota | Letra y Acordes para Guitarra";
    expect(metadata.title).toEqual({ absolute: title });
    expect(metadata.openGraph?.title).toBe(title);
    expect(metadata.twitter?.title).toBe(title);
  });

  it("tells search engines not to index public songs that are not listed", async () => {
    getSongBySlug.mockResolvedValue(song({ isListed: false }));

    const metadata = await generateMetadata({ params });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("song structured data", () => {
  it("renders the composition, its composer and its performers as JSON-LD", async () => {
    getSongBySlug.mockResolvedValue(song());

    const markup = await pageMarkup();

    expect(markup).toContain(
      '<script type="application/ld+json">{"@context":"https://schema.org","@type":"MusicComposition","name":"Zamba de amor en vuelo","composer":{"@type":"Person","name":"Jorge Milikota"},"recordedAs":[{"@type":"MusicRecording","name":"Zamba de amor en vuelo","byArtist":{"@type":"MusicGroup","name":"Tamara Castro"}}]}</script>',
    );
  });

  it("escapes markup in song data so it cannot close the script", async () => {
    getSongBySlug.mockResolvedValue(song({ title: "</script><b>x", performers: [] }));

    const markup = await pageMarkup();

    expect(markup).toContain('"name":"\\u003c/script>\\u003cb>x"');
    expect(markup).not.toContain("</script><b>");
  });

  it("renders no JSON-LD when the song is not public", async () => {
    getSongBySlug.mockRejectedValue(new Error("not found"));

    const markup = await pageMarkup();

    expect(markup).not.toContain("application/ld+json");
  });
});
