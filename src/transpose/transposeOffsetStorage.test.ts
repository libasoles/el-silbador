import { beforeEach, describe, expect, it } from "vitest";
import { readTransposeOffset, saveTransposeOffset } from "./transposeOffsetStorage";

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

beforeEach(installFakeLocalStorage);

describe("transposeOffsetStorage", () => {
  it("reads back what was saved for the same song", () => {
    saveTransposeOffset("song-1", { semitones: 2, useFlats: false });
    expect(readTransposeOffset("song-1")).toEqual({ semitones: 2, useFlats: false });
  });

  it("does not match a different song's id", () => {
    saveTransposeOffset("song-1", { semitones: 2, useFlats: false });
    expect(readTransposeOffset("song-2")).toBeNull();
  });

  it("returns null when nothing was ever saved", () => {
    expect(readTransposeOffset("song-1")).toBeNull();
  });

  it("keeps useFlats stable across reads, independent of chord content", () => {
    saveTransposeOffset("song-1", { semitones: -3, useFlats: true });
    expect(readTransposeOffset("song-1")).toEqual({ semitones: -3, useFlats: true });
  });
});
