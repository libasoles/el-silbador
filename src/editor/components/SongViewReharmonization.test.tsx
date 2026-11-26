import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { beforeSlotId, buildSong, flattenSyllables } from "../../core/model";
import { createInitialState } from "../../core/state";
import type { CellsByTrack } from "../../core/types";
import { mockMatchMedia } from "../../test/matchMedia";
import { SongView } from "./SongView";

const TEXT = "Ya nunca";

function renderSong({ reharmonization, chords = {} }: { reharmonization: boolean; chords?: Record<string, string> }) {
  const song = buildSong(TEXT);
  const [ya] = flattenSyllables(song[0]!);
  const yaSlot = beforeSlotId(ya!.id);
  const cells: CellsByTrack = { vocalNotes: { [yaSlot]: "do" }, chords };
  const onSetCellText = vi.fn();
  const noop = vi.fn();
  render(
    <SongView
      song={song}
      lyricsText={TEXT}
      bisGroups={[]}
      merges={new Set()}
      tracks={createInitialState().tracks}
      cells={cells}
      chordVariants={{}}
      pitchDirections={{}}
      showUnderline
      placeholder={null}
      canEdit={false}
      reharmonization={reharmonization}
      onSetCellText={onSetCellText}
      onSetChordVariant={noop}
      onToggleMerge={noop}
      onMoveCellText={noop}
      onDragPitchDirection={noop}
      onReconcileLyricsText={noop}
      onToggleBis={noop}
      onPasteText={noop}
    />,
  );
  return { onSetCellText, yaSlot };
}

afterEach(() => vi.unstubAllGlobals());

describe("SongView reharmonization", () => {
  it.each([false, true])("opens the popup only from a syllable with a note (mobile: %s)", (mobile) => {
    mockMatchMedia(mobile);
    renderSong({ reharmonization: true });

    expect(document.querySelectorAll("[data-reharmonizable]")).toHaveLength(1);
    fireEvent.click(screen.getByText("nun"));
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByText("Ya"));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getAllByRole("radio")).toHaveLength(4);
    expect(within(dialog).getByRole("radio", { name: /^1\./ })).toBeChecked();
    expect(within(dialog).getByRole("radio", { name: /^4\./ })).toBeDisabled();
    expect(within(dialog).getByRole("radio", { name: /^2\./ })).not.toBeDisabled();
  });

  it("writes the chosen chord to the chords track, even on mobile", () => {
    mockMatchMedia(true);
    const { onSetCellText, yaSlot } = renderSong({ reharmonization: true });

    fireEvent.click(screen.getByText("Ya"));
    fireEvent.click(within(screen.getByRole("list", { name: "Sugerencias" })).getAllByRole("button")[0]!);
    expect(onSetCellText).toHaveBeenCalledWith("chords", yaSlot, "C");
  });

  it("keeps the II-V-I radio disabled when no chord is before or after the syllable", () => {
    mockMatchMedia(false);
    const { onSetCellText, yaSlot } = renderSong({ reharmonization: true, chords: { "after:other": "F" } });
    fireEvent.click(screen.getByText("Ya"));
    expect(screen.getByRole("radio", { name: /^4\./ })).toBeDisabled();
    expect(onSetCellText).not.toHaveBeenCalled();
    expect(yaSlot).toBeTruthy();
  });

  it("leaves syllables inert when reharmonization is off", () => {
    mockMatchMedia(false);
    renderSong({ reharmonization: false });
    expect(document.querySelectorAll("[data-reharmonizable]")).toHaveLength(0);
  });
});
