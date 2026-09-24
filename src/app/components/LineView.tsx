import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { getLineCellSlots, getLineUnits, mergeKey } from "../../core/model";
import { createResyllabifyCoordinator } from "../../core/resyllabifyCoordinator";
import type { CellsByTrack, Line, TrackDef, TrackId, Word } from "../../core/types";
import { TrackRow, type CellDragHandlers } from "./TrackRow";

interface SyllableGapButtonProps {
  merged: boolean;
  wordBoundary?: boolean;
  fromText: string;
  toText: string;
  onToggle: () => void;
}

/** The clickable gap between two adjacent syllables that toggles a melisma merge. */
function SyllableGapButton({ merged, wordBoundary = false, fromText, toText, onToggle }: SyllableGapButtonProps) {
  return (
    <button
      type="button"
      className={"syllable-gap" + (merged ? " syllable-gap--merged" : wordBoundary ? " syllable-gap--word-boundary" : "")}
      aria-pressed={merged}
      aria-label={merged ? `Separar sílabas "${fromText}" y "${toText}"` : `Unir sílabas "${fromText}" y "${toText}"`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    />
  );
}

interface LineViewProps {
  line: Line;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onMoveCellText: (trackId: TrackId, fromSlotId: string, toSlotId: string) => void;
  onResyllabify: (lineId: string, wordId: string, text: string) => void;
}

interface WordEditorProps {
  lineId: string;
  word: Word;
  merges: ReadonlySet<string>;
  mergedIds: ReadonlySet<string>;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onResyllabify: (lineId: string, wordId: string, text: string) => void;
}

function WordEditor({ lineId, word, merges, mergedIds, onToggleMerge, onResyllabify }: WordEditorProps) {
  const [editing, setEditing] = useState(false);

  const originalText = word.syllables.map((s) => s.text).join("");
  const [inputValue, setInputValue] = useState(originalText);

  useEffect(() => {
    setInputValue(originalText);
  }, [originalText]);

  const valueRef = useRef(inputValue);
  valueRef.current = inputValue;

  const coordinator = useMemo(() => {
    return createResyllabifyCoordinator(() => {
      const text = valueRef.current.trim();
      if (text) {
        onResyllabify(lineId, word.id, text);
      }
    });
  }, [lineId, word.id, onResyllabify]);

  useEffect(() => () => coordinator.dispose(), [coordinator]);

  function startEditing() {
    setEditing(true);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      coordinator.notifyWordBoundary();
      setEditing(false);
    } else if (event.key === "Escape") {
      setInputValue(originalText);
      setEditing(false);
    }
  }

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const val = event.target.value;
    if (val.endsWith(" ") || val.endsWith("\n")) {
      setInputValue(val.trim());
      coordinator.notifyWordBoundary();
      setEditing(false);
    } else {
      setInputValue(val);
      coordinator.notifyKeystroke();
    }
  }

  function handleBlur() {
    setEditing(false);
  }

  if (editing) {
    return (
      <input
        className="track-cell--input"
        style={{
          fontSize: "inherit",
          width: `${Math.max(2, inputValue.length)}ch`,
          padding: 0,
          margin: 0,
          border: "none",
          borderBottom: "3px solid var(--border-strong)",
          background: "transparent",
          color: "inherit",
          outline: "none",
          textAlign: "center",
        }}
        autoFocus
        value={inputValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
    );
  }

  return (
    <span style={{ display: "contents", cursor: "text" }} onClick={startEditing}>
      {word.syllables.map((syllable, index) => {
        const prev = index > 0 ? word.syllables[index - 1] : null;
        const merged = prev ? merges.has(mergeKey(prev.id, syllable.id)) : false;

        return (
          <Fragment key={syllable.id}>
            {prev ? (
              <SyllableGapButton
                merged={merged}
                fromText={prev.text}
                toText={syllable.text}
                onToggle={() => onToggleMerge(lineId, prev.id, syllable.id)}
              />
            ) : null}
            <span className={"syllable" + (mergedIds.has(syllable.id) ? " syllable--merged" : "")}>
              {syllable.text}
            </span>
          </Fragment>
        );
      })}
    </span>
  );
}

export function LineView({
  line,
  merges,
  tracks,
  cells,
  onSetCellText,
  onToggleMerge,
  onMoveCellText,
  onResyllabify,
}: LineViewProps) {
  const slotIds = getLineCellSlots(line, merges);

  const mergedIds = new Set<string>();
  for (const unit of getLineUnits(line, merges)) {
    if (unit.syllableIds.length > 1) {
      for (const id of unit.syllableIds) mergedIds.add(id);
    }
  }

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

  return (
    <div className={"line" + (isDragging ? " line--dragging" : "")}>
      {tracks
        .filter((track) => track.visible)
        .map((track) => {
          const drag: CellDragHandlers = {
            draggedSlotId: dragSource && dragSource.trackId === track.id ? dragSource.slotId : null,
            dropTargetSlotId: dropTarget && dropTarget.trackId === track.id ? dropTarget.slotId : null,
            onDragStart: (slotId) => handleDragStart(track.id, slotId),
            onDragEnd: handleDragEnd,
            onDragEnter: (slotId) => handleDragEnterCell(track.id, slotId),
            onDragLeave: (slotId) => handleDragLeaveCell(track.id, slotId),
            onDrop: (slotId) => handleDropCell(track.id, slotId),
          };
          return (
            <TrackRow
              key={track.id}
              trackId={track.id}
              label={track.label}
              slotIds={slotIds}
              cells={cells}
              onSetCellText={onSetCellText}
              drag={drag}
            />
          );
        })}
      <div className="syllable-row" role="row">
        {line.words.map((word, wIndex) => {
          const firstSyllable = word.syllables[0];
          const prevWord = wIndex > 0 ? line.words[wIndex - 1] : null;
          const prevSyllable = prevWord ? prevWord.syllables[prevWord.syllables.length - 1] : null;

          return (
            <Fragment key={word.id}>
              {prevSyllable && firstSyllable ? (
                <SyllableGapButton
                  merged={merges.has(mergeKey(prevSyllable.id, firstSyllable.id))}
                  wordBoundary
                  fromText={prevSyllable.text}
                  toText={firstSyllable.text}
                  onToggle={() => onToggleMerge(line.id, prevSyllable.id, firstSyllable.id)}
                />
              ) : null}
              <WordEditor
                lineId={line.id}
                word={word}
                merges={merges}
                mergedIds={mergedIds}
                onToggleMerge={onToggleMerge}
                onResyllabify={onResyllabify}
              />
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}
