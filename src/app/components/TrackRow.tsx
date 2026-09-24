import { useRef } from "react";
import { getCell } from "../../core/state";
import type { CellsByTrack, TrackId } from "../../core/types";
import { TrackCell } from "./TrackCell";

interface TrackRowProps {
  trackId: TrackId;
  label: string;
  slotIds: string[];
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
}

export function TrackRow({ trackId, label, slotIds, cells, onSetCellText }: TrackRowProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([]);

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(slotIds.length - 1, index));
    cellRefs.current[clamped]?.focus();
  }

  return (
    <div className="track-row" data-track={trackId} role="row">
      <span className="track-row__label">{label}</span>
      {slotIds.map((slotId, index) => (
        <TrackCell
          key={slotId}
          value={getCell(cells, trackId, slotId)}
          onChange={(text) => onSetCellText(trackId, slotId, text)}
          onNavigate={(direction) => focusIndex(index + (direction === "next" ? 1 : -1))}
          registerRef={(el) => {
            cellRefs.current[index] = el;
          }}
        />
      ))}
    </div>
  );
}
