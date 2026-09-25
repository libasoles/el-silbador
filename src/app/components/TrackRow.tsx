import { useLayoutEffect, useRef, useState } from "react";
import { getCell } from "../../core/state";
import type { CellsByTrack, TrackId } from "../../core/types";
import { TrackCell } from "./TrackCell";

/** However tight a lyric's syllables sit, two annotation labels (chords/notes) must never touch. */
const MIN_LABEL_GAP_PX = 4;
/** Rough stand-in for the cell's horizontal padding (`.track-cell`'s `padding: 0 0.1rem`), so a
    label's measured text width isn't butted right up against its neighbor. */
const LABEL_PADDING_PX = 4;

let measureCanvas: HTMLCanvasElement | null = null;
function measureTextWidth(text: string, font: string): number {
  if (!measureCanvas) measureCanvas = document.createElement("canvas");
  const ctx = measureCanvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(text).width;
}

/** The closest non-decreasing sequence to `targets`, by total squared deviation — found via
    pool-adjacent-violators. Used below to push overlapping label centers apart while disturbing
    already-clear ones as little as possible. */
function isotonicNonDecreasing(targets: number[]): number[] {
  const blockValue: number[] = [];
  const blockCount: number[] = [];
  for (const target of targets) {
    let value = target;
    let count = 1;
    while (blockValue.length > 0 && blockValue[blockValue.length - 1] > value) {
      const prevValue = blockValue.pop()!;
      const prevCount = blockCount.pop()!;
      value = (value * count + prevValue * prevCount) / (count + prevCount);
      count += prevCount;
    }
    blockValue.push(value);
    blockCount.push(count);
  }
  const result: number[] = [];
  for (let i = 0; i < blockValue.length; i++) {
    for (let j = 0; j < blockCount[i]; j++) result.push(blockValue[i]);
  }
  return result;
}

/** Nudges label centers apart just enough that neighboring labels' rendered text never overlaps,
    while staying as close as possible to each label's syllable-anchored center. A label with
    room to spare keeps its anchored position untouched. */
function declutterCenters(anchors: number[], minGaps: number[], minFirstCenter: number): number[] {
  const cumGap: number[] = [0];
  for (let i = 1; i < anchors.length; i++) cumGap.push(cumGap[i - 1] + minGaps[i]);
  const targets = anchors.map((anchor, i) => anchor - cumGap[i]);
  const centers = isotonicNonDecreasing(targets).map((value, i) => value + cumGap[i]);

  // The isotonic solve above has no left boundary, so a long run of wide labels near the start
  // of a line can, in principle, pull the first one's center left of the row itself. Clamp
  // forward from a hard floor — this only ever pushes labels further apart, never closer, so it
  // can't reintroduce an overlap the solve already resolved.
  let prev = -Infinity;
  for (let i = 0; i < centers.length; i++) {
    const floor = i === 0 ? minFirstCenter : prev + minGaps[i];
    if (centers[i] < floor) centers[i] = floor;
    prev = centers[i];
  }
  return centers;
}

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
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  drag: CellDragHandlers;
}

export function TrackRow({ trackId, label, slotIds, slotRects, cells, onSetCellText, drag }: TrackRowProps) {
  const cellRefs = useRef<Array<HTMLElement | null>>([]);
  const [declutteredLefts, setDeclutteredLefts] = useState<Record<string, number>>({});

  function focusIndex(index: number) {
    const clamped = Math.max(0, Math.min(slotIds.length - 1, index));
    cellRefs.current[clamped]?.focus();
  }

  useLayoutEffect(() => {
    const font = cellRefs.current.reduce<string | null>(
      (found, el) => found ?? (el ? window.getComputedStyle(el).font : null),
      null,
    );
    if (!font) return;

    const rects = slotIds.map((slotId) => slotRects[slotId]);
    if (rects.some((rect) => rect === undefined)) return;

    const anchors = rects.map((rect) => rect!.left + rect!.width / 2);
    const halfWidths = slotIds.map((slotId, index) => {
      const text = getCell(cells, trackId, slotId);
      const textWidth = text ? measureTextWidth(text, font) + LABEL_PADDING_PX : 0;
      return Math.max(textWidth, rects[index]!.width) / 2;
    });
    const minGaps = halfWidths.map((halfWidth, index) =>
      index === 0 ? 0 : halfWidth + halfWidths[index - 1] + MIN_LABEL_GAP_PX,
    );
    const centers = declutterCenters(anchors, minGaps, halfWidths[0]);

    const next: Record<string, number> = {};
    slotIds.forEach((slotId, index) => {
      next[slotId] = centers[index] - rects[index]!.width / 2;
    });
    setDeclutteredLefts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotIds, slotRects, cells, trackId]);

  return (
    <div className="track-row" data-track={trackId} role="row" aria-label={label}>
      {slotIds.map((slotId, index) => {
        const value = getCell(cells, trackId, slotId);
        const rect = slotRects[slotId];
        const left = declutteredLefts[slotId] ?? rect?.left;
        return (
          <TrackCell
            key={slotId}
            value={value}
            left={left}
            width={rect?.width}
            onChange={(text) => onSetCellText(trackId, slotId, text)}
            onNavigate={(direction) => focusIndex(index + (direction === "next" ? 1 : -1))}
            registerRef={(el) => {
              cellRefs.current[index] = el;
            }}
            draggable={value.length > 0}
            isDragging={drag.draggedSlotId === slotId}
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
