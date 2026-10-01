import { beforeEach, describe, expect, it } from "vitest";
import { hasSeenTutorial, markTutorialSeen } from "./tutorialStorage";

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

describe("tutorialStorage", () => {
  it("does not mark a tutorial as seen before it is closed", () => {
    expect(hasSeenTutorial("chord-notes-shared")).toBe(false);
  });

  it("remembers a dismissed tutorial locally", () => {
    markTutorialSeen("chord-notes-shared");
    expect(hasSeenTutorial("chord-notes-shared")).toBe(true);
  });
});
