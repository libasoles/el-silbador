import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { setUsername } from "../profiles";
import {
  deleteSong,
  forkSong,
  getSong,
  listFavorites,
  listMySongs,
  listPublicSongs,
  saveSong,
  setSongPublic,
  toggleFavorite,
} from "../songs";
import { getSupabaseClient } from "../supabaseClient";
import type { SongContent } from "../types";

// Integration tests against a real Supabase project (see README.md in this directory for setup).
// Skipped entirely — not failed — when the required env vars aren't present, so `npm run test`
// stays green without real credentials.
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
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
    const { error } = await getSupabaseClient().auth.signInWithPassword({
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

  it("lists only the caller's own songs, never another user's private songs", async () => {
    await signInAs(userA);
    const own = await saveSong({ content: makeContent({ title: "A privada" }) });
    createdSongIds.push(own.id);

    await signInAs(userB);
    const otherPrivate = await saveSong({ content: makeContent({ title: "B privada" }) });
    createdSongIds.push(otherPrivate.id);

    await signInAs(userA);
    const mine = await listMySongs();
    expect(mine.some((song) => song.id === own.id)).toBe(true);
    expect(mine.some((song) => song.id === otherPrivate.id)).toBe(false);

    const publicSongs = await listPublicSongs();
    expect(publicSongs.some((song) => song.id === otherPrivate.id)).toBe(false);
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

  it("rejects setSongPublic from a non-admin, but allows it from an admin", async () => {
    await signInAs(userA);
    const saved = await saveSong({ content: makeContent({ title: "Para publicar" }) });
    createdSongIds.push(saved.id);

    await expect(setSongPublic(saved.id, true)).rejects.toThrow();

    await signInAs(adminUser);
    const published = await setSongPublic(saved.id, true);
    expect(published.isPublic).toBe(true);
  });

  it("only allows favoriting a public song", async () => {
    await signInAs(userA);
    const privateSong = await saveSong({ content: makeContent({ title: "Privada" }) });
    createdSongIds.push(privateSong.id);

    await signInAs(userB);
    await expect(toggleFavorite(privateSong.id)).rejects.toThrow();
  });

  it("only allows forking a public song", async () => {
    await signInAs(userA);
    const privateSong = await saveSong({ content: makeContent({ title: "Privada" }) });
    createdSongIds.push(privateSong.id);

    await signInAs(userB);
    await expect(forkSong(privateSong.id)).rejects.toThrow();
  });

  it("adds and removes a public song from favorites", async () => {
    await signInAs(userA);
    const song = await saveSong({ content: makeContent({ title: "Para favoritos" }) });
    createdSongIds.push(song.id);

    await signInAs(adminUser);
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

      await signInAs(adminUser);
      await setSongPublic(original.id, true);

      await signInAs(userB);
      const fork = await forkSong(original.id);
      createdSongIds.push(fork.id);

      expect(fork.forkedFrom).toBe(original.id);
      expect(fork.isPublic).toBe(false);
      expect(fork.content.lyricsText).toBe("la la la");
      expect(fork.content.merges).toEqual(new Set(["x|y"]));

      await signInAs(userA);
      await deleteSong(original.id);

      await signInAs(userB);
      const reloadedFork = await getSong(fork.id);
      expect(reloadedFork.forkedFrom).toBeNull();
    },
  );

  it("includes the author's username when listing public songs", async () => {
    await signInAs(userA);
    const username = `author-${Date.now()}`;
    await setUsername(username);
    const song = await saveSong({ content: makeContent({ title: "Con autor" }) });
    createdSongIds.push(song.id);

    await signInAs(adminUser);
    await setSongPublic(song.id, true);

    await signInAs(userB);
    const publicSongs = await listPublicSongs();
    const found = publicSongs.find((s) => s.id === song.id);
    expect(found?.authorUsername).toBe(username);
  });

  it("rejects setUsername on a duplicate username", async () => {
    const uniqueName = `dup-${Date.now()}`;
    await signInAs(userA);
    await setUsername(uniqueName);

    await signInAs(userB);
    await expect(setUsername(uniqueName)).rejects.toThrow();
  });
});
