import { beforeEach, describe, expect, it } from "vitest";
import { readReaderChordPositions, saveReaderChordPositions } from "./readerChordPositionsStorage";

beforeEach(() => {
  const store = new Map<string, string>();
  (globalThis as { window?: unknown }).window = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  };
});

describe("readerChordPositionsStorage", () => {
  it("has no positions until a reader picks one", () => {
    expect(readReaderChordPositions("song-a")).toEqual({});
  });

  it("remembers positions separately for each song", () => {
    saveReaderChordPositions("song-a", { C: 2, Em7: 1 });
    saveReaderChordPositions("song-b", { C: 1 });
    expect(readReaderChordPositions("song-a")).toEqual({ C: 2, Em7: 1 });
    expect(readReaderChordPositions("song-b")).toEqual({ C: 1 });
  });

  it("ignores corrupt stored values", () => {
    (globalThis as { window: Window }).window.localStorage.setItem("el-silbador:reader-chord-positions:x", '{"C":"a","D":-1,"G":1}');
    expect(readReaderChordPositions("x")).toEqual({ G: 1 });
  });
});
