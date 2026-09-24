import type { CellsByTrack, Song, TrackDef, TrackId } from "../../core/types";
import { LineView } from "./LineView";

interface SongViewProps {
  song: Song;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onResyllabify: (lineId: string, wordId: string, text: string) => void;
}

export function SongView({ song, merges, tracks, cells, onSetCellText, onToggleMerge, onResyllabify }: SongViewProps) {
  if (song.length === 0) {
    return <p className="empty-state">Pegá o escribí una letra arriba para empezar.</p>;
  }

  return (
    <div className="song">
      {song.map((line) => (
        <LineView
          key={line.id}
          line={line}
          merges={merges}
          tracks={tracks}
          cells={cells}
          onSetCellText={onSetCellText}
          onToggleMerge={onToggleMerge}
          onResyllabify={onResyllabify}
        />
      ))}
    </div>
  );
}
