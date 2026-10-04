import { describe, expect, it, vi } from "vitest";
import { resumePendingSong, type PendingSongResumerDeps } from "./resumePendingSong";
import type { SongContent } from "../data/types";

function createContent(title: string): SongContent {
  return {
    title,
    author: "",
    lyricsText: "la la",
    song: [],
    cells: {},
    chordVariants: {},
    pitchDirections: {},
    merges: new Set(),
  };
}

function createDeps(overrides: Partial<PendingSongResumerDeps> = {}): PendingSongResumerDeps {
  return {
    readPendingSong: () => ({ creationId: "creation-1", content: createContent("Vals") }),
    rememberedCreationId: () => "creation-1",
    saveSong: vi.fn(async ({ id }) => ({ id, slug: "vals" })),
    findSongSlug: vi.fn(async () => null),
    clearPendingSong: vi.fn(),
    ...overrides,
  };
}

describe("resumePendingSong", () => {
  it("saves the pending song under its reserved creation id, then clears the local copy", async () => {
    const deps = createDeps();

    const outcome = await resumePendingSong(deps);

    expect(deps.saveSong).toHaveBeenCalledWith({
      id: "creation-1",
      content: expect.objectContaining({ title: "Vals" }),
    });
    expect(deps.clearPendingSong).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ kind: "saved", id: "creation-1", slug: "vals" });
  });

  it("does nothing without a pending song or a remembered creation id", async () => {
    const deps = createDeps({ readPendingSong: () => null, rememberedCreationId: () => undefined });

    expect(await resumePendingSong(deps)).toEqual({ kind: "idle" });
    expect(deps.saveSong).not.toHaveBeenCalled();
    expect(deps.clearPendingSong).not.toHaveBeenCalled();
  });

  it("saves the content most recently written to the local copy", async () => {
    let pending = { creationId: "creation-1", content: createContent("Primera") };
    const deps = createDeps({ readPendingSong: () => pending });
    pending = { creationId: "creation-1", content: createContent("Última") };

    await resumePendingSong(deps);

    expect(deps.saveSong).toHaveBeenCalledWith({
      id: "creation-1",
      content: expect.objectContaining({ title: "Última" }),
    });
  });

  it("keeps the local copy and reports the failure when saving fails", async () => {
    const error = new Error("network");
    const deps = createDeps({ saveSong: vi.fn(async () => Promise.reject(error)) });

    const outcome = await resumePendingSong(deps);

    expect(outcome).toEqual({ kind: "failed", error });
    expect(deps.clearPendingSong).not.toHaveBeenCalled();
  });

  it("retries on a later call after a failure", async () => {
    const saveSong = vi
      .fn()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ id: "creation-1", slug: "vals" });
    const deps = createDeps({ saveSong });

    expect((await resumePendingSong(deps)).kind).toBe("failed");
    expect(await resumePendingSong(deps)).toEqual({ kind: "saved", id: "creation-1", slug: "vals" });
  });

  it("finds the song another tab already saved through this tab's remembered creation id", async () => {
    const deps = createDeps({
      readPendingSong: () => null,
      findSongSlug: vi.fn(async () => "vals"),
    });

    const outcome = await resumePendingSong(deps);

    expect(deps.findSongSlug).toHaveBeenCalledWith("creation-1");
    expect(deps.saveSong).not.toHaveBeenCalled();
    expect(deps.clearPendingSong).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ kind: "saved", id: "creation-1", slug: "vals" });
  });

  it("reports a failure when looking up the song another tab saved fails", async () => {
    const error = new Error("network");
    const deps = createDeps({
      readPendingSong: () => null,
      findSongSlug: vi.fn(async () => Promise.reject(error)),
    });

    expect(await resumePendingSong(deps)).toEqual({ kind: "failed", error });
    expect(deps.clearPendingSong).not.toHaveBeenCalled();
  });

  it("stays idle when the remembered creation id was never saved", async () => {
    const deps = createDeps({ readPendingSong: () => null });

    expect(await resumePendingSong(deps)).toEqual({ kind: "idle" });
  });

  it("shares one save between overlapping calls", async () => {
    let finishSave!: () => void;
    const saveSong = vi.fn(
      ({ id }: { id: string }) =>
        new Promise<{ id: string; slug: string }>((resolve) => {
          finishSave = () => resolve({ id, slug: "vals" });
        }),
    );
    const deps = createDeps({ saveSong });

    const first = resumePendingSong(deps);
    const second = resumePendingSong(deps);
    finishSave();

    expect(await first).toEqual(await second);
    expect(saveSong).toHaveBeenCalledTimes(1);
  });
});
