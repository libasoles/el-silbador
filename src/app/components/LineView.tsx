import { Fragment, useState } from "react";
import { flattenSyllables, getLineCellSlots, getLineUnits, mergeKey } from "../../core/model";
import type { CellsByTrack, Line, TrackDef, TrackId } from "../../core/types";
import { TrackRow } from "./TrackRow";

interface LineViewProps {
  line: Line;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onMoveCellText: (trackId: TrackId, fromSlotId: string, toSlotId: string) => void;
}

export function LineView({
  line,
  merges,
  tracks,
  cells,
  onSetCellText,
  onToggleMerge,
  onMoveCellText,
}: LineViewProps) {
  const slotIds = getLineCellSlots(line, merges);
  const flat = flattenSyllables(line);

  const [dragSource, setDragSource] = useState<{ trackId: TrackId; slotId: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<{ trackId: TrackId; slotId: string } | null>(null);
  const isDragging = dragSource !== null;

  function handleDragStart(trackId: TrackId, slotId: string) {
    setDragSource({ trackId, slotId });
  }

  function handleDragEnd() {
    setDragSource(null);
    setDropTarget(null);
  }

  function handleDragEnterCell(trackId: TrackId, slotId: string) {
    if (!dragSource || dragSource.trackId !== trackId) return;
    setDropTarget({ trackId, slotId });
  }

  function handleDragLeaveCell(trackId: TrackId, slotId: string) {
    setDropTarget((current) =>
      current && current.trackId === trackId && current.slotId === slotId ? null : current,
    );
  }

  function handleDropCell(trackId: TrackId, slotId: string) {
    if (dragSource && dragSource.trackId === trackId && dragSource.slotId !== slotId) {
      onMoveCellText(trackId, dragSource.slotId, slotId);
    }
    setDragSource(null);
    setDropTarget(null);
  }

  const wordOfSyllable = new Map<string, string>();
  for (const word of line.words) {
    for (const syllable of word.syllables) {
      wordOfSyllable.set(syllable.id, word.id);
    }
  }

  const mergedIds = new Set<string>();
  for (const unit of getLineUnits(line, merges)) {
    if (unit.syllableIds.length > 1) {
      for (const id of unit.syllableIds) mergedIds.add(id);
    }
  }

  return (
    <div className={"line" + (isDragging ? " line--dragging" : "")}>
      {tracks
        .filter((track) => track.visible)
        .map((track) => (
          <TrackRow
            key={track.id}
            trackId={track.id}
            label={track.label}
            slotIds={slotIds}
            cells={cells}
            onSetCellText={onSetCellText}
            draggedSlotId={dragSource && dragSource.trackId === track.id ? dragSource.slotId : null}
            dropTargetSlotId={dropTarget && dropTarget.trackId === track.id ? dropTarget.slotId : null}
            onCellDragStart={(slotId) => handleDragStart(track.id, slotId)}
            onCellDragEnd={handleDragEnd}
            onCellDragEnter={(slotId) => handleDragEnterCell(track.id, slotId)}
            onCellDragLeave={(slotId) => handleDragLeaveCell(track.id, slotId)}
            onCellDrop={(slotId) => handleDropCell(track.id, slotId)}
          />
        ))}
      <div className="syllable-row" role="row">
        {flat.map((syllable, index) => {
          const prev = index > 0 ? flat[index - 1] : null;
          const merged = prev ? merges.has(mergeKey(prev.id, syllable.id)) : false;
          const crossesWord = prev ? wordOfSyllable.get(prev.id) !== wordOfSyllable.get(syllable.id) : false;

          return (
            <Fragment key={syllable.id}>
              {prev ? (
                <button
                  type="button"
                  className={
                    "syllable-gap" +
                    (merged ? " syllable-gap--merged" : "") +
                    (!merged && crossesWord ? " syllable-gap--word-boundary" : "")
                  }
                  aria-pressed={merged}
                  aria-label={
                    merged
                      ? `Separar sílabas "${prev.text}" y "${syllable.text}"`
                      : `Unir sílabas "${prev.text}" y "${syllable.text}"`
                  }
                  onClick={() => onToggleMerge(line.id, prev.id, syllable.id)}
                />
              ) : null}
              <span className={"syllable" + (mergedIds.has(syllable.id) ? " syllable--merged" : "")}>
                {syllable.text}
              </span>
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
