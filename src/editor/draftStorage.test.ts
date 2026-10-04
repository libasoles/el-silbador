import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDraft,
  readDraft,
  rememberedPendingCreationId,
  saveDraft,
} from "./draftStorage";
import type { SongContent } from "../data/types";

function createContent(overrides: Partial<SongContent> = {}): SongContent {
  return {
    title: "Vals",
    author: "",
    lyricsText: "la la",
    song: [],
    cells: {},
    chordVariants: {},
    pitchDirections: {},
    merges: new Set(["a-b"]),
    ...overrides,
  };
}

const store = new Map<string, string>();

function installFakeLocalStorage() {
  store.clear();
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
  clearDraft();
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
    const savedDraft = saveDraft(undefined, createContent({ title: "Nueva" }));
    const draft = readDraft(undefined);
    expect(draft?.content.title).toBe("Nueva");
    expect(savedDraft.creationId).toBe(draft?.creationId);
    expect(draft?.creationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
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

  it("keeps a new song's draft for 24 hours", () => {
    vi.useFakeTimers();
    saveDraft(undefined, createContent());
    vi.advanceTimersByTime(23 * 60 * 60 * 1000);
    expect(readDraft(undefined)?.content.title).toBe("Vals");
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);
    expect(readDraft(undefined)).toBeNull();
  });

  it("discards an expired draft instead of keeping it around", () => {
    vi.useFakeTimers();
    saveDraft(undefined, createContent());
    vi.advanceTimersByTime(25 * 60 * 60 * 1000);
    readDraft(undefined);
    expect(store.size).toBe(0);
  });

  it("keeps the reserved creation id and renews the expiry when the draft is rewritten", () => {
    vi.useFakeTimers();
    const first = saveDraft(undefined, createContent());
    vi.advanceTimersByTime(20 * 60 * 60 * 1000);
    saveDraft(undefined, createContent({ title: "Editada" }), first.creationId);
    vi.advanceTimersByTime(20 * 60 * 60 * 1000);
    const draft = readDraft(undefined);
    expect(draft?.creationId).toBe(first.creationId);
    expect(draft?.content.title).toBe("Editada");
  });

  it("remembers this tab's creation id after another tab removed the local copy", () => {
    const draft = saveDraft(undefined, createContent());
    store.clear();
    expect(rememberedPendingCreationId()).toBe(draft.creationId);
  });

  it("remembers the creation id of a draft restored after a reload", () => {
    const draft = saveDraft(undefined, createContent());
    const storedByAnEarlierPageLoad = store.get("silabeo:pending-draft")!;
    clearDraft();
    store.set("silabeo:pending-draft", storedByAnEarlierPageLoad);
    expect(rememberedPendingCreationId()).toBeUndefined();
    readDraft(undefined);
    expect(rememberedPendingCreationId()).toBe(draft.creationId);
  });

  it("forgets the remembered creation id once the draft is cleared here", () => {
    saveDraft(undefined, createContent());
    clearDraft();
    expect(rememberedPendingCreationId()).toBeUndefined();
  });
});
