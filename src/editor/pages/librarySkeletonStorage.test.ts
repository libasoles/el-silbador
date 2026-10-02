import { beforeEach, describe, expect, it } from "vitest";
import {
  readLibrarySkeletonCounts,
  saveLibrarySkeletonCount,
} from "./librarySkeletonStorage";

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

describe("librarySkeletonStorage", () => {
  it("uses the current two placeholder rows when there is no saved count", () => {
    expect(readLibrarySkeletonCounts("user-1")).toEqual({ mine: 2, favorites: 2 });
  });

  it("keeps each user's counts separate", () => {
    saveLibrarySkeletonCount("user-1", "mine", 5);
    saveLibrarySkeletonCount("user-1", "favorites", 3);

    expect(readLibrarySkeletonCounts("user-1")).toEqual({ mine: 5, favorites: 3 });
    expect(readLibrarySkeletonCounts("user-2")).toEqual({ mine: 2, favorites: 2 });
  });

  it("falls back for malformed stored counts", () => {
    window.localStorage.setItem(
      "el-silbador:library-skeleton-counts:user-1",
      JSON.stringify({ mine: -1, favorites: 1.5 }),
    );

    expect(readLibrarySkeletonCounts("user-1")).toEqual({ mine: 2, favorites: 2 });
  });
});
