import { Fragment, useLayoutEffect, useRef, useState } from "react";
import { chordToNoteNames } from "../../core/chordNotes";
import { endSlotId, getLineCellSlots, getLineUnits, mergeKey } from "../../core/model";
import { getCell } from "../../core/state";
import type { CellsByTrack, Line, TrackDef, TrackId } from "../../core/types";
import { requiredAnnotationGap } from "./annotationSpacing";
import { ChordNotesRow } from "./ChordNotesRow";
import { TrackRow, type CellDragHandlers } from "./TrackRow";

interface SyllableGapButtonProps {
  merged: boolean;
  wordBoundary?: boolean;
  dropTarget?: boolean;
  fromText: string;
  toText: string;
  annotationGap?: number;
  onToggle: () => void;
}

/** The clickable gap between two adjacent syllables that toggles a melisma merge. */
function SyllableGapButton({
  merged,
  wordBoundary = false,
  dropTarget = false,
  fromText,
  toText,
  annotationGap = 0,
  onToggle,
}: SyllableGapButtonProps) {
  return (
    <button
      type="button"
      contentEditable={false}
      className={
        "syllable-gap" +
        (wordBoundary ? " syllable-gap--word-boundary" : "") +
        (merged ? " syllable-gap--merged" : "") +
        (dropTarget ? " syllable-gap--drop-target" : "")
      }
      aria-pressed={merged}
      aria-label={merged ? `Separar sílabas "${fromText}" y "${toText}"` : `Unir sílabas "${fromText}" y "${toText}"`}
      style={{ "--annotation-gap": `${annotationGap}px` } as React.CSSProperties}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    />
  );
}

interface DragCell {
  trackId: TrackId;
  slotId: string;
}

interface LineViewProps {
  line: Line;
  /** Whitespace at the end of the raw lyric line, which the syllable model does not retain. */
  trailingWhitespace: string;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  previousChordNotes: ReadonlyMap<string, string[]>;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  dragSource: DragCell | null;
  dropTarget: DragCell | null;
  onDragStartCell: (trackId: TrackId, slotId: string) => void;
  onDragEndCell: () => void;
  onDragEnterCell: (trackId: TrackId, slotId: string) => void;
  onDragLeaveCell: (trackId: TrackId, slotId: string) => void;
  onDropCell: (trackId: TrackId, slotId: string) => void;
}

