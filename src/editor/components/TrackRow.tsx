import { useRef } from "react";
import { getCell } from "../../core/state";
import type { CellsByTrack, PitchDirection, TrackId } from "../../core/types";
import type { DragDelta } from "../pitchDragGesture";
import { layoutAnnotationLabels } from "./annotationLayout";
import { ArrowDownIcon, ArrowUpIcon } from "./icons";
import { TrackCell } from "./TrackCell";

/** A track row's cell drag & drop wiring, bundled so it travels as one prop instead of five. */
export interface CellDragHandlers {
  draggedSlotId: string | null;
  onDragStart: (slotId: string) => void;
  onDragEnd: (slotId: string, delta: DragDelta | null) => void;
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
  /** Only meaningful for the vocal notes track: the indicator shown under each note. */
  pitchDirections?: Record<string, PitchDirection>;
  /** True once any note on the line has an indicator. Until then the arrow row takes no space. */
  reservePitchDirectionRow?: boolean;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onSetChordVariant: (slotId: string, index: number) => void;
  drag: CellDragHandlers;
  readOnly?: boolean;
  /** Annotation rows must not be visible until their absolutely-positioned slots are measured. */
  annotationsReady?: boolean;
}

export function TrackRow({
  trackId,
  label,
  slotIds,
  slotRects,
  cells,
  chordVariants,
  pitchDirections = {},
  reservePitchDirectionRow = false,
  onSetCellText,
  onSetChordVariant,
  drag,
  readOnly = false,
  annotationsReady = true,
}: TrackRowProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([]);
  const rects = slotIds.map((slotId) => slotRects[slotId]);
  const hasContent = slotIds.some((slotId) => getCell(cells, trackId, slotId).trim() !== "");
  const annotationLefts = rects.every((rect) => rect !== undefined)
    ? layoutAnnotationLabels(rects as { left: number; width: number }[])
    : [];

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(slotIds.length - 1, index));
    cellRefs.current[clamped]?.focus();
  }

  return (
    <>
    <div
      className={"track-row" + (annotationsReady ? " track-row--annotations-ready" : "")}
      data-track={trackId}
      data-empty={!hasContent}
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
            onDragEnd={(delta) => drag.onDragEnd(slotId, delta)}
            onDragEnter={() => drag.onDragEnter(slotId)}
            onDragLeave={() => drag.onDragLeave(slotId)}
            onDrop={() => drag.onDrop(slotId)}
            readOnly={readOnly}
            revealIndex={trackId === "vocalNotes" ? index : undefined}
            acceptDropAnywhere={trackId === "vocalNotes"}
          />
        );
      })}
    </div>
    {trackId === "vocalNotes" && reservePitchDirectionRow ? (
      <div className="pitch-direction-row" data-track="pitchDirections">
        {slotIds.map((slotId, index) => {
          const direction = pitchDirections[slotId];
          const rect = slotRects[slotId];
          if (!direction || !rect) return null;
          const Icon = direction === "up" ? ArrowUpIcon : ArrowDownIcon;
          return (
            <span
              key={slotId}
              className="pitch-direction"
              style={{ left: `${annotationLefts[index] ?? rect.left}px` }}
              role="img"
              aria-label={direction === "up" ? "Más agudo que la anterior" : "Más grave que la anterior"}
            >
              <Icon size="1em" strokeWidth={2} aria-hidden="true" />
            </span>
          );
        })}
      </div>
    ) : null}
    </>
  );
}
