import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { consumeJustForked, saveJustForked } from "./justForkedStorage";

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

describe("justForkedStorage", () => {
  it("matches the slug it was saved for", () => {
    saveJustForked("mi-cancion-2");
    expect(consumeJustForked("mi-cancion-2")).toBe(true);
  });

  it("does not match a different slug", () => {
    saveJustForked("mi-cancion-2");
    expect(consumeJustForked("otra-cancion")).toBe(false);
  });

  it("clears itself after being read once", () => {
    saveJustForked("mi-cancion-2");
    consumeJustForked("mi-cancion-2");
    expect(consumeJustForked("mi-cancion-2")).toBe(false);
  });

  it("does not match an expired flag", () => {
    vi.useFakeTimers();
    saveJustForked("mi-cancion-2");
    vi.advanceTimersByTime(61 * 1000);
    expect(consumeJustForked("mi-cancion-2")).toBe(false);
  });
});
