import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setUsername } from "../profiles";
import {
  deleteSong,
  forkSong,
  getSong,
  getSongBySlug,
  listFavorites,
  listMySongs,
  listPublicSongs,
  saveSong,
  serializeContent,
  setSongPerformers,
  setSongPublic,
  setSongYoutubeUrl,
  toggleFavorite,
} from "../songs";
import { getSupabaseClient } from "../supabaseClient";
import type { SongContent } from "../types";

// Integration tests run against the local Supabase stack (see README.md in this directory).
// They remain skipped during `npm test`: `npm run test:integration` supplies local-only keys.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const hasEnv = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SERVICE_ROLE_KEY);

interface TestUser {
  id: string;
  email: string;
  password: string;
}

function makeContent(overrides: Partial<SongContent> = {}): SongContent {
  return {
    title: "",
    author: "",
    lyricsText: "",
    song: [],
    cells: {},
    chordVariants: {},
    pitchDirections: {},
    merges: new Set(),
    ...overrides,
  };
}

describe.skipIf(!hasEnv)("data-access module (integration)", () => {
  let adminClient: SupabaseClient;
  let userA: TestUser;
  let userB: TestUser;
  let adminUser: TestUser;
  const createdSongIds: string[] = [];

  async function createTestUser(label: string): Promise<TestUser> {
    const email = `songs-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
    const password = "Test-password-123!";
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    return { id: data.user!.id, email, password };
  }

  async function signInAs(user: TestUser): Promise<void> {
    const { error } = await (await getSupabaseClient()).auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (error) throw error;
  }

  beforeAll(async () => {
    adminClient = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
    userA = await createTestUser("user-a");
    userB = await createTestUser("user-b");
    adminUser = await createTestUser("admin");
    const { error } = await adminClient.from("profiles").update({ role: "admin" }).eq("id", adminUser.id);
    if (error) throw error;
  });

  afterAll(async () => {
    if (createdSongIds.length > 0) {
      await adminClient.from("songs").delete().in("id", createdSongIds);
    }
    // beforeAll may have thrown partway through, leaving some of these unset — don't let cleanup
    // mask that original failure with an unrelated "reading 'id' of undefined".
    for (const user of [userA, userB, adminUser]) {
      if (user) await adminClient.auth.admin.deleteUser(user.id);
    }
  });

  it("saves a song and rereads it, roundtripping merges through jsonb", async () => {
    await signInAs(userA);
    const content = makeContent({
      title: "Cancion de prueba",
      lyricsText: "amor y paz",
      merges: new Set(["a|b", "c|d"]),
    });

    const saved = await saveSong({ content });
    createdSongIds.push(saved.id);

    const reloaded = await getSong(saved.id);
    expect(reloaded.title).toBe("Cancion de prueba");
    expect(reloaded.isPublic).toBe(false);
    expect(reloaded.content.lyricsText).toBe("amor y paz");
    expect(reloaded.content.merges).toEqual(new Set(["a|b", "c|d"]));
  });

  it("lists a brand-new song that has no title or content yet", async () => {
    await signInAs(userA);
    const saved = await saveSong({ content: makeContent() });
    createdSongIds.push(saved.id);

    const mine = await listMySongs();
    expect(mine.some((song) => song.id === saved.id)).toBe(true);
  });

  it("rejects a direct insert without a caller-provided id", async () => {
    await signInAs(userA);
    const { error } = await (await getSupabaseClient())
      .from("songs")
      .insert({ owner_id: userA.id });

    expect(error?.code).toBe("23502");
  });

  it("upserts repeated creates with a caller-provided id into one song", async () => {
    await signInAs(userA);
    const id = randomUUID();
    const first = await saveSong({ id, content: makeContent({ title: "Primer intento" }) });
    const second = await saveSong({ id, content: makeContent({ title: "Segundo intento" }) });
    createdSongIds.push(id);

    expect(first.id).toBe(id);
    expect(second.id).toBe(id);
    expect((await listMySongs()).filter((song) => song.id === id)).toHaveLength(1);
    expect((await getSong(id)).title).toBe("Segundo intento");
  });

  it("keeps a non-admin's public song out of the library while allowing its direct URL", async () => {
    await signInAs(userA);
    const own = await saveSong({ content: makeContent({ title: "A privada" }) });
    createdSongIds.push(own.id);

    await signInAs(userB);
    const otherPublic = await saveSong({ content: makeContent({ title: "B pública no listada" }) });
    createdSongIds.push(otherPublic.id);
    await setSongPublic(otherPublic.id, true);

    await signInAs(userA);
    const mine = await listMySongs();
    expect(mine.some((song) => song.id === own.id)).toBe(true);
    expect(mine.some((song) => song.id === otherPublic.id)).toBe(false);

    const publicSongs = await listPublicSongs();
    expect(publicSongs.some((song) => song.id === otherPublic.id)).toBe(false);
    expect((await getSong(otherPublic.id)).isPublic).toBe(true);
  });

  it("lists a public song created by an admin", async () => {
    await signInAs(adminUser);
    const adminSong = await saveSong({ content: makeContent({ title: "Administrada" }) });
    createdSongIds.push(adminSong.id);
    await setSongPublic(adminSong.id, true);

    expect((await getSong(adminSong.id)).isListed).toBe(true);

    await signInAs(userA);
    expect((await listPublicSongs()).some((song) => song.id === adminSong.id)).toBe(true);
  });

  it("prevents a non-owner from updating or deleting another user's song", async () => {
    await signInAs(userA);
    const saved = await saveSong({ content: makeContent({ title: "Solo de A" }) });
    createdSongIds.push(saved.id);

    await signInAs(userB);
    await expect(saveSong({ id: saved.id, content: makeContent({ title: "Hackeado" }) })).rejects.toThrow();
    await expect(deleteSong(saved.id)).rejects.toThrow();

    const { data: stillThere, error } = await adminClient
      .from("songs")
      .select("id, title")
      .eq("id", saved.id)
      .single();
    expect(error).toBeNull();
    expect(stillThere?.title).toBe("Solo de A");
  });

  it("keeps new songs private, lets their owner add YouTube, and allows unlisted sharing", async () => {
    await signInAs(userA);
    const saved = await saveSong({ content: makeContent({ title: "Para publicar" }) });
    createdSongIds.push(saved.id);

    expect((await getSong(saved.id)).isPublic).toBe(false);

    const withYoutube = await setSongYoutubeUrl(saved.id, "https://youtu.be/dQw4w9WgXcQ");
    expect(withYoutube.youtubeUrl).toBe("https://youtu.be/dQw4w9WgXcQ");

    const published = await setSongPublic(saved.id, true);
    expect(published.isPublic).toBe(true);
    expect(published.isListed).toBe(false);
  });

  it("only allows favoriting a public song", async () => {
    await signInAs(userA);
    const privateSong = await saveSong({ content: makeContent({ title: "Privada" }) });
    createdSongIds.push(privateSong.id);
    await setSongPublic(privateSong.id, false);

    await signInAs(userB);
    await expect(toggleFavorite(privateSong.id)).rejects.toThrow();
  });

  it("only allows forking a public song", async () => {
    await signInAs(userA);
    const privateSong = await saveSong({ content: makeContent({ title: "Privada" }) });
    createdSongIds.push(privateSong.id);
    await setSongPublic(privateSong.id, false);

    await signInAs(userB);
    await expect(forkSong(privateSong.id)).rejects.toThrow();
  });

  it("adds and removes a public song from favorites", async () => {
    await signInAs(userA);
    const song = await saveSong({ content: makeContent({ title: "Para favoritos" }) });
    createdSongIds.push(song.id);
    await setSongPublic(song.id, true);

    await signInAs(userB);
    await toggleFavorite(song.id);
    let favorites = await listFavorites();
    expect(favorites.some((song2) => song2.id === song.id)).toBe(true);

    await toggleFavorite(song.id);
    favorites = await listFavorites();
    expect(favorites.some((song2) => song2.id === song.id)).toBe(false);
  });

  it(
    "forks a public song (copying content, setting forked_from) and the fork survives the " +
      "original being deleted, with forked_from cleared",
    async () => {
      await signInAs(userA);
      const original = await saveSong({
        content: makeContent({ title: "Original", lyricsText: "la la la", merges: new Set(["x|y"]) }),
      });
      createdSongIds.push(original.id);
      await setSongPublic(original.id, true);

      await signInAs(userB);
      const fork = await forkSong(original.id);
      createdSongIds.push(fork.id);

      expect(fork.forkedFrom).toBe(original.id);
      expect(fork.isPublic).toBe(false);
      expect(fork.isListed).toBe(false);
      expect(fork.content.lyricsText).toBe("la la la");
      expect(fork.content.merges).toEqual(new Set(["x|y"]));

      await signInAs(userA);
      await deleteSong(original.id);

      await signInAs(userB);
      const reloadedFork = await getSong(fork.id);
      expect(reloadedFork.forkedFrom).toBeNull();
    },
  );

  describe("song performers", () => {
    it("shows a song's performers in the order an admin loaded them, replacing the old list", async () => {
      await signInAs(adminUser);
      const song = await saveSong({ content: makeContent({ title: "Zamba de amor en vuelo" }) });
      createdSongIds.push(song.id);

      expect((await getSong(song.id)).performers).toEqual([]);

      await setSongPerformers(song.id, ["Tamara Castro", "  ", "Soledad"]);
      expect((await getSong(song.id)).performers).toEqual(["Tamara Castro", "Soledad"]);

      await setSongPerformers(song.id, ["Soledad", "Tamara Castro"]);
      await setSongPerformers(song.id, ["Soledad", "Tamara Castro"]);
      expect((await getSong(song.id)).performers).toEqual(["Soledad", "Tamara Castro"]);

      await setSongPerformers(song.id, []);
      expect((await getSong(song.id)).performers).toEqual([]);
    });

    it('treats "Los Chalchaleros" and "los chalchaléros" as the same artist', async () => {
      await signInAs(adminUser);
      const first = await saveSong({ content: makeContent({ title: "Zamba de la candelaria" }) });
      const second = await saveSong({ content: makeContent({ title: "Angelita Huenumán" }) });
      createdSongIds.push(first.id, second.id);

      await setSongPerformers(first.id, ["Los Chalchaleros", "los chalchaléros"]);
      await setSongPerformers(second.id, ["los chalchaléros"]);

      expect((await getSong(first.id)).performers).toEqual(["Los Chalchaleros"]);
      expect((await getSong(second.id)).performers).toEqual(["Los Chalchaleros"]);
      const { data, error } = await adminClient
        .from("song_performers")
        .select("artist_id")
        .in("song_id", [first.id, second.id]);
      expect(error).toBeNull();
      expect(new Set((data ?? []).map((row) => row.artist_id)).size).toBe(1);
    });

    it("lets anyone, signed out included, read the performers of a public song", async () => {
      await signInAs(adminUser);
      const song = await saveSong({ content: makeContent({ title: "Pública con intérpretes" }) });
      createdSongIds.push(song.id);
      await setSongPerformers(song.id, ["Mercedes Sosa"]);
      const { slug } = await setSongPublic(song.id, true);

      await signInAs(userA);
      expect((await getSong(song.id)).performers).toEqual(["Mercedes Sosa"]);

      await (await getSupabaseClient()).auth.signOut();
      expect((await getSongBySlug(slug)).performers).toEqual(["Mercedes Sosa"]);
    });

    it("keeps non-admins from writing performers by any route", async () => {
      await signInAs(adminUser);
      const song = await saveSong({ content: makeContent({ title: "Solo admins" }) });
      createdSongIds.push(song.id);
      await setSongPerformers(song.id, ["Jorge Cafrune"]);
      const { data: artist } = await adminClient
        .from("artists")
        .select("id")
        .eq("name", "Jorge Cafrune")
        .single();

      await signInAs(userA);
      const ownSong = await saveSong({ content: makeContent({ title: "Propia de A" }) });
      createdSongIds.push(ownSong.id);
      const supabase = await getSupabaseClient();

      await expect(setSongPerformers(ownSong.id, ["Intruso"])).rejects.toThrow();
      await expect(setSongPerformers(song.id, ["Intruso"])).rejects.toThrow();

      const artistInsert = await supabase.from("artists").insert({ name: "Intruso" });
      expect(artistInsert.error?.code).toBe("42501");
      const performerInsert = await supabase
        .from("song_performers")
        .insert({ song_id: ownSong.id, artist_id: artist!.id, position: 0 });
      expect(performerInsert.error?.code).toBe("42501");
      const performerDelete = await supabase
        .from("song_performers")
        .delete()
        .eq("song_id", song.id)
        .select("song_id");
      expect(performerDelete.data ?? []).toEqual([]);
      const artistUpdate = await supabase
        .from("artists")
        .update({ name: "Renombrado" })
        .eq("id", artist!.id)
        .select("id");
      expect(artistUpdate.data ?? []).toEqual([]);

      expect((await getSong(ownSong.id)).performers).toEqual([]);
      const { data: intruders } = await adminClient.from("artists").select("id").eq("name", "Intruso");
      expect(intruders).toEqual([]);
      await signInAs(adminUser);
      expect((await getSong(song.id)).performers).toEqual(["Jorge Cafrune"]);
    });

    it("lists each song's performers in load order in the public, own and favorite lists", async () => {
      await signInAs(adminUser);
      const song = await saveSong({
        content: makeContent({ title: "Zamba de amor en vuelo", author: "Jorge Milikota" }),
      });
      createdSongIds.push(song.id);
      await setSongPerformers(song.id, ["Tamara Castro", "Soledad"]);
      await setSongPublic(song.id, true);

      const mine = (await listMySongs()).find((each) => each.id === song.id);
      expect(mine?.performers).toEqual(["Tamara Castro", "Soledad"]);

      await signInAs(userB);
      await toggleFavorite(song.id);
      const favorite = (await listFavorites()).find((each) => each.id === song.id);
      expect(favorite?.performers).toEqual(["Tamara Castro", "Soledad"]);

      await (await getSupabaseClient()).auth.signOut();
      const listed = (await listPublicSongs()).find((each) => each.id === song.id);
      expect(listed?.performers).toEqual(["Tamara Castro", "Soledad"]);
    });

    it("does not copy performers into a fork", async () => {
      await signInAs(adminUser);
      const original = await saveSong({ content: makeContent({ title: "Original con intérpretes" }) });
      createdSongIds.push(original.id);
      await setSongPerformers(original.id, ["Tamara Castro"]);
      await setSongPublic(original.id, true);

      await signInAs(userB);
      const fork = await forkSong(original.id);
      createdSongIds.push(fork.id);

      expect(fork.performers).toEqual([]);
      expect((await getSong(fork.id)).performers).toEqual([]);
    });
  });

  describe("song category", () => {
    async function setCategory(songId: string, category: string | null) {
      const { error } = await (await getSupabaseClient())
        .from("songs")
        .update({ category })
        .eq("id", songId);
      if (error) throw error;
    }

    it("starts a new song without a category and lets an admin set it", async () => {
      await signInAs(adminUser);
      const song = await saveSong({ content: makeContent({ title: "Zamba para no morir" }) });
      createdSongIds.push(song.id);
      expect((await getSong(song.id)).category).toBeNull();

      await setCategory(song.id, "Folklore");
      expect((await getSong(song.id)).category).toBe("Folklore");
    });

    it("ignores a non-admin owner's attempt to set or change the category", async () => {
      await signInAs(userA);
      const insertedId = randomUUID();
      const { error } = await (await getSupabaseClient())
        .from("songs")
        .insert({
          id: insertedId,
          owner_id: userA.id,
          content: serializeContent(makeContent()),
          category: "Tango",
        });
      if (error) throw error;
      createdSongIds.push(insertedId);
      expect((await getSong(insertedId)).category).toBeNull();

      const song = await saveSong({ content: makeContent({ title: "Mía" }) });
      createdSongIds.push(song.id);
      await adminClient.from("songs").update({ category: "Folklore" }).eq("id", song.id);

      await setCategory(song.id, "Rock");
      expect((await getSong(song.id)).category).toBe("Folklore");
    });

    it("copies the category into a fork", async () => {
      await signInAs(adminUser);
      const original = await saveSong({ content: makeContent({ title: "Original folklórico" }) });
      createdSongIds.push(original.id);
      await setCategory(original.id, "Folklore");
      await setSongPublic(original.id, true);

      await signInAs(userB);
      const fork = await forkSong(original.id);
      createdSongIds.push(fork.id);

      expect(fork.category).toBe("Folklore");
    });
  });

  it("rejects setUsername on a duplicate username", async () => {
    const uniqueName = `dup-${Date.now()}`;
    await signInAs(userA);
    await setUsername(uniqueName);

    await signInAs(userB);
    await expect(setUsername(uniqueName)).rejects.toThrow();
  });
});
