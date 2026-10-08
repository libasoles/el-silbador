import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { beforeSlotId, buildSong, flattenSyllables } from "../core/model";
import type { SongContent } from "../data/types";
import { useEditor } from "./useEditor";

function contentWithNotes(): SongContent {
  const song = buildSong("una canción");
  const first = flattenSyllables(song[0]!)[0]!;
  return {
    title: "",
    author: "",
    lyricsText: "una canción",
    song,
    cells: { vocalNotes: { [beforeSlotId(first.id)]: "re" } },
    chordVariants: {},
    pitchDirections: {},
    merges: new Set(),
  };
}

describe("useEditor underline default", () => {
  it("starts with the underline on for a song with notes, on desktop", () => {
    const { result } = renderHook(() => useEditor(contentWithNotes(), false));

    expect(result.current.state.showUnderline).toBe(true);
  });

  it("switches the underline off when the device turns out to be a phone after hydration", () => {
    const content = contentWithNotes();
    const { result, rerender } = renderHook(({ isMobile }) => useEditor(content, isMobile), {
      initialProps: { isMobile: false },
    });
    expect(result.current.state.showUnderline).toBe(true);

    act(() => rerender({ isMobile: true }));

    expect(result.current.state.showUnderline).toBe(false);
  });
});
