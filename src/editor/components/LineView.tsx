import { Fragment, useLayoutEffect, useMemo, useRef, useState } from "react";
import { chordToNoteNames } from "../../core/chordNotes";
import { endSlotIds, gapSlotId, getLineCellSlots, getLineGaps, getLineUnits, mergeKey, startSlotIds } from "../../core/model";
import { getCell } from "../../core/state";
import type { CellsByTrack, Line, TrackDef, TrackId } from "../../core/types";
import { minimumLabelGap, requiredAnnotationGap } from "./annotationSpacing";
import { ChordNotesRow } from "./ChordNotesRow";
import { areSlotRectsReady, edgeDropZoneRect, haveEqualSlotRects, type SlotRect } from "./lineViewLayout";
import { TrackRow, type CellDragHandlers } from "./TrackRow";

interface SyllableGapButtonProps {
  merged: boolean;
  wordBoundary?: boolean;
  dropTarget?: boolean;
  /** This gap is itself the chord slot being dragged over (a word gap, not a melisma bridge). */
  slotDropTarget?: boolean;
  /** Space the previous unit's label and this gap's own label add to the button, so the slot
   *  underline can cover only the slot's own part of it. */
  slotInset?: { before: number; after: number };
  fromText: string;
  toText: string;
  annotationGap?: number;
  disabled: boolean;
  onToggle: () => void;
  buttonRef?: (el: HTMLButtonElement | null) => void;
  /** Present while a chord is being dragged and this gap is a word gap: makes the whole gap a
   *  dropzone for its slot, like the syllables around it. */
  dragProps?: Pick<React.DOMAttributes<HTMLButtonElement>, "onDragOver" | "onDragEnter" | "onDragLeave" | "onDrop">;
}

/** The clickable gap between two adjacent syllables that toggles a melisma merge. Inert while
    the underline toggle is off, since there is nothing visible to join or separate then. */