export function LineView({
  line,
  trailingWhitespace,
  merges,
  tracks,
  cells,
  previousChordNotes,
  onSetCellText,
  onToggleMerge,
  dragSource,
  dropTarget,
  onDragStartCell,
  onDragEndCell,
  onDragEnterCell,
  onDragLeaveCell,
  onDropCell,
}: LineViewProps) {
  const slotIds = getLineCellSlots(line, merges);
  const units = getLineUnits(line, merges);
  const chordsVisible = tracks.some((track) => track.id === "chords" && track.visible);

  const mergedIds = new Set<string>();
  for (const unit of units) {
    if (unit.syllableIds.length > 1) {
      for (const id of unit.syllableIds) mergedIds.add(id);
    }
  }

  const syllableEls = useRef(new Map<string, HTMLElement>());
  const syllableRowRef = useRef<HTMLDivElement>(null);
  const [slotRects, setSlotRects] = useState<Record<string, { left: number; width: number }>>({});
  const [annotationGapExtras, setAnnotationGapExtras] = useState<Record<string, number>>({});
  const annotationSpacingKeyRef = useRef<string | null>(null);
  const annotationSpacingKey = tracks
    .filter((track) => track.visible)
    .map((track) => `${track.id}:${units.map((unit) => getCell(cells, track.id, unit.slotId)).join("\u0001")}`)
    .join("\u0002");

  function registerSyllableRef(syllableId: string, el: HTMLElement | null) {
    if (el) syllableEls.current.set(syllableId, el);
    else syllableEls.current.delete(syllableId);
  }

  useLayoutEffect(() => {
    function measure() {
      const rowEl = syllableRowRef.current;
      if (!rowEl) return;
      // Track rows are unpadded `position: relative` boxes, so an absolutely positioned cell's
      // `left: 0` lands flush with the row's own border edge — the same edge as this row's.
      const rowsLeft = rowEl.getBoundingClientRect().left;

      const next: Record<string, { left: number; width: number }> = {};
      let lastRight = rowsLeft;
      for (const unit of units) {
        const firstEl = syllableEls.current.get(unit.syllableIds[0]);
        const lastEl = syllableEls.current.get(unit.syllableIds[unit.syllableIds.length - 1]);
        if (!firstEl || !lastEl) continue;
        const a = firstEl.getBoundingClientRect();
        const b = lastEl.getBoundingClientRect();
        next[unit.slotId] = {
          left: Math.round(a.left - rowsLeft),
          width: Math.max(6, Math.round(b.right - a.left)),
        };
        lastRight = b.right;
      }
      next[endSlotId(line.id)] = { left: Math.round(lastRight - rowsLeft), width: 14 };
      setSlotRects(next);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // chordsVisible is a dependency because it toggles `.line--chords-hidden`, which changes the
    // rendered width of word-boundary gaps (see App.css) — without it, showing/hiding the chords
    // track after text already exists leaves every annotation position stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, merges, annotationGapExtras, chordsVisible]);

  useLayoutEffect(() => {
    // A changed label or merge gets a fresh measurement from the unexpanded lyric layout.
    if (annotationSpacingKeyRef.current !== annotationSpacingKey) {
      annotationSpacingKeyRef.current = annotationSpacingKey;
      if (Object.keys(annotationGapExtras).length > 0) {
        setAnnotationGapExtras({});
        return;
      }
    }

    const rowEl = syllableRowRef.current;
    const lineEl = rowEl?.parentElement;
    if (!rowEl || !lineEl) return;

    const labelWidths = new Map<string, number>();
    for (const track of tracks) {
      if (!track.visible) continue;
      const cellsInTrack = Array.from(lineEl.querySelectorAll<HTMLElement>(`[data-track="${track.id}"] [data-slot-id]`));
      for (const unit of units) {
        if (!getCell(cells, track.id, unit.slotId)) continue;
        const cellEl = cellsInTrack.find((cell) => cell.dataset.slotId === unit.slotId);
        if (!cellEl) continue;
        const range = document.createRange();
        range.selectNodeContents(cellEl);
        const width = Math.ceil(range.getBoundingClientRect().width);
        labelWidths.set(unit.slotId, Math.max(labelWidths.get(unit.slotId) ?? 0, width));
      }
    }

    const next = { ...annotationGapExtras };
    for (let index = 0; index < units.length - 1; index++) {
      const unit = units[index]!;
      const nextUnit = units[index + 1]!;
      const width = labelWidths.get(unit.slotId);
      const firstEl = syllableEls.current.get(unit.syllableIds[0]);
      const nextFirstEl = syllableEls.current.get(nextUnit.syllableIds[0]);
      // A bare next syllable has no label to protect — widening the gap here would only
      // separate the lyrics, not prevent any annotation from overlapping another one.
      if (!width || !firstEl || !nextFirstEl || !labelWidths.has(nextUnit.slotId)) continue;
      const distance = nextFirstEl.getBoundingClientRect().left - firstEl.getBoundingClientRect().left;
      const additional = requiredAnnotationGap(width, distance);
      if (additional > 0) next[unit.slotId] = (next[unit.slotId] ?? 0) + additional;
    }

    const changed = Object.keys(next).some((key) => next[key] !== annotationGapExtras[key]);
    if (changed) setAnnotationGapExtras(next);
  }, [annotationGapExtras, annotationSpacingKey, cells, tracks, units]);

  const isDragging = dragSource !== null;

  // The slot being dragged over may belong to this line (or another one, since a chord can be
  // dragged across lines) — only highlight this line's syllables when it's ours to show.
  const dropTargetUnit = dropTarget ? units.find((unit) => unit.slotId === dropTarget.slotId) : undefined;
  const dropTargetSyllableIds = new Set(dropTargetUnit?.syllableIds ?? []);

  // Every syllable in a unit doubles as that unit's dropzone, so hovering the underlined word
  // text (not just the narrow annotation cell above it) is enough to drop a chord there.
  const syllableSlotId = new Map<string, string>();
  for (const unit of units) {
    for (const syllableId of unit.syllableIds) syllableSlotId.set(syllableId, unit.slotId);
  }

  function syllableDragProps(syllableId: string) {
    if (!dragSource) return undefined;
    const slotId = syllableSlotId.get(syllableId);
    if (slotId === undefined) return undefined;
    const trackId = dragSource.trackId;
    return {
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDragEnter: () => onDragEnterCell(trackId, slotId),
      onDragLeave: () => onDragLeaveCell(trackId, slotId),
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        onDropCell(trackId, slotId);
      },
    };
  }

  function renderTrackRow(track: TrackDef) {
    if (track.id === "chordNotes") {
      // This derived, read-only row is up to four notes tall. Do not reserve that vertical space
      // until this particular lyric line has an actual chord to describe.
      if (!slotIds.some((slotId) => chordToNoteNames(getCell(cells, "chords", slotId)))) {
        return null;
      }
      return (
        <div key={track.id} contentEditable={false}>
          <ChordNotesRow
            label={track.label}
            slotIds={slotIds}
            slotRects={slotRects}
            cells={cells}
            previousChordNotes={previousChordNotes}
          />
        </div>
      );
    }
    const drag: CellDragHandlers = {
      draggedSlotId: dragSource && dragSource.trackId === track.id ? dragSource.slotId : null,
      onDragStart: (slotId) => onDragStartCell(track.id, slotId),
      onDragEnd: onDragEndCell,
      onDragEnter: (slotId) => onDragEnterCell(track.id, slotId),
      onDragLeave: (slotId) => onDragLeaveCell(track.id, slotId),
      onDrop: (slotId) => onDropCell(track.id, slotId),
    };
    return (
      <div key={track.id} contentEditable={false}>
        <TrackRow
          trackId={track.id}
          label={track.label}
          slotIds={slotIds}
          slotRects={slotRects}
          cells={cells}
          onSetCellText={onSetCellText}
          drag={drag}
        />
      </div>
    );
  }

  return (
    <div
      className={
        "line" + (isDragging ? " line--dragging" : "") + (!chordsVisible ? " line--chords-hidden" : "")
      }
    >
      {tracks
        .filter((track) => track.visible && track.id !== "vocalNotes")
        .map(renderTrackRow)}
      <div className="syllable-row" role="textbox" data-lyrics-line ref={syllableRowRef}>
        {/* A leading text node gives Chrome a stable, visible caret position before the first
            lyric glyph. It is excluded from the document model. */}
        <span data-empty-line-caret aria-hidden="true">{"\u200B"}</span>
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
                  dropTarget={
                    dropTargetSyllableIds.has(prevSyllable.id) && dropTargetSyllableIds.has(firstSyllable.id)
                  }
                  fromText={prevSyllable.text}
                  toText={firstSyllable.text}
                  annotationGap={
                    syllableSlotId.get(prevSyllable.id) === syllableSlotId.get(firstSyllable.id)
                      ? 0
                      : annotationGapExtras[syllableSlotId.get(prevSyllable.id) ?? ""]
                  }
                  onToggle={() => onToggleMerge(line.id, prevSyllable.id, firstSyllable.id)}
                />
              ) : null}
              {word.syllables.map((syllable, index) => {
                const previous = index > 0 ? word.syllables[index - 1] : null;
                const merged = previous ? merges.has(mergeKey(previous.id, syllable.id)) : false;
                return (
                  <Fragment key={syllable.id}>
                    {previous ? (
                      <SyllableGapButton
                        merged={merged}
                        dropTarget={
                          dropTargetSyllableIds.has(previous.id) && dropTargetSyllableIds.has(syllable.id)
                        }
                        fromText={previous.text}
                        toText={syllable.text}
                        annotationGap={
                          syllableSlotId.get(previous.id) === syllableSlotId.get(syllable.id)
                            ? 0
                            : annotationGapExtras[syllableSlotId.get(previous.id) ?? ""]
                        }
                        onToggle={() => onToggleMerge(line.id, previous.id, syllable.id)}
                      />
                    ) : null}
                    <span
                      ref={(el) => registerSyllableRef(syllable.id, el)}
                      className={
                        "syllable" +
                        (Array.from(syllable.text).length === 1 ? " syllable--single-letter" : "") +
                        (mergedIds.has(syllable.id) ? " syllable--merged" : "") +
                        (dropTargetSyllableIds.has(syllable.id) ? " syllable--drop-target" : "")
                      }
                      {...syllableDragProps(syllable.id)}
                    >
                      {syllable.text}
                    </span>
                  </Fragment>
                );
              })}
            </Fragment>
          );
        })}
        {/* Keep a React-owned caret anchor after a trailing space. Without it, the model drops
            that space while syllabifying and the next typed word is appended to the previous one. */}
        {trailingWhitespace.replaceAll(/\s/g, "\u00a0")}
      </div>
      {tracks
        .filter((track) => track.visible && track.id === "vocalNotes")
        .map(renderTrackRow)}
    </div>
  );
}
