import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPendingAuthAction,
  readPendingAuthAction,
  savePendingAuthAction,
} from "./pendingAuthActionStorage";

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
afterEach(() => vi.useRealTimers());

describe("pendingAuthActionStorage", () => {
  it("round-trips a favorite action", () => {
    savePendingAuthAction({ type: "toggle-favorite", songId: "song-1" });
    expect(readPendingAuthAction()).toEqual({ type: "toggle-favorite", songId: "song-1" });
  });

  it("round-trips a save action", () => {
    savePendingAuthAction({ type: "save-song", songSlug: null });
    expect(readPendingAuthAction()).toEqual({ type: "save-song", songSlug: null });
  });

  it("does not return an expired action", () => {
    vi.useFakeTimers();
    savePendingAuthAction({ type: "toggle-favorite", songId: "song-1" });
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(readPendingAuthAction()).toBeNull();
  });

  it("clears the completed action", () => {
    savePendingAuthAction({ type: "toggle-favorite", songId: "song-1" });
    clearPendingAuthAction();
    expect(readPendingAuthAction()).toBeNull();
  });
});