function SyllableGapButton({
  merged,
  wordBoundary = false,
  dropTarget = false,
  slotDropTarget = false,
  slotInset,
  fromText,
  toText,
  annotationGap = 0,
  disabled,
  onToggle,
  buttonRef,
  dragProps,
}: SyllableGapButtonProps) {
  return (
    <button
      ref={buttonRef}
      type="button"
      contentEditable={false}
      // Disabled buttons don't receive drag events, and no click can happen mid-drag anyway.
      disabled={disabled && !dragProps}
      {...dragProps}
      className={
        "syllable-gap" +
        (wordBoundary ? " syllable-gap--word-boundary" : "") +
        (merged ? " syllable-gap--merged" : "") +
        (dropTarget ? " syllable-gap--drop-target" : "") +
        (slotDropTarget ? " syllable-gap--slot-drop-target" : "")
      }
      aria-pressed={merged}
      aria-label={merged ? `Separar sílabas "${fromText}" y "${toText}"` : `Unir sílabas "${fromText}" y "${toText}"`}
      style={
        {
          "--annotation-gap": `${annotationGap}px`,
          "--slot-inset-before": `${slotInset?.before ?? 0}px`,
          "--slot-inset-after": `${slotInset?.after ?? 0}px`,
        } as React.CSSProperties
      }
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

interface EdgeDropZoneProps {
  edge: "start" | "end";
  dropTarget: boolean;
  rect?: SlotRect;
  dragProps?: {
    onDragOver: (event: React.DragEvent) => void;
    onDragEnter: () => void;
    onDragLeave: () => void;
    onDrop: (event: React.DragEvent) => void;
  };
}

/** A zone standing in for a line's current leading/trailing target slot while a chord is being
 *  dragged — that slot is a tiny fixed-width cell in the row above, easy to miss, so this gives
 *  the same drop a much bigger target, right where the chord will visually land, with the same
 *  underline treatment every other dropzone on the line uses. It always targets the nearest
 *  still-empty slot in its direction, so a second (or third) leading/trailing chord drops here
 *  too, once the first one's already-filled slot stops being a target itself. `rect` is that
 *  target slot's own measured position (see `slotRects`), so the hit area and its underline move
 *  outward with the target instead of always sitting right next to the syllable. */
function EdgeDropZone({ edge, dropTarget, rect, dragProps }: EdgeDropZoneProps) {
  const dropRect = rect ? edgeDropZoneRect(edge, rect) : undefined;
  const style = dropRect ? { left: `${dropRect.left}px`, width: `${dropRect.width}px` } : undefined;
  return (
    <span
      contentEditable={false}
      className={`line-edge-drop line-edge-drop--${edge}` + (dropTarget ? " line-edge-drop--active" : "")}
      style={style}
      {...dragProps}
    />
  );
}

interface LineViewProps {
  line: Line;
  /** Whitespace at the end of the raw lyric line, which the syllable model does not retain. */
  trailingWhitespace: string;
  merges: ReadonlySet<string>;
  showUnderline: boolean;
  tracks: TrackDef[];
  cells: CellsByTrack;
  chordVariants: Record<string, number>;
  previousChordNotes: ReadonlyMap<string, string[]>;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onSetChordVariant: (slotId: string, index: number) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  /** True while the viewer isn't allowed to edit this song. Disables syllable-join toggling and
   *  every track cell, without hiding any of the annotations themselves. */
  readOnly?: boolean;
  /** True while the document caret sits on this (empty) line. Chrome does not reliably paint its
      own caret there, so this line should render an explicit blinking indicator instead. */
  showEmptyCaret: boolean;
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
  showUnderline,
  tracks,
  cells,
  chordVariants,
  previousChordNotes,
  onSetCellText,
  onSetChordVariant,
  onToggleMerge,
  readOnly = false,
  showEmptyCaret,
  dragSource,
  dropTarget,
  onDragStartCell,
  onDragEndCell,
  onDragEnterCell,
  onDragLeaveCell,
  onDropCell,
}: LineViewProps) {
  const slotIds = useMemo(() => getLineCellSlots(line, merges, cells), [line, merges, cells]);
  // Nearest-to-syllable first, same order `startSlotIds`/`endSlotIds` produce — used below to
  // chain each leading/trailing chord's position off its neighbor's, and to find the next empty
  // slot a dragged or typed chord should land in.
  const lineStartSlots = useMemo(() => startSlotIds(line, cells), [line, cells]);
  const lineEndSlots = useMemo(() => endSlotIds(line, cells), [line, cells]);
  const units = useMemo(() => getLineUnits(line, merges), [line, merges]);
  const gaps = useMemo(() => getLineGaps(line, merges), [line, merges]);
  const gapSlotIds = useMemo(() => new Set(gaps.map((gap) => gap.slotId)), [gaps]);
  const chordsVisible = tracks.some((track) => track.id === "chords" && track.visible);

  const mergedIds = new Set<string>();
  for (const unit of units) {
    if (unit.syllableIds.length > 1) {
      for (const id of unit.syllableIds) mergedIds.add(id);
    }
  }

  const unitSlotBySyllable = useMemo(() => {
    const map = new Map<string, string>();
    for (const unit of units) {
      for (const id of unit.syllableIds) map.set(id, unit.slotId);
    }
    return map;
  }, [units]);
  const syllableEls = useRef(new Map<string, HTMLElement>());
  // The word-boundary button after each syllable that ends a word, keyed by that syllable's id —
  // it is the on-screen box of that word gap's chord slot.
  const gapEls = useRef(new Map<string, HTMLElement>());
  const syllableRowRef = useRef<HTMLDivElement>(null);
  const beforeGroupRef = useRef<HTMLDivElement>(null);
  const afterGroupRef = useRef<HTMLDivElement>(null);
  const [slotRects, setSlotRects] = useState<Record<string, SlotRect>>({});
  // A geometry measurement is only usable for the annotation-spacing state it was made with.
  // When a long label expands a gap, wait for the following measurement before revealing notes.
  const [slotRectsMeasuredFor, setSlotRectsMeasuredFor] = useState("");
  const [annotationGapExtras, setAnnotationGapExtras] = useState<Record<string, number>>({});
  const annotationSpacingKeyRef = useRef<string | null>(null);
  const gapCorrectionAttemptsRef = useRef<Record<string, number>>({});
  // Read-only lines (always true on mobile) wrap onto multiple visual rows instead of
  // overflowing the viewport. When a line actually wraps, this holds each visual row's slot ids
  // (annotation cells + the syllables they sit above) plus the geometry needed to place a
  // wrap-row overlay (see the effect below and .line__wrap-row in App.css) directly above/below
  // each row past the first. Stays null for single-row lines (the common case) and for editable
  // lines, which keep today's single-row layout untouched.
  const [wrapLayout, setWrapLayout] = useState<{
    groups: string[][];
    lineHeight: number;
    beforeHeight: number;
    afterHeight: number;
  } | null>(null);
  const annotationSpacingKey = tracks
    .filter((track) => track.visible)
    .map(
      (track) =>
        `${track.id}:${[...units.map((unit) => unit.slotId), ...gaps.map((gap) => gap.slotId)]
          .map((slotId) => getCell(cells, track.id, slotId))
          .join("\u0001")}`,
    )
    .join("\u0002");
  const annotationGapExtrasKey = Object.entries(annotationGapExtras)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slotId, extra]) => `${slotId}:${extra}`)
    .join("\u0001");

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

      const next: Record<string, SlotRect> = {};

      // Anchored off the first syllable's own left edge instead of the last syllable's right
      // edge, and growing further left (not right) as each one's own label needs more room —
      // annotationGapExtras holds that measured label width, accumulated outward across the
      // whole leading chain so a second (or third) leading chord never overlaps the one nearer
      // the syllable. Always computed (even on an empty line, falling back to the row's own left
      // edge), so these slots' rects are never missing — TrackRow blanks out a whole row's layout
      // if any slot's rect is.
      const firstUnit = units[0];
      const firstEl = firstUnit && syllableEls.current.get(firstUnit.syllableIds[0]);
      const firstLeft = firstEl ? firstEl.getBoundingClientRect().left - rowsLeft : 0;
      for (const slotId of lineStartSlots) {
        const extra = annotationGapExtras[slotId] ?? 0;
        next[slotId] = {
          left: Math.round(firstLeft - minimumLabelGap - extra),
          width: 14,
        };
      }

      for (const gap of gaps) {
        const gapEl = gapEls.current.get(gap.afterSyllableId);
        if (!gapEl) continue;
        const rect = gapEl.getBoundingClientRect();
        const unitSlot = unitSlotBySyllable.get(gap.afterSyllableId);
        const before = unitSlot ? (annotationGapExtras[unitSlot] ?? 0) : 0;
        const own = annotationGapExtras[gap.slotId] ?? 0;
        // The button is widened by the previous unit's label and by this gap's own label, so the
        // slot sits after the former and spans only what is left of the base width.
        next[gap.slotId] = {
          left: Math.round(rect.left - rowsLeft + before),
          width: Math.max(6, Math.round(rect.width - before - own)),
        };
      }

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
      // Unlike the gaps between syllables, there's no button element after the line's last
      // syllable to give these slots breathing room — the first one's annotation would otherwise
      // sit flush against the last syllable's own right edge. Each subsequent trailing chord is
      // pushed further right by annotationGapExtras, built from the ones nearer the syllable's
      // own measured widths, so they stack without overlapping instead of all starting at the
      // same spot.
      for (const slotId of lineEndSlots) {
        const extra = annotationGapExtras[slotId] ?? 0;
        next[slotId] = { left: Math.round(lastRight - rowsLeft) + minimumLabelGap + extra, width: 14 };
      }
      setSlotRects((previous) => (haveEqualSlotRects(previous, next) ? previous : next));
      setSlotRectsMeasuredFor((previous) => (previous === annotationGapExtrasKey ? previous : annotationGapExtrasKey));
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
    // chordsVisible is a dependency because it toggles `.line--chords-hidden`, which changes the
    // rendered width of word-boundary gaps (see App.css) — without it, showing/hiding the chords
    // track after text already exists leaves every annotation position stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [line, merges, annotationGapExtras, annotationGapExtrasKey, chordsVisible, lineStartSlots, lineEndSlots]);

  useLayoutEffect(() => {
    // A changed label or merge gets a fresh measurement from the unexpanded lyric layout.
    if (annotationSpacingKeyRef.current !== annotationSpacingKey) {
      annotationSpacingKeyRef.current = annotationSpacingKey;
      gapCorrectionAttemptsRef.current = {};
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
      for (const slotId of slotIds) {
        if (!getCell(cells, track.id, slotId)) continue;
        const cellEl = cellsInTrack.find((cell) => cell.dataset.slotId === slotId);
        if (!cellEl) continue;
        const range = document.createRange();
        range.selectNodeContents(cellEl);
        const width = Math.ceil(range.getBoundingClientRect().width);
        labelWidths.set(slotId, Math.max(labelWidths.get(slotId) ?? 0, width));
      }
    }

    const next = { ...annotationGapExtras };
    // Every slot between the start and end bookends, in order: syllable units and word gaps. Each
    // one's label must clear the next slot's left edge; a shortfall widens the space after it.
    const unitBySlot = new Map(units.map((unit) => [unit.slotId, unit]));
    const gapBySlot = new Map(gaps.map((gap) => [gap.slotId, gap]));
    const anchorLeft = (slotId: string): number | null => {
      const unit = unitBySlot.get(slotId);
      if (unit) return syllableEls.current.get(unit.syllableIds[0])?.getBoundingClientRect().left ?? null;
      const gap = gapBySlot.get(slotId);
      const gapEl = gap && gapEls.current.get(gap.afterSyllableId);
      if (!gap || !gapEl) return null;
      const unitSlot = unitSlotBySyllable.get(gap.afterSyllableId);
      return gapEl.getBoundingClientRect().left + (unitSlot ? (annotationGapExtras[unitSlot] ?? 0) : 0);
    };
    const anchorSlots = slotIds.slice(lineStartSlots.length, slotIds.length - lineEndSlots.length);
    for (let index = 0; index < anchorSlots.length - 1; index++) {
      const slotId = anchorSlots[index]!;
      const nextSlotId = anchorSlots[index + 1]!;
      const width = labelWidths.get(slotId);
      const left = anchorLeft(slotId);
      const nextLeft = anchorLeft(nextSlotId);
      // A bare next slot has no label to protect — widening the gap here would only
      // separate the lyrics, not prevent any annotation from overlapping another one.
      if (!width || left === null || nextLeft === null || !labelWidths.has(nextSlotId)) continue;
      // Rounded to match `width` (already an integer): comparing a fractional distance against
      // an integer target rarely lands on exactly zero, which would otherwise leave a shortfall
      // that never fully closes.
      const distance = Math.round(nextLeft - left);
      const additional = requiredAnnotationGap(width, distance);
      if (additional <= 0) continue;
      // On some mobile browsers the CSS gap we request (an `em`-based calc()) doesn't render as
      // the exact px we asked for, so `distance` never fully catches up no matter how much extra
      // we add — without a cap this keeps compounding forever, re-triggering this effect until
      // React's update-depth guard crashes the page. Capping attempts per slot accepts a
      // possibly-imperfect gap instead of an infinite render loop.
      const attempts = gapCorrectionAttemptsRef.current[slotId] ?? 0;
      if (attempts >= 4) continue;
      gapCorrectionAttemptsRef.current[slotId] = attempts + 1;
      next[slotId] = (next[slotId] ?? 0) + additional;
    }

    // The leading chain has no "next unit" to measure against — each slot grows left, away from
    // the first syllable, stacking outward by its own rendered label width plus however much room
    // the slot(s) nearer the syllable already claimed. The trailing chain mirrors this, growing
    // right instead. Both are a direct function of today's measured widths (unlike the inter-unit
    // gaps above, which chase a moving on-screen distance), so no attempt cap is needed to keep
    // them from compounding.
    let leadingCumulative = 0;
    for (const slotId of lineStartSlots) {
      leadingCumulative += labelWidths.get(slotId) ?? 0;
      next[slotId] = leadingCumulative;
      leadingCumulative += minimumLabelGap;
    }
    let trailingCumulative = 0;
    for (const slotId of lineEndSlots) {
      next[slotId] = trailingCumulative;
      trailingCumulative += (labelWidths.get(slotId) ?? 0) + minimumLabelGap;
    }

    const changed = Object.keys(next).some((key) => next[key] !== annotationGapExtras[key]);
    if (changed) setAnnotationGapExtras(next);
  }, [annotationGapExtras, annotationSpacingKey, cells, slotIds, tracks, units, gaps, unitSlotBySyllable, lineStartSlots, lineEndSlots]);

  useLayoutEffect(() => {
    if (!readOnly) return;

    function measureWrap() {
      const rowEl = syllableRowRef.current;
      if (!rowEl || units.length === 0) {
        setWrapLayout((previous) => (previous === null ? previous : null));
        return;
      }

      // Flex-wrap always lays a line's rows out top to bottom, so each unit's row is just "did
      // this syllable's top move down from the previous one" — no need to know the exact pixel
      // gap between rows, which isn't settled yet (it depends on wrapLayout, computed below).
      const rowsTop = rowEl.getBoundingClientRect().top;
      let currentRow = 0;
      let lastTop: number | null = null;
      let lineHeight = 0;
      const unitRows: number[] = units.map((unit) => {
        const el = syllableEls.current.get(unit.syllableIds[0]);
        if (!el) return currentRow;
        const rect = el.getBoundingClientRect();
        const top = Math.round(rect.top - rowsTop);
        if (lastTop !== null && top > lastTop + 1) currentRow += 1;
        lastTop = top;
        lineHeight = Math.max(lineHeight, Math.round(rect.height));
        return currentRow;
      });
      const rowCount = currentRow + 1;

      if (rowCount <= 1) {
        setWrapLayout((previous) => (previous === null ? previous : null));
        return;
      }

      const groups: string[][] = Array.from({ length: rowCount }, () => []);
      const gapAfter = new Map(gaps.map((gap) => [gap.afterSyllableId, gap.slotId]));
      units.forEach((unit, index) => {
        groups[unitRows[index]]!.push(unit.slotId);
        const gapSlot = gapAfter.get(unit.syllableIds[unit.syllableIds.length - 1]!);
        if (gapSlot) groups[unitRows[index]]!.push(gapSlot);
      });
      groups[0]!.unshift(...lineStartSlots.slice().reverse());
      groups[rowCount - 1]!.push(...lineEndSlots);

      const beforeHeight = beforeGroupRef.current?.getBoundingClientRect().height ?? 0;
      const afterHeight = afterGroupRef.current?.getBoundingClientRect().height ?? 0;

      setWrapLayout((previous) => {
        const sameGroups =
          previous !== null &&
          previous.groups.length === groups.length &&
          previous.groups.every((group, i) => group.length === groups[i]!.length && group.every((slot, j) => slot === groups[i]![j]));
        if (sameGroups && previous!.lineHeight === lineHeight && previous!.beforeHeight === beforeHeight && previous!.afterHeight === afterHeight) {
          return previous;
        }
        return { groups, lineHeight, beforeHeight, afterHeight };
      });
    }

    measureWrap();
    window.addEventListener("resize", measureWrap);
    return () => window.removeEventListener("resize", measureWrap);
    // slotRects is a dependency because a line only actually wraps once its syllables have their
    // final on-screen positions — the same layout pass that measurement effect above produces.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readOnly, line, merges, units, gaps, tracks, slotRects, lineStartSlots, lineEndSlots]);

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
  const chordSlotIds = new Set(
    slotIds.filter((slotId) => getCell(cells, "chords", slotId).trim() !== ""),
  );
  const firstSyllableId = units[0]?.syllableIds[0];

  function hasChordAtSyllable(syllableId: string) {
    const slotId = syllableSlotId.get(syllableId);
    // A chord before the first lyric syllable is stored in the line's start slot. It still
    // belongs visually to that first syllable, even though it has no `before:<syllable>` slot.
    return (
      (slotId !== undefined && chordSlotIds.has(slotId)) ||
      (syllableId === firstSyllableId && chordSlotIds.has(lineStartSlots[0]!))
    );
  }

  function syllableDragProps(syllableId: string) {
    const slotId = syllableSlotId.get(syllableId);
    return slotId === undefined ? undefined : slotDragProps(slotId);
  }

  // Dropzone handlers for any on-screen element standing in for `slotId` — a syllable, or the
  // whitespace between two words — so the chord track's cell isn't the only place a drop lands.
  function slotDragProps(slotId: string) {
    if (!dragSource) return undefined;
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

  // The dropzone before the first syllable / after the last always targets the nearest still-empty
  // slot in that direction — the one `lineStartSlots`/`lineEndSlots` already append once every
  // nearer slot is filled (see `startSlotIds`/`endSlotIds`).
  const startTargetSlotId = lineStartSlots[lineStartSlots.length - 1]!;
  const endTargetSlotId = lineEndSlots[lineEndSlots.length - 1]!;

  function edgeDragProps(targetSlotId: string) {
    if (!dragSource) return undefined;
    const trackId = dragSource.trackId;
    return {
      onDragOver: (event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
      },
      onDragEnter: () => onDragEnterCell(trackId, targetSlotId),
      onDragLeave: () => onDragLeaveCell(trackId, targetSlotId),
      onDrop: (event: React.DragEvent) => {
        event.preventDefault();
        onDropCell(trackId, targetSlotId);
      },
    };
  }

  // `rowSlotIds` is the full line by default; a wrapped line's per-row overlays (below) pass just
  // that row's own slots instead, so each visual row's chords only cover its own syllables.
  function renderTrackRow(track: TrackDef, rowSlotIds: string[]) {
    if (track.id === "chordNotes") {
      // This derived, read-only row is up to four notes tall. Do not reserve that vertical space
      // until this particular lyric line has an actual chord to describe. Checked against the
      // whole line (not just this row) so every row reserves the same height — wrapLayout assumes
      // a uniform row height when it places the row-1+ overlays.
      if (!slotIds.some((slotId) => chordToNoteNames(getCell(cells, "chords", slotId)))) {
        return null;
      }
      return (
        <div key={track.id} contentEditable={false}>
          <ChordNotesRow
            label={track.label}
            slotIds={rowSlotIds}
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
          slotIds={rowSlotIds}
          slotRects={slotRects}
          cells={cells}
          chordVariants={chordVariants}
          onSetCellText={onSetCellText}
          onSetChordVariant={onSetChordVariant}
          drag={drag}
          readOnly={readOnly}
          annotationsReady={
            track.id !== "vocalNotes" ||
            (areSlotRectsReady(rowSlotIds, slotRects) && slotRectsMeasuredFor === annotationGapExtrasKey)
          }
        />
      </div>
    );
  }

  const beforeTracks = tracks.filter((track) => track.visible && track.id !== "vocalNotes");
  const afterTracks = tracks.filter((track) => track.visible && track.id === "vocalNotes" && showUnderline);
  const isWrapped = wrapLayout !== null;
  const firstRowSlotIds = isWrapped ? wrapLayout.groups[0]! : slotIds;
  const lastRowSlotIds = isWrapped ? wrapLayout.groups[wrapLayout.groups.length - 1]! : slotIds;
  const wrapRowGap = isWrapped ? wrapLayout.beforeHeight + wrapLayout.afterHeight : 0;

  function renderWordContent(word: Line["words"][number]) {
    return word.syllables.map((syllable, index) => {
      const previous = index > 0 ? word.syllables[index - 1] : null;
      const merged = previous ? merges.has(mergeKey(previous.id, syllable.id)) : false;
      return (
        <Fragment key={syllable.id}>
          {previous ? (
            <SyllableGapButton
              merged={merged}
              dropTarget={dropTargetSyllableIds.has(previous.id) && dropTargetSyllableIds.has(syllable.id)}
              fromText={previous.text}
              toText={syllable.text}
              disabled={!showUnderline || readOnly}
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
              (readOnly && hasChordAtSyllable(syllable.id) ? " syllable--has-chord" : "") +
              (dropTargetSyllableIds.has(syllable.id) ? " syllable--drop-target" : "")
            }
            {...syllableDragProps(syllable.id)}
          >
            {syllable.text}
          </span>
        </Fragment>
      );
    });
  }

  return (
    <div
      className={
        "line" +
        (isDragging ? " line--dragging" : "") +
        (!chordsVisible ? " line--chords-hidden" : "") +
        (readOnly ? " line--chord-underlines-only" : "")
      }
    >
      <div ref={beforeGroupRef}>{beforeTracks.map((track) => renderTrackRow(track, firstRowSlotIds))}</div>
      <div
        className={"syllable-row" + (readOnly ? " syllable-row--wrap" : "")}
        role="textbox"
        data-lyrics-line
        ref={syllableRowRef}
        style={readOnly ? ({ "--wrap-row-gap": `${wrapRowGap}px` } as React.CSSProperties) : undefined}
      >
        {/* Chrome does not reliably paint its native caret on an otherwise-empty flex row, so the
            `<br>` gives the browser a real anchor and the explicit `.lyric-caret` bar is the
            visible indicator while this line holds the document caret. Both are excluded from the
            document model. */}
        {line.words.length === 0 ? (
          <>
            <br data-empty-line-caret />
            {showEmptyCaret ? <span className="lyric-caret" aria-hidden="true" /> : null}
          </>
        ) : null}
        {line.words.length > 0 && !readOnly ? (
          <EdgeDropZone
            edge="start"
            dropTarget={dropTarget?.slotId === startTargetSlotId}
            rect={slotRects[startTargetSlotId]}
            dragProps={edgeDragProps(startTargetSlotId)}
          />
        ) : null}
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
                  slotDropTarget={dropTarget?.slotId === gapSlotId(prevSyllable.id)}
                  dragProps={
                    gapSlotIds.has(gapSlotId(prevSyllable.id)) ? slotDragProps(gapSlotId(prevSyllable.id)) : undefined
                  }
                  slotInset={{
                    before: annotationGapExtras[syllableSlotId.get(prevSyllable.id) ?? ""] ?? 0,
                    after: annotationGapExtras[gapSlotId(prevSyllable.id)] ?? 0,
                  }}
                  fromText={prevSyllable.text}
                  toText={firstSyllable.text}
                  disabled={!showUnderline || readOnly}
                  annotationGap={
                    syllableSlotId.get(prevSyllable.id) === syllableSlotId.get(firstSyllable.id)
                      ? 0
                      : (annotationGapExtras[syllableSlotId.get(prevSyllable.id) ?? ""] ?? 0) +
                        (annotationGapExtras[gapSlotId(prevSyllable.id)] ?? 0)
                  }
                  buttonRef={(el) => {
                    if (el) gapEls.current.set(prevSyllable.id, el);
                    else gapEls.current.delete(prevSyllable.id);
                  }}
                  onToggle={() => onToggleMerge(line.id, prevSyllable.id, firstSyllable.id)}
                />
              ) : null}
              {/* A word's own syllables (and the merge buttons between them) never split across a
                  wrap \u2014 only readOnly wraps at all, so only it needs the unbreakable wrapper. */}
              {readOnly ? (
                <span className="word-group">{renderWordContent(word)}</span>
              ) : (
                renderWordContent(word)
              )}
            </Fragment>
          );
        })}
        {line.words.length > 0 && !readOnly ? (
          <EdgeDropZone
            edge="end"
            dropTarget={dropTarget?.slotId === endTargetSlotId}
            rect={slotRects[endTargetSlotId]}
            dragProps={edgeDragProps(endTargetSlotId)}
          />
        ) : null}
        {/* Keep a React-owned caret anchor after a trailing space. Without it, the model drops
            that space while syllabifying and the next typed word is appended to the previous one. */}
        {trailingWhitespace.replaceAll(/\s/g, "\u00a0")}
      </div>
      <div ref={afterGroupRef}>{afterTracks.map((track) => renderTrackRow(track, lastRowSlotIds))}</div>
      {isWrapped
        ? wrapLayout.groups.flatMap((rowSlotIds, rowIndex) => {
            const overlays = [];
            if (rowIndex > 0) {
              const top = rowIndex * (wrapLayout.lineHeight + wrapRowGap);
              overlays.push(
                <div
                  key={`before-${rowIndex}`}
                  className="line__wrap-row"
                  contentEditable={false}
                  style={{ top: `${top}px` }}
                >
                  {beforeTracks.map((track) => renderTrackRow(track, rowSlotIds))}
                </div>,
              );
            }
            if (rowIndex < wrapLayout.groups.length - 1 && afterTracks.length > 0) {
              const top = wrapLayout.beforeHeight + rowIndex * (wrapLayout.lineHeight + wrapRowGap) + wrapLayout.lineHeight;
              overlays.push(
                <div
                  key={`after-${rowIndex}`}
                  className="line__wrap-row"
                  contentEditable={false}
                  style={{ top: `${top}px` }}
                >
                  {afterTracks.map((track) => renderTrackRow(track, rowSlotIds))}
                </div>,
              );
            }
            return overlays;
          })
        : null}
    </div>
  );
}
