import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { beforeSlotId, buildSong, flattenSyllables } from "../../core/model";
import { createInitialState } from "../../core/state";
import type { CellsByTrack } from "../../core/types";
import { mockMatchMedia } from "../../test/matchMedia";
import { SongView } from "./SongView";

const TEXT = "Ya nunca";

function renderSong({
  reharmonization,
  chords = {},
  songKey = null,
  onChangeSongKey,
}: {
  reharmonization: boolean;
  chords?: Record<string, string>;
  songKey?: string | null;
  onChangeSongKey?: (key: string | null) => void;
}) {
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
      songKey={songKey}
      onChangeSongKey={onChangeSongKey}
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

  it("suggests from the saved key instead of the inferred one", () => {
    mockMatchMedia(false);
    // The note is "do", which belongs to do mayor but not to re mayor: with re mayor fixed, every
    // suggestion is flagged as outside the key.
    renderSong({ reharmonization: true, songKey: "2:major" });
    fireEvent.click(screen.getByText("Ya"));
    const buttons = within(screen.getByRole("list", { name: "Sugerencias" })).getAllByRole("button");
    expect(buttons.every((b) => b.textContent!.includes("fuera de la tonalidad"))).toBe(true);
  });

  it("lets an admin fix the key or go back to the inferred one; others only see it", () => {
    mockMatchMedia(false);
    const onChangeSongKey = vi.fn();
    renderSong({ reharmonization: true, songKey: "2:major", onChangeSongKey });
    fireEvent.click(screen.getByText("Ya"));
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("2:major");

    fireEvent.change(select, { target: { value: "9:minor" } });
    expect(onChangeSongKey).toHaveBeenLastCalledWith("9:minor");
    fireEvent.change(select, { target: { value: "" } });
    expect(onChangeSongKey).toHaveBeenLastCalledWith(null);
  });

  it("shows no key selector without permission to change it", () => {
    mockMatchMedia(false);
    renderSong({ reharmonization: true });
    fireEvent.click(screen.getByText("Ya"));
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("leaves syllables inert when reharmonization is off", () => {
    mockMatchMedia(false);
    renderSong({ reharmonization: false });
    expect(document.querySelectorAll("[data-reharmonizable]")).toHaveLength(0);
  });
});
