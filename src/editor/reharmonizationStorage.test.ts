import { beforeEach, describe, expect, it } from "vitest";
import {
  readLocalReharmonization,
  saveLocalReharmonizationKey,
  saveLocalReharmonizedChord,
} from "./reharmonizationStorage";

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

describe("reharmonizationStorage", () => {
  beforeEach(installFakeLocalStorage);

  it("starts empty", () => {
    expect(readLocalReharmonization("s1")).toEqual({ chords: {} });
  });

  it("keeps chords per slot, including removed ones, and the key per song", () => {
    saveLocalReharmonizedChord("s1", "a", "Am");
    saveLocalReharmonizedChord("s1", "b", "");
    saveLocalReharmonizationKey("s1", "9:minor");
    expect(readLocalReharmonization("s1")).toEqual({ chords: { a: "Am", b: "" }, key: "9:minor" });
    expect(readLocalReharmonization("s2")).toEqual({ chords: {} });
  });

  it("remembers an explicit return to the inferred key", () => {
    saveLocalReharmonizationKey("s1", null);
    expect(readLocalReharmonization("s1").key).toBeNull();
  });

  it("ignores corrupt data", () => {
    window.localStorage.setItem("el-silbador:reharmonization:s1", "{nope");
    expect(readLocalReharmonization("s1")).toEqual({ chords: {} });
  });
});
