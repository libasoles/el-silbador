import { beforeEach, describe, expect, it, vi } from "vitest";
import { listFavorites, listMySongs, listPublicSongs } from "./songs";
import { getSupabaseClient, type SupabaseClient } from "./supabaseClient";

vi.mock("./supabaseClient", () => ({ getSupabaseClient: vi.fn() }));

const ZAMBA_ROW = {
  id: "song-1",
  slug: "zamba-de-amor-en-vuelo-ab12c",
  title: "Zamba de amor en vuelo",
  owner_id: "admin-1",
  content: { title: "Zamba de amor en vuelo", author: "Jorge Milikota" },
  is_public: true,
  is_listed: true,
  youtube_url: null,
  forked_from: null,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-02T00:00:00.000Z",
  // PostgREST returns embedded rows in no particular order.
  song_performers: [
    { position: 1, artists: { name: "Soledad" } },
    { position: 0, artists: { name: "Tamara Castro" } },
  ],
};

const UNPERFORMED_ROW = {
  ...ZAMBA_ROW,
  id: "song-2",
  slug: "luna-cautiva-cd34e",
  title: "Luna cautiva",
  content: { title: "Luna cautiva", author: "Chango Rodríguez" },
  song_performers: [],
};

/** A client whose every table query resolves to `data`, counting how many queries were made. */
function stubClient(data: unknown[]) {
  const query = {
    select: () => query,
    eq: () => query,
    order: () => query,
    then: (resolve: (result: { data: unknown[]; error: null }) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve),
  };
  const client = {
    auth: { getUser: async () => ({ data: { user: { id: "user-1" } }, error: null }) },
    from: vi.fn(() => query),
    rpc: vi.fn(),
  };
  vi.mocked(getSupabaseClient).mockResolvedValue(client as unknown as SupabaseClient);
  return client;
}

describe("library lists", () => {
  beforeEach(() => {
    vi.mocked(getSupabaseClient).mockReset();
  });

  it("brings each public song's performers in load order, in a single query", async () => {
    const client = stubClient([ZAMBA_ROW, UNPERFORMED_ROW]);

    const songs = await listPublicSongs();

    expect(songs.map((song) => [song.title, song.author, song.performers])).toEqual([
      ["Zamba de amor en vuelo", "Jorge Milikota", ["Tamara Castro", "Soledad"]],
      ["Luna cautiva", "Chango Rodríguez", []],
    ]);
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("brings the performers of the user's own songs", async () => {
    const client = stubClient([ZAMBA_ROW]);

    const songs = await listMySongs();

    expect(songs.map((song) => song.performers)).toEqual([["Tamara Castro", "Soledad"]]);
    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it("brings the performers of favorite songs", async () => {
    const client = stubClient([{ songs: ZAMBA_ROW }, { songs: UNPERFORMED_ROW }]);

    const songs = await listFavorites();

    expect(songs.map((song) => song.performers)).toEqual([["Tamara Castro", "Soledad"], []]);
    expect(client.from).toHaveBeenCalledTimes(1);
  });
});
