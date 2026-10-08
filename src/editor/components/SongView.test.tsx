import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { beforeSlotId, buildSong, flattenSyllables, gapSlotId, startSlotId } from "../../core/model";
import { createInitialState } from "../../core/state";
import type { CellsByTrack } from "../../core/types";
import { mockMatchMedia } from "../../test/matchMedia";
import { SongView } from "./SongView";

const song = buildSong("una canción");
const syllables = flattenSyllables(song[0]!);
const lineId = song[0]!.id;
const firstWordLast = song[0]!.words[0]!.syllables.at(-1)!;

const cells: CellsByTrack = {
  chords: {
    [beforeSlotId(syllables[0]!.id)]: "C",
    [startSlotId(lineId)]: "G",
    [gapSlotId(firstWordLast.id)]: "Zzz",
  },
  vocalNotes: { [beforeSlotId(syllables[1]!.id)]: "mi" },
};

function renderSong(canEdit: boolean) {
  const tracks = createInitialState().tracks.map((track) => ({ ...track, visible: track.id !== "chordNotes" }));
  const noop = vi.fn();
  return render(
    <SongView
      song={song}
      lyricsText="una canción"
      bisGroups={[]}
      merges={new Set()}
      tracks={tracks}
      cells={cells}
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
}

describe("SongView track cells", () => {
  afterEach(() => vi.unstubAllGlobals());

  describe("when editing", () => {
    it("names each chord and note cell by its content and the syllable it sits over", () => {
      mockMatchMedia(false);
      renderSong(true);
      const chords = screen.getByRole("group", { name: "Acordes" });
      const notes = screen.getByRole("group", { name: "Notas de la melodía" });

      expect(within(chords).getByRole("button", { name: `Acorde C sobre «${syllables[0]!.text}»` })).toBeInTheDocument();
      expect(within(chords).getByRole("button", { name: "Acorde G al principio del renglón" })).toBeInTheDocument();
      expect(
        within(chords).getByRole("button", {
          name: `Acorde Zzz entre «${firstWordLast.text}» y «${song[0]!.words[1]!.syllables[0]!.text}»`,
        }),
      ).toBeInTheDocument();
      expect(within(chords).getByRole("button", { name: "Agregar acorde al final del renglón" })).toBeInTheDocument();
      expect(within(notes).getByRole("button", { name: `Nota mi sobre «${syllables[1]!.text}»` })).toBeInTheDocument();
      expect(within(notes).getByRole("button", { name: `Agregar nota sobre «${syllables[0]!.text}»` })).toBeInTheDocument();
    });

    it("still turns a cell into an input on click, named like the cell", () => {
      mockMatchMedia(false);
      renderSong(true);
      const chords = screen.getByRole("group", { name: "Acordes" });
      const emptyEnd = within(chords).getByRole("button", { name: "Agregar acorde al final del renglón" });

      fireEvent.focus(emptyEnd);

      expect(within(chords).getByRole("textbox", { name: "Agregar acorde al final del renglón" })).toBeInTheDocument();
    });
  });

  describe("when reading", () => {
    it("leaves empty cells and notes as plain text, not buttons", () => {
      mockMatchMedia(false);
      renderSong(false);
      const chords = screen.getByRole("group", { name: "Acordes" });
      const notes = screen.getByRole("group", { name: "Notas de la melodía" });

      expect(within(notes).queryAllByRole("button")).toHaveLength(0);
      expect(within(chords).queryByRole("button", { name: /Agregar/ })).not.toBeInTheDocument();
      expect(within(chords).queryByRole("button", { name: /Zzz/ })).not.toBeInTheDocument();
      expect(within(notes).getByText("mi")).toBeInTheDocument();
    });

    it("keeps known chords as buttons that open their diagram", () => {
      mockMatchMedia(false);
      renderSong(false);
      const chords = screen.getByRole("group", { name: "Acordes" });

      const chord = within(chords).getByRole("button", { name: `Acorde C sobre «${syllables[0]!.text}»` });
      fireEvent.click(chord);

      expect(document.querySelector(".chord-tooltip__name")).toHaveTextContent("C");
      // C and G open a diagram; the unknown chord and the empty end slot do nothing.
      expect(within(chords).getAllByRole("button")).toHaveLength(2);
    });
  });
});
