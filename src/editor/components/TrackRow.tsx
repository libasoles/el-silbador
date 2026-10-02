import { useRef } from "react";
import { getCell } from "../../core/state";
import type { CellsByTrack, TrackId } from "../../core/types";
import { layoutAnnotationLabels } from "./annotationLayout";
import { TrackCell } from "./TrackCell";

/** A track row's cell drag & drop wiring, bundled so it travels as one prop instead of five. */
export interface CellDragHandlers {
  draggedSlotId: string | null;
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
  chordVariants: Record<string, number>;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onSetChordVariant: (slotId: string, index: number) => void;
  drag: CellDragHandlers;
  readOnly?: boolean;
  /** Melody notes must not be visible until their absolutely-positioned slots are measured. */
  annotationsReady?: boolean;
}

export function TrackRow({
  trackId,
  label,
  slotIds,
  slotRects,
  cells,
  chordVariants,
  onSetCellText,
  onSetChordVariant,
  drag,
  readOnly = false,
  annotationsReady = true,
}: TrackRowProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([]);
  const rects = slotIds.map((slotId) => slotRects[slotId]);
  const annotationLefts = rects.every((rect) => rect !== undefined)
    ? layoutAnnotationLabels(rects as { left: number; width: number }[])
    : [];

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(slotIds.length - 1, index));
    cellRefs.current[clamped]?.focus();
  }

  return (
    <div
      className={"track-row" + (trackId === "vocalNotes" && annotationsReady ? " track-row--annotations-ready" : "")}
      data-track={trackId}
      role="row"
      aria-label={label}
    >
      {slotIds.map((slotId, index) => {
        const value = getCell(cells, trackId, slotId);
        const rect = slotRects[slotId];
        const left = annotationLefts[index] ?? rect?.left;
        return (
          <TrackCell
            key={slotId}
            slotId={slotId}
            value={value}
            left={left}
            width={rect?.width}
            onChange={(text) => onSetCellText(trackId, slotId, text)}
            onNavigate={(direction) => focusIndex(index + (direction === "next" ? 1 : -1))}
            registerRef={(el) => {
              cellRefs.current[index] = el;
            }}
            showChordDiagram={trackId === "chords"}
            chordVariantIndex={chordVariants[slotId] ?? 0}
            onChangeChordVariant={(nextIndex) => onSetChordVariant(slotId, nextIndex)}
            draggable={value.length > 0 && !readOnly}
            isDragging={drag.draggedSlotId === slotId}
            onDragStart={() => drag.onDragStart(slotId)}
            onDragEnd={drag.onDragEnd}
            onDragEnter={() => drag.onDragEnter(slotId)}
            onDragLeave={() => drag.onDragLeave(slotId)}
            onDrop={() => drag.onDrop(slotId)}
            readOnly={readOnly}
            revealIndex={trackId === "vocalNotes" ? index : undefined}
          />
        );
      })}
    </div>
  );
}
