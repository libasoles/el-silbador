import { beforeEach, describe, expect, it } from "vitest";
import {
  readReaderTransposePreference,
  saveReaderTransposePreference,
} from "./readerTransposeStorage";

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

describe("readerTransposeStorage", () => {
  it("has no preference until a reader changes a song's key", () => {
    expect(readReaderTransposePreference("song-a")).toBeNull();
  });

  it("remembers offsets separately for each song, including the original key", () => {
    saveReaderTransposePreference("song-a", 3);
    saveReaderTransposePreference("song-b", -2);
    saveReaderTransposePreference("song-a", 0);

    expect(readReaderTransposePreference("song-a")).toBe(0);
    expect(readReaderTransposePreference("song-b")).toBe(-2);
  });
});
