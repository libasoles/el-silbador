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
  draggedSlotId: string | null;
  dropTargetSlotId: string | null;
  onCellDragStart: (slotId: string) => void;
  onCellDragEnd: () => void;
  onCellDragEnter: (slotId: string) => void;
  onCellDragLeave: (slotId: string) => void;
  onCellDrop: (slotId: string) => void;
}

export function TrackRow({
  trackId,
  label,
  slotIds,
  cells,
  onSetCellText,
  draggedSlotId,
  dropTargetSlotId,
  onCellDragStart,
  onCellDragEnd,
  onCellDragEnter,
  onCellDragLeave,
  onCellDrop,
}: TrackRowProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([]);

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(slotIds.length - 1, index));
    cellRefs.current[clamped]?.focus();
  }

  return (
    <div className="track-row" data-track={trackId} role="row">
      <span className="track-row__label">{label}</span>
      {slotIds.map((slotId, index) => {
        const value = getCell(cells, trackId, slotId);
        return (
          <TrackCell
            key={slotId}
            value={value}
            onChange={(text) => onSetCellText(trackId, slotId, text)}
            onNavigate={(direction) => focusIndex(index + (direction === "next" ? 1 : -1))}
            registerRef={(el) => {
              cellRefs.current[index] = el;
            }}
            draggable={value.length > 0}
            isDragging={draggedSlotId === slotId}
            isDropTarget={dropTargetSlotId === slotId}
            onDragStart={() => onCellDragStart(slotId)}
            onDragEnd={onCellDragEnd}
            onDragEnter={() => onCellDragEnter(slotId)}
            onDragLeave={() => onCellDragLeave(slotId)}
            onDrop={() => onCellDrop(slotId)}
          />
        );
      })}
    </div>
  );
}
