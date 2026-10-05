import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SongContent } from "../data/types";
import { useAutosave } from "./useAutosave";

const data = vi.hoisted(() => ({
  saveSong: vi.fn(),
  setSongPerformers: vi.fn(),
}));
vi.mock("../data", () => data);
vi.mock("../app/actions", () => ({ revalidatePublicSongs: vi.fn(async () => {}) }));

function makeContent(title: string): SongContent {
  return {
    title,
    author: "Jorge Milikota",
    lyricsText: "",
    song: [],
    cells: {},
    chordVariants: {},
    pitchDirections: {},
    merges: new Set(),
  };
}

interface HookProps {
  content: SongContent;
  performers: string[];
  songId: string | undefined;
  isNewSong: boolean;
}

function renderAutosave(initial: HookProps) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    (props: HookProps) =>
      useAutosave(
        props.content,
        props.performers,
        props.songId,
        true,
        true,
        true,
        props.isNewSong,
        () => {},
      ),
    { initialProps: initial, wrapper },
  );
}

/** Lets the debounce elapse and every pending save settle. */
async function flush() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000);
  });
}

const ZAMBA = makeContent("Zamba de amor en vuelo");

describe("useAutosave with performers", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    data.saveSong.mockImplementation(async ({ id }: { id?: string }) => ({
      id: id ?? "new-song",
      slug: "zamba-de-amor-en-vuelo-a1b2c",
      updatedAt: "2026-10-05T12:00:00Z",
    }));
    data.setSongPerformers.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    data.saveSong.mockReset();
    data.setSongPerformers.mockReset();
  });

  it("does not touch performers when only the song content changed", async () => {
    const { rerender, result } = renderAutosave({
      content: ZAMBA,
      performers: ["Tamara Castro"],
      songId: "song-1",
      isNewSong: false,
    });

    rerender({
      content: makeContent("Zamba de amor"),
      performers: ["Tamara Castro"],
      songId: "song-1",
      isNewSong: false,
    });
    await flush();

    expect(data.saveSong).toHaveBeenCalledTimes(1);
    expect(data.setSongPerformers).not.toHaveBeenCalled();
    expect(result.current.status).toBe("saved");
  });

  it("saves the song and then its performers when the performers changed", async () => {
    const { rerender, result } = renderAutosave({
      content: ZAMBA,
      performers: ["Tamara Castro"],
      songId: "song-1",
      isNewSong: false,
    });

    rerender({
      content: ZAMBA,
      performers: ["Tamara Castro", "Soledad"],
      songId: "song-1",
      isNewSong: false,
    });
    await flush();

    expect(data.saveSong).toHaveBeenCalledWith({ id: "song-1", content: ZAMBA });
    expect(data.setSongPerformers).toHaveBeenCalledWith("song-1", ["Tamara Castro", "Soledad"]);
    expect(data.saveSong.mock.invocationCallOrder[0]).toBeLessThan(
      data.setSongPerformers.mock.invocationCallOrder[0],
    );
    expect(result.current.status).toBe("saved");
  });

  it("does not save the same performers twice", async () => {
    const { rerender } = renderAutosave({
      content: ZAMBA,
      performers: [],
      songId: "song-1",
      isNewSong: false,
    });

    rerender({ content: ZAMBA, performers: ["Soledad"], songId: "song-1", isNewSong: false });
    await flush();
    rerender({
      content: makeContent("Zamba de amor"),
      performers: ["Soledad"],
      songId: "song-1",
      isNewSong: false,
    });
    await flush();

    expect(data.saveSong).toHaveBeenCalledTimes(2);
    expect(data.setSongPerformers).toHaveBeenCalledTimes(1);
  });

  it("creates a new song first and then saves its performers under the new id", async () => {
    const { rerender, result } = renderAutosave({
      content: ZAMBA,
      performers: [],
      songId: undefined,
      isNewSong: true,
    });

    rerender({ content: ZAMBA, performers: ["Soledad"], songId: undefined, isNewSong: true });
    await flush();
    expect(result.current.status).toBe("dirty");
    expect(data.saveSong).not.toHaveBeenCalled();

    act(() => result.current.retry());
    await flush();

    expect(data.saveSong).toHaveBeenCalledWith({ id: undefined, content: ZAMBA });
    expect(data.setSongPerformers).toHaveBeenCalledWith("new-song", ["Soledad"]);
    expect(result.current.status).toBe("saved");
  });

  it("ends in error when the performers fail to save, and the retry saves everything again", async () => {
    data.setSongPerformers.mockRejectedValueOnce(new Error("permission denied"));
    const { rerender, result } = renderAutosave({
      content: ZAMBA,
      performers: [],
      songId: "song-1",
      isNewSong: false,
    });

    rerender({ content: ZAMBA, performers: ["Soledad"], songId: "song-1", isNewSong: false });
    await flush();
    expect(result.current.status).toBe("error");

    act(() => result.current.retry());
    await flush();

    expect(data.saveSong).toHaveBeenCalledTimes(2);
    expect(data.setSongPerformers).toHaveBeenCalledTimes(2);
    expect(data.setSongPerformers).toHaveBeenLastCalledWith("song-1", ["Soledad"]);
    expect(result.current.status).toBe("saved");
  });
});
