import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDraft, readDraft, saveDraft } from "./draftStorage";
import type { SongContent } from "../data/types";

function createContent(overrides: Partial<SongContent> = {}): SongContent {
  return {
    title: "Vals",
    author: "",
    lyricsText: "la la",
    song: [],
    cells: {},
    chordVariants: {},
    merges: new Set(["a-b"]),
    ...overrides,
  };
}

function installFakeLocalStorage() {
  const store = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  };
  (globalThis as { window?: { localStorage: typeof fakeStorage } }).window = {
    localStorage: fakeStorage,
  };
}

beforeEach(() => {
  installFakeLocalStorage();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("draftStorage", () => {
  it("round-trips a draft for the same song, including the merges set", () => {
    saveDraft("song-1", createContent());
    const draft = readDraft("song-1");
    expect(draft?.songId).toBe("song-1");
    expect(draft?.content.title).toBe("Vals");
    expect(draft?.content.merges).toEqual(new Set(["a-b"]));
  });

  it("treats a new, unsaved song (no id) as its own slot", () => {
    saveDraft(undefined, createContent({ title: "Nueva" }));
    expect(readDraft(undefined)?.content.title).toBe("Nueva");
  });

  it("does not return a draft saved for a different song", () => {
    saveDraft("song-1", createContent());
    expect(readDraft("song-2")).toBeNull();
  });

  it("does not return an expired draft", () => {
    vi.useFakeTimers();
    saveDraft("song-1", createContent());
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(readDraft("song-1")).toBeNull();
  });

  it("clearDraft removes the stored draft", () => {
    saveDraft("song-1", createContent());
    clearDraft();
    expect(readDraft("song-1")).toBeNull();
  });
});
