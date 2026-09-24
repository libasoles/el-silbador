import { useRef } from "react";
import { getCell } from "../../core/state";
import type { CellsByTrack, TrackId } from "../../core/types";
import { TrackIcon } from "./icons";
import { TrackCell } from "./TrackCell";

/** A track row's cell drag & drop wiring, bundled so it travels as one prop instead of five. */
export interface CellDragHandlers {
  draggedSlotId: string | null;
  dropTargetSlotId: string | null;
  onDragStart: (slotId: string) => void;
  onDragEnd: () => void;
  onDragEnter: (slotId: string) => void;
  onDragLeave: (slotId: string) => void;
  onDrop: (slotId: string) => void;
}

interface TrackRowProps {
  trackId: TrackId;
  label: string;
  slotIds: string[];
  slotRects: Record<string, { left: number; width: number }>;
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  drag: CellDragHandlers;
}

export function TrackRow({ trackId, label, slotIds, slotRects, cells, onSetCellText, drag }: TrackRowProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([]);

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(slotIds.length - 1, index));
    cellRefs.current[clamped]?.focus();
  }

  return (
    <div className="track-row" data-track={trackId} role="row">
      <span className="track-row__label" title={label} aria-label={label}>
        <TrackIcon trackId={trackId} />
      </span>
      {slotIds.map((slotId, index) => {
        const value = getCell(cells, trackId, slotId);
        const rect = slotRects[slotId];
        return (
          <TrackCell
            key={slotId}
            value={value}
            left={rect?.left}
            width={rect?.width}
            onChange={(text) => onSetCellText(trackId, slotId, text)}
            onNavigate={(direction) => focusIndex(index + (direction === "next" ? 1 : -1))}
            registerRef={(el) => {
              cellRefs.current[index] = el;
            }}
            draggable={value.length > 0}
            isDragging={drag.draggedSlotId === slotId}
            isDropTarget={drag.dropTargetSlotId === slotId}
            onDragStart={() => drag.onDragStart(slotId)}
            onDragEnd={drag.onDragEnd}
            onDragEnter={() => drag.onDragEnter(slotId)}
            onDragLeave={() => drag.onDragLeave(slotId)}
            onDrop={() => drag.onDrop(slotId)}
          />
        );
      })}
    </div>
  );
}
