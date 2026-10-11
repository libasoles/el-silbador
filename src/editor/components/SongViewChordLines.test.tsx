import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildSong } from "../../core/model";
import { createInitialState } from "../../core/state";
import type { TrackId } from "../../core/types";
import { mockMatchMedia } from "../../test/matchMedia";
import { SongView } from "./SongView";

const TEXT = "  A    D7\n\nYa nunca";

function renderSong({ canEdit, hidden = [], text = TEXT }: { canEdit: boolean; hidden?: TrackId[]; text?: string }) {
  const song = buildSong(text);
  const tracks = createInitialState().tracks.map((track) => ({ ...track, visible: !hidden.includes(track.id) }));
  const noop = vi.fn();
  render(
    <SongView
      song={song}
      lyricsText={text}
      bisGroups={[]}
      merges={new Set()}
      tracks={tracks}
      cells={{}}
      chordVariants={{}}
      pitchDirections={{}}
      showUnderline
      placeholder={null}
      canEdit={canEdit}
      onSetCellText={noop}
      onSetChordVariant={noop}
      onToggleMerge={noop}
      onMoveCellText={noop}
      onDragPitchDirection={noop}
      onReconcileLyricsText={noop}
      onToggleBis={noop}
      onPasteText={noop}
    />,
  );
  return [...document.querySelectorAll<HTMLElement>(".line")];
}

describe("SongView chord lines", () => {
  it.each([false, true])("opens diminished diagrams written with ° (mobile: %s)", (mobile) => {
    mockMatchMedia(mobile);
    renderSong({ canEdit: false, text: "C#° D°7" });

    fireEvent.click(screen.getByRole("button", { name: "Ver diagrama de C#°" }));
    expect(document.querySelector(".chord-tooltip__name")).toHaveTextContent("D♭dim7");
    fireEvent.click(screen.getByRole("button", { name: "Ver diagrama de D°7" }));
    expect(document.querySelectorAll(".chord-tooltip__name")[1]).toHaveTextContent("Ddim7");
  });

  it("shows a line of only chords as its text, with no syllables or cells", () => {
    mockMatchMedia(false);
    const [chordLine] = renderSong({ canEdit: true });

    expect(chordLine).toHaveClass("line--chord-line");
    expect(chordLine!.querySelector("[data-lyrics-line]")!.textContent).toBe("  A    D7");
    expect(chordLine!.querySelectorAll(".syllable, .track-cell")).toHaveLength(0);
  });

  it("offers no chord cells on an empty line", () => {
    mockMatchMedia(false);
    const [, empty, lyrics] = renderSong({ canEdit: true });

    expect(empty!.querySelectorAll(".track-cell")).toHaveLength(0);
    expect(lyrics!.querySelectorAll(".track-cell").length).toBeGreaterThan(0);
  });

  it("opens a chord's diagram when reading", () => {
    mockMatchMedia(false);
    renderSong({ canEdit: false });

    fireEvent.click(screen.getByRole("button", { name: "Ver diagrama de D7" }));

    expect(document.querySelector(".chord-tooltip__name")).toHaveTextContent("D7");
  });

  it("shows each chord's notes when reading with the chord notes on", () => {
    mockMatchMedia(false);
    const [chordLine] = renderSong({ canEdit: false });

    expect(chordLine!.querySelector(".chord-line__notes")).toHaveTextContent("mido#la");
  });

  it("hides with the chords when reading", () => {
    mockMatchMedia(false);
    const [chordLine] = renderSong({ canEdit: false, hidden: ["chords"] });

    expect(chordLine).not.toBeVisible();
  });
});
