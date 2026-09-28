"use client";

import { SongView } from "../../../editor/components/SongView";
import type { EditorState } from "../../../core/types";

const noop = () => {};

/** Read-only rendering of a public song's content, shared by the server-rendered HTML (for SEO
 *  and anonymous visitors) and the client's own first paint before it knows whether the visitor
 *  is signed in. `SongView` already supports a fully read-only mode via `canEdit={false}` — see
 *  its doc comment — so this just wires that up with no-op write callbacks instead of building a
 *  separate display-only component. */
export function StaticSongView({ state }: { state: EditorState }) {
  return (
    <SongView
      song={state.song}
      lyricsText={state.lyricsText}
      merges={state.merges}
      tracks={state.tracks}
      cells={state.cells}
      chordVariants={state.chordVariants}
      showUnderline={state.showUnderline}
      canEdit={false}
      onSetCellText={noop}
      onSetChordVariant={noop}
      onToggleMerge={noop}
      onMoveCellText={noop}
      onReconcileLyricsText={noop}
      onPasteText={noop}
    />
  );
}
