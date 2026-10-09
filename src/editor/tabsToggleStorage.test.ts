import { beforeEach, describe, expect, it } from "vitest";
import { readTabsTogglePreference, saveTabsTogglePreference } from "./tabsToggleStorage";

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

describe("tabsToggleStorage", () => {
  it("starts off until the person turns the toggle on", () => {
    expect(readTabsTogglePreference()).toBe(false);
  });

  it("remembers each global toggle choice", () => {
    saveTabsTogglePreference(true);
    expect(readTabsTogglePreference()).toBe(true);

    saveTabsTogglePreference(false);
    expect(readTabsTogglePreference()).toBe(false);
  });
});
