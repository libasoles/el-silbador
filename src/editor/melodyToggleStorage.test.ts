import { beforeEach, describe, expect, it } from "vitest";
import {
  readMelodyTogglePreference,
  saveMelodyTogglePreference,
} from "./melodyToggleStorage";

function installFakeLocalStorage() {
  const store = new Map<string, string>();
  const fakeStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
  };
  (globalThis as { window?: { localStorage: typeof fakeStorage } }).window = {
    localStorage: fakeStorage,
  };
}

beforeEach(installFakeLocalStorage);

describe("melodyToggleStorage", () => {
  it("has no preference until the person changes the toggle", () => {
    expect(readMelodyTogglePreference()).toBeNull();
  });

  it("remembers each global toggle choice", () => {
    saveMelodyTogglePreference(false);
    expect(readMelodyTogglePreference()).toBe(false);

    saveMelodyTogglePreference(true);
    expect(readMelodyTogglePreference()).toBe(true);
  });
});
