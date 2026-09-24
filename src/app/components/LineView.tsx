import { getLineCellSlots } from "../../core/model";
import type { CellsByTrack, Line, TrackDef, TrackId } from "../../core/types";
import { TrackRow } from "./TrackRow";

interface LineViewProps {
  line: Line;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
}

export function LineView({ line, merges, tracks, cells, onSetCellText }: LineViewProps) {
  const slotIds = getLineCellSlots(line, merges);

  return (
    <div className="line">
      {tracks
        .filter((track) => track.visible)
        .map((track) => (
          <TrackRow
            key={track.id}
            trackId={track.id}
            slotIds={slotIds}
            cells={cells}
            onSetCellText={onSetCellText}
          />
        ))}
      <div className="syllable-row" role="row">
        {line.words.map((word) => (
          <span className="word" key={word.id}>
            {word.syllables.map((syllable, index) => (
              <span className="syllable" key={syllable.id}>
                {index > 0 ? <span className="syllable-gap" aria-hidden="true" /> : null}
                {syllable.text}
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
