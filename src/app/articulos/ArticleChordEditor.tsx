"use client";

import { useMemo } from "react";
import { chordSlotForColumn, buildSong } from "../../core/model";
import { parseChordSheet } from "../../core/chordSheet";
import type { CellsByTrack } from "../../core/types";
import { TrackToggleButton } from "../../editor/App";
import "../../editor/App.css";
import { SongView } from "../../editor/components/SongView";
import { useEditor } from "../../editor/useEditor";

const EXCERPT = `    A           A7     D
Ya nunca te he de olvidar
       E7           A
en la arena me escribias
             A7    D
El viento lo fue borrando
    B7      E7              A
y estoy mas solo mirando el mar.`;

/** The editor itself, populated through the same chord-sheet parser used when pasting a song. */
export function ArticleChordEditor() {
  const initialContent = useMemo(() => {
    const { lyricsText, placements } = parseChordSheet(EXCERPT);
    const song = buildSong(lyricsText);
    const cells: CellsByTrack = { chords: {} };
    for (const placement of placements) {
      const line = song[placement.lineIndex];
      const lyricLine = lyricsText.split("\n")[placement.lineIndex];
      if (!line || lyricLine === undefined) continue;
      cells.chords![chordSlotForColumn(line, lyricLine, placement.column)] = placement.chord;
    }
    return {
      title: "Tonada de un viejo amor",
      author: "",
      lyricsText,
      song,
      cells,
      chordVariants: {},
      pitchDirections: {},
      merges: new Set<string>(),
    };
  }, []);
  const { state, actions } = useEditor(initialContent, false);

  return (
    <div className="app" aria-label="Editor de acordes de ejemplo">
      <aside className="track-toolbar" aria-label="Visibilidad de pistas">
        {state.tracks
          .filter((track) => track.id !== "vocalNotes")
          .map((track) => (
            <TrackToggleButton
              key={track.id}
              track={track}
              cells={state.cells}
              onToggle={() => actions.setTrackVisibility(track.id, !track.visible)}
            />
          ))}
      </aside>
      <SongView
        song={state.song}
        lyricsText={state.lyricsText}
        merges={state.merges}
        tracks={state.tracks}
        cells={state.cells}
        chordVariants={state.chordVariants}
        pitchDirections={state.pitchDirections}
        showUnderline={state.showUnderline}
        canEdit
        onSetCellText={actions.setCellText}
        onSetChordVariant={actions.setChordVariant}
        onToggleMerge={actions.toggleSyllableMerge}
        onMoveCellText={actions.moveCellText}
        onDragPitchDirection={actions.dragPitchDirection}
        onReconcileLyricsText={actions.reconcileLyricsText}
        onPasteText={actions.pasteText}
      />
    </div>
  );
}
