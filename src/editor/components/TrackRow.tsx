import { useRef } from "react";
import { getCell } from "../../core/state";
import type { CellsByTrack, PitchDirection, TrackId } from "../../core/types";
import type { DragDelta } from "../pitchDragGesture";
import { findChordShape } from "../../core/findChordShape";
import { layoutAnnotationLabels } from "./annotationLayout";
import { chordTapAreas, type TapAreaReach } from "./chordTapArea";
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
  /** Where each slot sits on the lyric line ("sobre «na»"), so each cell can be named for a screen reader. */
  slotPositions: ReadonlyMap<string, string>;
  readOnly?: boolean;
  /** Annotation rows must not be visible until their absolutely-positioned slots are measured. */
  annotationsReady?: boolean;
}

/** The accessible name of a cell: its track, what it holds (or the action it offers when empty)
 *  and where it sits on the line. */
function cellLabel(trackId: TrackId, value: string, position: string): string {
  const noun = trackId === "chords" ? "acorde" : "nota";
  const text = value.trim();
  if (text === "") return `Agregar ${noun} ${position}`;
  return `${noun === "acorde" ? "Acorde" : "Nota"} ${text} ${position}`;
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
  slotPositions,
  readOnly = false,
  annotationsReady = true,
}: TrackRowProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([]);
  const rects = slotIds.map((slotId) => slotRects[slotId]);
  const hasContent = slotIds.some((slotId) => getCell(cells, trackId, slotId).trim() !== "");
  const annotationLefts = rects.every((rect) => rect !== undefined)
    ? layoutAnnotationLabels(rects as { left: number; width: number }[])
    : [];
  const tapReaches = readOnly && trackId === "chords" ? readOnlyChordTapReaches() : new Map<string, TapAreaReach>();

  /** While reading, only chords with a diagram can be tapped. Each gets a tap area wider than its
   *  glyph, so a finger on a phone hits it instead of the empty space beside it. */
  function readOnlyChordTapReaches() {
    const tappable = slotIds.flatMap((slotId, index) => {
      const rect = slotRects[slotId];
      if (!rect || !findChordShape(getCell(cells, trackId, slotId))) return [];
      return [{ slotId, left: annotationLefts[index] ?? rect.left, width: rect.width }];
    });
    const reaches = chordTapAreas(tappable);
    return new Map(tappable.map(({ slotId }, i) => [slotId, reaches[i]]));
  }

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(slotIds.length - 1, index));
    cellRefs.current[clamped]?.focus();
  }

  /** Tab walks the cells of this track only, continuing onto the next verse's row of the same
   *  track, instead of falling through to whatever focusable element comes next in the page. */
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || readOnly || event.metaKey || event.ctrlKey || event.altKey) return;
    const cells = Array.from(
      document.querySelectorAll<HTMLElement>(`[data-track="${trackId}"] [data-slot-id]`),
    );
    const current = cells.indexOf(event.target as HTMLElement);
    if (current === -1) return;
    const next = cells[current + (event.shiftKey ? -1 : 1)];
    if (!next) return;
    event.preventDefault();
    next.focus();
  }

  return (
    <>
    <div
      onKeyDown={handleKeyDown}
      className={"track-row" + (annotationsReady ? " track-row--annotations-ready" : "")}
      data-track={trackId}
      data-empty={!hasContent}
      role="group"
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
            label={cellLabel(trackId, value, slotPositions.get(slotId) ?? "")}
            left={left}
            width={rect?.width}
            tapReach={tapReaches.get(slotId)}
            onChange={(text) => onSetCellText(trackId, slotId, text)}
            onNavigate={(direction) => focusIndex(index + (direction === "next" ? 1 : -1))}
            registerRef={(el) => {
              cellRefs.current[index] = el;
            }}
            showChordDiagram={trackId === "chords"}
            lowercase={trackId === "vocalNotes"}
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
