import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { parseChordSheet, type ChordPlacement } from "../../core/chordSheet";
import { previousChordNotesBySlot } from "../../core/chordNotes";
import { columnForSlot, getLineCellSlots } from "../../core/model";
import { getCell } from "../../core/state";
import type { BisGroup, CellsByTrack, PitchDirection, Song, TrackDef, TrackId } from "../../core/types";
import { pitchDirectionFromDrag, type DragDelta } from "../pitchDragGesture";
import { shouldPreserveTextSelection } from "../selectionGesture";
import { EditorHelp } from "./EditorHelp";
import { LineView } from "./LineView";
import { YoutubeEmbed } from "./YoutubeEmbed";

interface DragCell {
  trackId: TrackId;
  slotId: string;
}

interface SongViewProps {
  song: Song;
  lyricsText: string;
  bisGroups: BisGroup[];
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  chordVariants: Record<string, number>;
  pitchDirections: Record<string, PitchDirection>;
  showUnderline: boolean;
  /** Admin-attached YouTube link (see App.tsx's track-toolbar button), rendered below the
   *  lyrics. `null`/`undefined` when none is set. */
  youtubeUrl?: string | null;
  /** The editor's corner help button. Off where the editor is embedded in a page that already
   *  explains it (e.g. an article). */
  showHelp?: boolean;
  /** What the empty song shows before anything is typed. `null` shows nothing. */
  placeholder: ReactNode;
  /** False while the viewer isn't allowed to edit this song (not its owner and not a fork of
   *  it) — the whole document becomes non-editable, and every track cell and syllable-join
   *  toggle underneath it follows suit. */
  canEdit: boolean;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onSetChordVariant: (slotId: string, index: number) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onMoveCellText: (
    trackId: TrackId,
    fromSlotId: string,
    toSlotId: string,
  ) => void;
  onDragPitchDirection: (slotId: string, direction: PitchDirection) => void;
  onReconcileLyricsText: (text: string) => void;
  onToggleBis: (startLineIndex: number, endLineIndex: number, remove: boolean) => void;
  onPasteText: (
    text: string,
    startLineIndex: number,
    startOffset: number,
    placements: ChordPlacement[],
  ) => void;
}

interface CaretPosition {
  lineIndex: number;
  offset: number;
}

/** A word-boundary gap is a non-editable `<button>` with no text content of its own \u2014 it
    represents a space purely through layout. Any code that measures text length from the DOM
    must synthesize that space itself, matching this translation exactly. */
function nodesText(nodes: Iterable<Node>): string {
  let text = "";
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent ?? "";
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;
    if (node.hasAttribute("data-empty-line-caret")) {
      continue;
    }
    if (node.tagName === "BR") {
      text += "\n";
    } else if (node.classList.contains("syllable-gap--word-boundary")) {
      text += " ";
    } else {
      text += node.textContent ?? "";
    }
  }
  return text.replaceAll("\u00a0", " ");
}

function lineText(line: HTMLElement): string {
  return nodesText(line.childNodes);
}

const BIS_AT_LINE_END = /(?:^|\s)BIS\s*$/;

function bisLineStyles(lines: string[], groups: BisGroup[]) {
  const styles = new Map<number, "single" | "start" | "middle" | "end">();
  for (const { startLineIndex, endLineIndex } of groups) {
    if (!BIS_AT_LINE_END.test(lines[endLineIndex] ?? "")) continue;
    for (let index = startLineIndex; index <= endLineIndex; index++) {
      styles.set(
        index,
        startLineIndex === endLineIndex
          ? "single"
          : index === startLineIndex
            ? "start"
            : index === endLineIndex
              ? "end"
              : "middle",
      );
    }
  }
  lines.forEach((line, index) => {
    if (BIS_AT_LINE_END.test(line) && !styles.has(index)) styles.set(index, "single");
  });
  return styles;
}

function readDocument(root: HTMLElement): string {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-lyrics-line]"))
    .map(lineText)
    .join("\n");
}

function positionForNode(
  root: HTMLElement,
  node: Node,
  nodeOffset: number,
): CaretPosition | null {
  const lines = Array.from(
    root.querySelectorAll<HTMLElement>("[data-lyrics-line]"),
  );

  // A select-all range is commonly anchored on the editing host itself: `(root, 0)` through
  // `(root, root.childNodes.length)`. That is still a selection of lyric text, even though
  // neither endpoint has a lyric-line ancestor. Translate a host boundary to the nearest line
  // boundary so beforeinput can perform the edit through the document model. Each root child is a
  // line wrapper (chord track rows plus the `[data-lyrics-line]` row), not the line itself, so the
  // match has to look inside each child rather than test the child directly.
  if (node === root) {
    const nextLine = Array.from(root.childNodes)
      .slice(nodeOffset)
      .map((child): HTMLElement | null =>
        !(child instanceof HTMLElement)
          ? null
          : child.matches("[data-lyrics-line]")
            ? child
            : child.querySelector<HTMLElement>("[data-lyrics-line]"),
      )
      .find((line): line is HTMLElement => line !== null);
    if (nextLine) return { lineIndex: lines.indexOf(nextLine), offset: 0 };

    const lastLine = lines.at(-1);
    return lastLine
      ? { lineIndex: lines.length - 1, offset: lineText(lastLine).length }
      : null;
  }

  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  const line = element?.closest<HTMLElement>("[data-lyrics-line]");
  if (!line || !root.contains(line)) return null;
  const range = document.createRange();
  range.selectNodeContents(line);
  try {
    range.setEnd(node, nodeOffset);
  } catch {
    return null;
  }
  // `range.toString()` renders the browser's native text, which has no character for a
  // word-boundary gap button (it carries no text content of its own). Using it here would
  // undercount the offset by one for every word boundary before this position, so the same
  // node-to-text translation `lineText()` uses is applied to the range's cloned contents instead.
  return {
    lineIndex: lines.indexOf(line),
    offset: nodesText(range.cloneContents().childNodes).length,
  };
}

function captureCaret(root: HTMLElement): CaretPosition | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  return positionForNode(root, selection.anchorNode!, selection.anchorOffset);
}

/** Both edges of the current selection, in document order (start may equal end for a collapsed
    caret). Used to compute text edits ourselves instead of letting the browser mutate the
    React-managed DOM directly \u2014 see the comment on `handleBeforeInput`. */
function captureSelectionRange(
  root: HTMLElement,
): { start: CaretPosition; end: CaretPosition } | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  const start = positionForNode(root, range.startContainer, range.startOffset);
  const end = positionForNode(root, range.endContainer, range.endOffset);
  if (!start || !end) return null;
  return { start, end };
}

function flatOffset(lines: string[], position: CaretPosition): number {
  let offset = 0;
  for (let i = 0; i < position.lineIndex; i++) offset += lines[i].length + 1;
  return offset + position.offset;
}

function positionFromFlatOffset(lines: string[], flat: number): CaretPosition {
  let remaining = flat;
  for (let i = 0; i < lines.length; i++) {
    const length = lines[i].length;
    if (remaining <= length) return { lineIndex: i, offset: remaining };
    remaining -= length + 1;
  }
  const lastIndex = lines.length - 1;
  return { lineIndex: lastIndex, offset: lines[lastIndex]?.length ?? 0 };
}

/** The clipboard text for `[start, end)` of the document, in the same chord-sheet convention
 *  `parseChordSheet` reads on paste: each chord written on its own line, above the lyric line it
 *  applies to, aligned by character column. Only chords whose column falls inside the selected
 *  slice of their line are included, so a partial-line selection doesn't drag in a chord that sits
 *  outside it. This is what makes copy/paste of a phrase carry its chords along, and — just as
 *  importantly — what replaces the browser's default plain-text serialization of the selection,
 *  which (via the non-editable `<button>` syllable-gap widgets between syllables) otherwise
 *  breaks each syllable onto its own line. */
function clipboardTextForRange(
  song: Song,
  cells: CellsByTrack,
  merges: ReadonlySet<string>,
  lines: string[],
  start: CaretPosition,
  end: CaretPosition,
): string {
  const outLines: string[] = [];
  for (
    let lineIndex = start.lineIndex;
    lineIndex <= end.lineIndex;
    lineIndex++
  ) {
    const lineStartCol = lineIndex === start.lineIndex ? start.offset : 0;
    const lineEndCol =
      lineIndex === end.lineIndex ? end.offset : lines[lineIndex].length;
    const lineSlice = lines[lineIndex].slice(lineStartCol, lineEndCol);

    const modelLine = song[lineIndex];
    const tokens: { column: number; chord: string }[] = [];
    if (modelLine) {
      for (const slotId of getLineCellSlots(modelLine, merges, cells)) {
        const chord = getCell(cells, "chords", slotId);
        if (!chord) continue;
        const column = columnForSlot(modelLine, slotId) - lineStartCol;
        if (column < 0 || column > lineSlice.length) continue;
        tokens.push({ column, chord });
      }
    }
    if (tokens.length > 0) {
      tokens.sort((a, b) => a.column - b.column);
      let chordLine = "";
      for (const token of tokens)
        chordLine = chordLine.padEnd(token.column, " ") + token.chord;
      outLines.push(chordLine);
    }
    outLines.push(lineSlice);
  }
  return outLines.join("\n");
}

function wordBoundaryBackward(text: string, index: number): number {
  let i = index;
  while (i > 0 && /\s/.test(text[i - 1])) i--;
  while (i > 0 && !/\s/.test(text[i - 1])) i--;
  return i;
}

function wordBoundaryForward(text: string, index: number): number {
  let i = index;
  while (i < text.length && /\s/.test(text[i])) i++;
  while (i < text.length && !/\s/.test(text[i])) i++;
  return i;
}

function lineStartBoundary(text: string, index: number): number {
  const i = text.lastIndexOf("\n", index - 1);
  return i === -1 ? 0 : i + 1;
}

function lineEndBoundary(text: string, index: number): number {
  const i = text.indexOf("\n", index);
  return i === -1 ? text.length : i;
}

function placeCaretAt(node: Node, offsetInNode: number) {
  const range = document.createRange();
  range.setStart(node, offsetInNode);
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/** Walks `nodes` in the same order and with the same per-node length rules as `nodesText`
    (a word-boundary gap button and a `<br>` each consume exactly one offset unit, an
    empty-line-caret marker consumes none) so that an offset produced by `captureCaret` lands on
    the matching DOM position here. Returns the remaining, unconsumed offset if it places the
    caret nowhere in `nodes` (the caller then knows to fall back to the end of the line). */
function walkAndPlaceCaret(nodes: Node[], remaining: number): number {
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;
      if (remaining <= length) {
        placeCaretAt(node, remaining);
        return -1;
      }
      remaining -= length;
      continue;
    }
    if (!(node instanceof HTMLElement)) continue;
    if (node.hasAttribute("data-empty-line-caret")) continue;
    if (
      node.tagName === "BR" ||
      node.classList.contains("syllable-gap--word-boundary")
    ) {
      if (remaining <= 0) {
        const parent = node.parentNode!;
        placeCaretAt(
          parent,
          Array.from(parent.childNodes).indexOf(node as ChildNode),
        );
        return -1;
      }
      remaining -= 1;
      continue;
    }
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const result = walkAndPlaceCaret(Array.from(node.childNodes), remaining);
      if (result === -1) return -1;
      placeCaretAt(node, node.childNodes.length);
      return -1;
    }
    remaining -= length;
  }
  return remaining;
}

/** Selects the full text of a lyric line. The browser's own triple-click paragraph selection is
    unreliable here — each line is a flex row sprinkled with non-editable `<button>` gap widgets
    rather than a plain text block — so a triple click is caught explicitly and replaced with this
    instead of trusting whatever the browser's own heuristic produced. */
function selectLine(root: HTMLElement, lineIndex: number) {
  const line =
    root.querySelectorAll<HTMLElement>("[data-lyrics-line]")[lineIndex];
  if (!line) return;
  const range = document.createRange();
  range.selectNodeContents(line);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function restoreCaret(root: HTMLElement, position: CaretPosition) {
  const line =
    root.querySelectorAll<HTMLElement>("[data-lyrics-line]")[
      position.lineIndex
    ];
  if (!line) return;
  const remaining = walkAndPlaceCaret(
    Array.from(line.childNodes),
    position.offset,
  );
  if (remaining === -1) return;
  const range = document.createRange();
  range.selectNodeContents(line);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

interface NativeCaretPoint {
  node: Node;
  offset: number;
}

/** Finds the lyric row a passive click belongs to. Annotation rows live inside the same `.line`
    wrapper as their lyrics; clicks in the inter-line gutter instead go to the visually closest
    lyric row. */
function lyricLineForClick(
  root: HTMLElement,
  target: EventTarget | null,
  clientY: number,
): HTMLElement | null {
  const targetElement =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  const ownedLine = targetElement?.closest(".line");
  const lyricLine = ownedLine?.querySelector<HTMLElement>("[data-lyrics-line]");
  if (lyricLine && root.contains(lyricLine)) return lyricLine;

  const lyricLines = Array.from(
    root.querySelectorAll<HTMLElement>("[data-lyrics-line]"),
  );
  return lyricLines.reduce<HTMLElement | null>((closest, line) => {
    if (!closest) return line;
    const distanceTo = (rect: DOMRect) =>
      clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
    return distanceTo(line.getBoundingClientRect()) < distanceTo(closest.getBoundingClientRect())
      ? line
      : closest;
  }, null);
}

/** Browser APIs return a DOM boundary for a screen point. Keep the legacy Chromium API as a
    fallback: it is the one available in the desktop browser the editor currently supports. */
function nativeCaretPointAt(clientX: number, clientY: number): NativeCaretPoint | null {
  const caretDocument = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) =>
      | { offsetNode: Node; offset: number }
      | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  const position = caretDocument.caretPositionFromPoint?.(clientX, clientY);
  if (position) return { node: position.offsetNode, offset: position.offset };
  const range = caretDocument.caretRangeFromPoint?.(clientX, clientY);
  return range ? { node: range.startContainer, offset: range.startOffset } : null;
}

/** Resolves a click on non-editable editor chrome (annotation whitespace, edge drop zones, and
    gutters) to a real lyric insertion point. The Y coordinate chooses the lyric line; sampling
    at that row's vertical centre lets the browser accurately resolve its X coordinate even when
    the original click was in a taller annotation row. */
function caretForClick(
  root: HTMLElement,
  target: EventTarget | null,
  clientX: number,
  clientY: number,
): CaretPosition | null {
  const line = lyricLineForClick(root, target, clientY);
  if (!line) return null;
  const lines = Array.from(root.querySelectorAll<HTMLElement>("[data-lyrics-line]"));
  const lineIndex = lines.indexOf(line);
  if (lineIndex === -1) return null;

  const rect = line.getBoundingClientRect();
  const x = Math.max(rect.left + 1, Math.min(clientX, rect.right - 1));
  const y = rect.top + rect.height / 2;
  const nativePoint = nativeCaretPointAt(x, y);
  if (nativePoint) {
    const nativeLine =
      (nativePoint.node instanceof Element
        ? nativePoint.node
        : nativePoint.node.parentElement)?.closest<HTMLElement>("[data-lyrics-line]");
    const position = positionForNode(root, nativePoint.node, nativePoint.offset);
    if (nativeLine === line && position?.lineIndex === lineIndex) return position;
  }

  // Old browsers occasionally report no point in empty flex-row space. The useful, predictable
  // fallback is the nearer end of the chosen lyric line; in particular, its trailing dead zone
  // receives the end-of-line caret requested by authors.
  return { lineIndex, offset: clientX <= rect.left + rect.width / 2 ? 0 : lineText(line).length };
}

/** Annotation wrappers and the invisible line-edge drop targets deliberately opt out of native
    editing. They need our caret/selection handling; ordinary lyric text must keep the browser's
    native click and drag behavior. */
function isPassiveCaretSurface(root: HTMLElement, target: EventTarget | null): boolean {
  const element =
    target instanceof Element
      ? target
      : target instanceof Node
        ? target.parentElement
        : null;
  return (
    element === root ||
    (element !== null && root.contains(element) && element.closest('[contenteditable="false"]') !== null)
  );
}

// These insertion types provide their replacement text through `InputEvent.data`. They still go
// through the document model: even a one-character native edit can mutate a syllable text node
// that React later reuses, leaving the DOM and model out of sync.
const NATIVE_FAST_PATH_TYPES = new Set([
  "insertText",
  "insertCompositionText",
  "insertReplacementText",
]);

export function SongView({
  song,
  lyricsText,
  bisGroups,
  merges,
  tracks,
  cells,
  chordVariants,
  pitchDirections,
  showUnderline,
  youtubeUrl,
  showHelp = true,
  placeholder,
  canEdit,
  onSetCellText,
  onSetChordVariant,
  onToggleMerge,
  onMoveCellText,
  onDragPitchDirection,
  onReconcileLyricsText,
  onToggleBis,
  onPasteText,
}: SongViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<CaretPosition | null>(null);
  const selectionGesture = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
    managed: boolean;
    anchor: { node: Node; offset: number } | null;
  } | null>(null);
  // Some browsers still mutate the DOM themselves after `beforeinput`'s `preventDefault()` —
  // notably Chromium deleting a selection that spans one of the non-editable syllable-gap
  // buttons — firing a native `input` event on top of it. `handleBeforeInput` has already applied
  // that edit through the document model by then, so letting `onInput`'s `commit()` run again
  // would re-read a DOM the browser just corrupted and re-apply the same edit on top of it,
  // producing duplicated text. Skip exactly the one `input` event that follows a handled
  // `beforeinput`.
  const suppressNextInput = useRef(false);
  const hasVisibleAnnotations = tracks.some(
    (track) => track.visible && track.id !== "chordNotes",
  );
  const lyricLines = lyricsText.split("\n");
  const bisStyles = bisLineStyles(lyricLines, bisGroups);

  // Chrome does not reliably paint its native caret on an empty lyric line inside this flex
  // layout — the very bug this file has chased through several attempts. Rather than continue to
  // coax the native caret into showing there, track the caret's line ourselves and render an
  // explicit blinking indicator on that one (empty) line while the document has focus.
  const [isFocused, setIsFocused] = useState(false);
  const [caretLineIndex, setCaretLineIndex] = useState<number | null>(null);

  useEffect(() => {
    function handleSelectionChange() {
      const root = rootRef.current;
      if (!root || document.activeElement !== root) return;
      setCaretLineIndex(captureCaret(root)?.lineIndex ?? null);
    }
    document.addEventListener("selectionchange", handleSelectionChange);
    return () =>
      document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  // Flattened in song order (not per line) so a chord at the start of one line can still be
  // compared against the last chord of the previous line.
  const chordSlotOrder = song.flatMap((line) =>
    getLineCellSlots(line, merges, cells),
  );
  const previousChordNotes = previousChordNotesBySlot(
    chordSlotOrder,
    (slotId) => getCell(cells, "chords", slotId),
  );

  // Drag state lives here, above every line, so a chord chip can be dragged from one line's
  // track row and dropped onto a slot in a different line — not just within the same line.
  const [dragSource, setDragSource] = useState<DragCell | null>(null);
  const [dropTarget, setDropTarget] = useState<DragCell | null>(null);

  // A drag that ends without having moved its note is, for a vocal note, the gesture that sets
  // its pitch direction indicator (see pitchDirectionFromDrag).
  const movedByDropRef = useRef(false);

  function handleDragStartCell(trackId: TrackId, slotId: string) {
    movedByDropRef.current = false;
    setDragSource({ trackId, slotId });
  }

  function handleDragEndCell(trackId: TrackId, slotId: string, delta: DragDelta | null) {
    const moved = movedByDropRef.current;
    movedByDropRef.current = false;
    setDragSource(null);
    setDropTarget(null);
    if (moved || trackId !== "vocalNotes" || !delta) return;
    const direction = pitchDirectionFromDrag(delta);
    if (direction) onDragPitchDirection(slotId, direction);
  }

  function handleDragEnterCell(trackId: TrackId, slotId: string) {
    if (!dragSource || dragSource.trackId !== trackId) return;
    setDropTarget({ trackId, slotId });
  }

  function handleDragLeaveCell(trackId: TrackId, slotId: string) {
    setDropTarget((current) =>
      current && current.trackId === trackId && current.slotId === slotId
        ? null
        : current,
    );
  }

  function handleDropCell(trackId: TrackId, slotId: string) {
    if (
      dragSource &&
      dragSource.trackId === trackId &&
      dragSource.slotId !== slotId
    ) {
      onMoveCellText(trackId, dragSource.slotId, slotId);
      movedByDropRef.current = true;
    }
    setDragSource(null);
    setDropTarget(null);
  }

  function commit() {
    const root = rootRef.current;
    if (!root) return;
    pendingCaret.current = captureCaret(root);
    onReconcileLyricsText(readDocument(root));
  }

  /** A click on the document's empty space can leave the browser selection on the editing host
      itself (or outside it), rather than inside a lyric line. Give that click a real insertion
      point, so an empty document shows its caret and is immediately ready for typing. */
  function focusDocument() {
    const root = rootRef.current;
    if (!root) return;
    // Chrome fabricates a default selection anchored on the editing host itself as a side effect
    // of `.focus()`, with no real user intent behind it. Only trust the current selection when the
    // document was already focused before this call (e.g. as part of the very click that's
    // triggering this handler) — otherwise that fabricated default would stand in for a real caret
    // and the document would look focused without ever showing one.
    const wasAlreadyFocused = document.activeElement === root;
    root.focus({ preventScroll: true });
    if (wasAlreadyFocused && captureCaret(root)) return;
    restoreCaret(root, { lineIndex: 0, offset: 0 });
  }

  function isDocumentControl(target: EventTarget | null) {
    return (
      target instanceof HTMLElement &&
      target.closest("button, input, select, textarea, a[href]") !== null
    );
  }

  /** Replaces `[start, end)` of the document text with `replacement`, entirely through our own
      text model, then hands the caret's target position to the post-render restore effect. */
  function replaceRange(start: number, end: number, replacement: string) {
    const root = rootRef.current;
    if (!root) return;
    const text = readDocument(root);
    const newText = text.slice(0, start) + replacement + text.slice(end);
    pendingCaret.current = positionFromFlatOffset(
      newText.split("\n"),
      start + replacement.length,
    );
    onReconcileLyricsText(newText);
  }

  // A lyric row mixes React-owned structural elements (syllable spans, non-editable gap buttons)
  // with the browser's native contentEditable text editing. Letting the browser perform anything
  // beyond a single-character edit (deleting a selection, pressing Enter, select-all + Delete,
  // dragging text, undo/redo...) removes or rearranges those elements in the DOM directly; when
  // React then re-renders from updated state, it tries to clean up nodes the browser already
  // touched and crashes with "removeChild: not a child of this node". So every input type except a
  // single collapsed character insertion is intercepted here, its default action is cancelled, and
  // we rewrite the text ourselves — the DOM stays untouched until React re-renders it from the new
  // state, keeping the two in sync.
  function handleBeforeInput(event: InputEvent) {
    if (!canEdit) return;
    if ((event.target as HTMLElement).closest("[data-track]")) return;
    const inputType = event.inputType;

    const root = rootRef.current;
    if (!root) return;
    const selection = window.getSelection();
    const range = captureSelectionRange(root);
    if (!selection || !range) return;

    event.preventDefault();

    const text = readDocument(root);
    const lines = text.split("\n");
    let start = flatOffset(lines, range.start);
    let end = flatOffset(lines, range.end);
    if (start > end) [start, end] = [end, start];

    if (start === end) {
      // Collapsed selection: only a handful of input types tell us anything can be deleted or
      // inserted at the caret. Anything else (formatting commands, undo/redo, a drop with nothing
      // selected, ...) isn't something we can emulate safely, so it's swallowed as a no-op.
      switch (inputType) {
        case "deleteContentBackward":
          if (start === 0) return;
          start -= 1;
          break;
        case "deleteContentForward":
          if (end >= text.length) return;
          end += 1;
          break;
        case "deleteWordBackward":
          if (start === 0) return;
          start = wordBoundaryBackward(text, start);
          break;
        case "deleteWordForward":
          if (end >= text.length) return;
          end = wordBoundaryForward(text, end);
          break;
        case "deleteSoftLineBackward":
        case "deleteHardLineBackward":
          if (start === 0) return;
          start = lineStartBoundary(text, start);
          break;
        case "deleteSoftLineForward":
        case "deleteHardLineForward":
        case "deleteEntireSoftLine":
          if (end >= text.length) return;
          end = lineEndBoundary(text, end);
          break;
        case "insertParagraph":
        case "insertLineBreak":
        case "insertText":
        case "insertCompositionText":
        case "insertReplacementText":
          break;
        default:
          return;
      }
    }

    const replacement =
      inputType === "insertParagraph" || inputType === "insertLineBreak"
        ? "\n"
        : NATIVE_FAST_PATH_TYPES.has(inputType)
          ? (event.data ?? "")
          : "";
    suppressNextInput.current = true;
    replaceRange(start, end, replacement);
  }

  // Each lyric row is a flex layout sprinkled with non-editable `<button>` gap widgets (see
  // LineView), and browsers can't natively navigate the caret through that: ArrowLeft/Right first
  // "select" the atomic button before a second press moves past it (showing an oversized,
  // misplaced caret in between), and ArrowUp/Down have no real line boxes to walk so they drift
  // sideways instead. We sidestep all of that by driving the caret ourselves from the same
  // text-offset model commit()/restoreCaret already use, rather than letting the browser traverse
  // the DOM.
  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Tab") {
      if (!canEdit || event.nativeEvent.isComposing || event.metaKey || event.ctrlKey || event.altKey)
        return;
      if ((event.target as HTMLElement).closest("[data-track]")) return;
      const root = rootRef.current;
      const range = root ? captureSelectionRange(root) : null;
      if (!range) return;
      const lines = readDocument(root!).split("\n");
      let { start, end } = range;
      if (flatOffset(lines, start) > flatOffset(lines, end)) [start, end] = [end, start];
      // A lone Tab intentionally only starts a phrase at its first character. A selection is
      // already an explicit phrase choice, so it may span any part of its first/last line.
      if (start.lineIndex === end.lineIndex && start.offset !== 0) return;
      event.preventDefault();
      onToggleBis(
        start.lineIndex,
        end.lineIndex,
        event.shiftKey,
      );
      return;
    }

    // Some Chromium keyboard paths don't emit a cancellable `beforeinput` event for Enter in a
    // contentEditable host. Handle the key itself as a fallback so it follows the same document
    // model route as the `insertParagraph` branch below.
    if (event.key === "Enter") {
      if (
        !canEdit ||
        event.nativeEvent.isComposing ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      if ((event.target as HTMLElement).closest("[data-track]")) return;

      const root = rootRef.current;
      if (!root) return;
      const range = captureSelectionRange(root);
      if (!range) return;

      const lines = readDocument(root).split("\n");
      let start = flatOffset(lines, range.start);
      let end = flatOffset(lines, range.end);
      if (start > end) [start, end] = [end, start];

      event.preventDefault();
      replaceRange(start, end, "\n");
      return;
    }

    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown"
    ) {
      return;
    }
    if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey)
      return;
    if ((event.target as HTMLElement).closest("[data-track]")) return;

    const root = rootRef.current;
    if (!root) return;
    const selection = window.getSelection();
    if (!selection || !selection.isCollapsed) return;

    const caret = captureCaret(root);
    if (!caret) return;

    const lines = Array.from(
      root.querySelectorAll<HTMLElement>("[data-lyrics-line]"),
    );
    const currentText = lineText(lines[caret.lineIndex]);

    let lineIndex = caret.lineIndex;
    let offset = caret.offset;

    if (event.key === "ArrowLeft") {
      if (offset > 0) offset -= 1;
      else if (lineIndex > 0) {
        lineIndex -= 1;
        offset = lineText(lines[lineIndex]).length;
      } else return;
    } else if (event.key === "ArrowRight") {
      if (offset < currentText.length) offset += 1;
      else if (lineIndex < lines.length - 1) {
        lineIndex += 1;
        offset = 0;
      } else return;
    } else if (event.key === "ArrowUp") {
      if (lineIndex === 0) return;
      lineIndex -= 1;
      offset = Math.min(offset, lineText(lines[lineIndex]).length);
    } else {
      if (lineIndex >= lines.length - 1) return;
      lineIndex += 1;
      offset = Math.min(offset, lineText(lines[lineIndex]).length);
    }

    event.preventDefault();
    restoreCaret(root, { lineIndex, offset });
  }

  useLayoutEffect(() => {
    const root = rootRef.current;
    const caret = pendingCaret.current;
    if (root && caret) restoreCaret(root, caret);
    pendingCaret.current = null;
  }, [song]);

  // Land the caret in the editor as soon as the page loads, so a new user can start typing
  // immediately instead of having to click into the document first.
  useLayoutEffect(() => {
    focusDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // React's synthetic `onBeforeInput` does not receive native deletion events in every browser
  // (including Chromium's deleteContentBackward for a Cmd/Ctrl+A selection). Listening on the
  // editing host itself guarantees that cancelling the event happens before the browser removes
  // React-managed elements from the DOM.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    root.addEventListener("beforeinput", handleBeforeInput);
    return () => root.removeEventListener("beforeinput", handleBeforeInput);
  });

  return (
    <div className="song-wrapper">
      <div
        ref={rootRef}
        className={
          "song" +
          (song.length === 0 ? " song--empty" : "") +
          (!hasVisibleAnnotations ? " song--annotations-hidden" : "") +
          (!showUnderline ? " song--underline-hidden" : "")
        }
        contentEditable={canEdit}
        suppressContentEditableWarning
        spellCheck={false}
        aria-label="Letra de la canción"
        onFocus={(event) => {
          // React focus events bubble from chord/note inputs too; only the editing host itself
          // should establish a lyric caret.
          if (event.target !== event.currentTarget) return;
          // A pointerdown on a passive annotation surface has already chosen an exact lyric
          // position. Do not briefly manufacture the default first-line caret before restoring it.
          if (!selectionGesture.current?.managed) focusDocument();
          setIsFocused(true);
          setCaretLineIndex(
            captureCaret(event.currentTarget)?.lineIndex ?? null,
          );
        }}
        onBlur={(event) => {
          if (event.target === event.currentTarget) setIsFocused(false);
        }}
        onPointerDownCapture={(event) => {
          if (event.button !== 0) return;
          const root = rootRef.current;
          const managed =
            canEdit &&
            root !== null &&
            !isDocumentControl(event.target) &&
            isPassiveCaretSurface(root, event.target);
          const gesture: NonNullable<typeof selectionGesture.current> = {
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
            moved: false,
            managed,
            anchor: null,
          };
          selectionGesture.current = gesture;
          if (!managed || !root) return;

          const position = caretForClick(root, event.target, event.clientX, event.clientY);
          if (!position) return;
          // Prevent Chrome from painting its transient first-line caret, then immediately place
          // the intended one. Pointer capture lets an edge-zone drag keep extending selection
          // even when the pointer travels diagonally out of that tiny target.
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          root.focus({ preventScroll: true });
          restoreCaret(root, position);
          const selection = window.getSelection();
          if (selection?.anchorNode) {
            gesture.anchor = {
              node: selection.anchorNode,
              offset: selection.anchorOffset,
            };
          }
          setCaretLineIndex(position.lineIndex);
        }}
        onPointerMoveCapture={(event) => {
          const gesture = selectionGesture.current;
          if (!gesture || gesture.pointerId !== event.pointerId) return;
          // A small threshold ignores pointer jitter on a normal click while reliably recognizing
          // a drag that produced a text range.
          if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) > 2) {
            gesture.moved = true;
          }
          if (!gesture.managed || !gesture.moved || !gesture.anchor) return;
          const root = rootRef.current;
          if (!root) return;
          event.preventDefault();
          const position = caretForClick(root, root, event.clientX, event.clientY);
          if (!position) return;
          restoreCaret(root, position);
          const selection = window.getSelection();
          if (selection?.anchorNode) {
            selection.setBaseAndExtent(
              gesture.anchor.node,
              gesture.anchor.offset,
              selection.anchorNode,
              selection.anchorOffset,
            );
          }
        }}
        onPointerCancelCapture={() => {
          selectionGesture.current = null;
        }}
        onClick={(event) => {
          const gesture = selectionGesture.current;
          const pointerMoved = gesture?.moved ?? false;
          selectionGesture.current = null;
          if (event.detail >= 3) {
            const line = (event.target as HTMLElement).closest(
              "[data-lyrics-line]",
            );
            const root = rootRef.current;
            if (line && root) {
              const lineIndex = Array.from(
                root.querySelectorAll<HTMLElement>("[data-lyrics-line]"),
              ).indexOf(line as HTMLElement);
              if (lineIndex !== -1) {
                selectLine(root, lineIndex);
                return;
              }
            }
          }
          if (isDocumentControl(event.target)) return;
          const root = rootRef.current;
          // Pointerdown already placed the caret, or extended a selection, for passive editor
          // chrome. Running the old click-time correction again would cause a visible jump.
          if (gesture?.managed) return;
          if (
            event.detail === 1 &&
            shouldPreserveTextSelection(
              window.getSelection(),
              pointerMoved,
              event.shiftKey,
            )
          ) {
            return;
          }
          if (
            event.detail === 1 &&
            canEdit &&
            root &&
            isPassiveCaretSurface(root, event.target)
          ) {
            const position = caretForClick(
              root,
              event.target,
              event.clientX,
              event.clientY,
            );
            if (position) {
              root.focus({ preventScroll: true });
              restoreCaret(root, position);
              setCaretLineIndex(position.lineIndex);
              return;
            }
          }
          focusDocument();
        }}
        onInput={(event) => {
          if (!canEdit) return;
          if ((event.target as HTMLElement).closest("[data-track]")) return;
          if (suppressNextInput.current) {
            suppressNextInput.current = false;
            return;
          }
          commit();
        }}
        onKeyDownCapture={handleKeyDown}
        onCopy={(event) => {
          if ((event.target as HTMLElement).closest("[data-track]")) return;
          const root = rootRef.current;
          if (!root) return;
          const range = captureSelectionRange(root);
          if (!range) return;
          const lines = readDocument(root).split("\n");
          let { start, end } = range;
          if (flatOffset(lines, start) > flatOffset(lines, end))
            [start, end] = [end, start];
          event.clipboardData.setData(
            "text/plain",
            clipboardTextForRange(song, cells, merges, lines, start, end),
          );
          event.preventDefault();
        }}
        onCut={(event) => {
          if ((event.target as HTMLElement).closest("[data-track]")) return;
          const root = rootRef.current;
          if (!root) return;
          const range = captureSelectionRange(root);
          if (!range) return;
          const lines = readDocument(root).split("\n");
          let { start, end } = range;
          let startFlat = flatOffset(lines, start);
          let endFlat = flatOffset(lines, end);
          if (startFlat > endFlat) {
            [start, end] = [end, start];
            [startFlat, endFlat] = [endFlat, startFlat];
          }
          event.clipboardData.setData(
            "text/plain",
            clipboardTextForRange(song, cells, merges, lines, start, end),
          );
          event.preventDefault();
          if (!canEdit) return;
          replaceRange(startFlat, endFlat, "");
        }}
        onPaste={(event) => {
          if ((event.target as HTMLElement).closest("[data-track]")) return;
          if (!canEdit) return;
          event.preventDefault();
          const root = rootRef.current;
          if (!root) return;
          const range = captureSelectionRange(root);
          if (!range) return;
          const text = readDocument(root);
          const lines = text.split("\n");
          let start = flatOffset(lines, range.start);
          let end = flatOffset(lines, range.end);
          if (start > end) [start, end] = [end, start];

          const { lyricsText, placements } = parseChordSheet(
            event.clipboardData.getData("text/plain").replaceAll("\r\n", "\n"),
          );
          const newText = text.slice(0, start) + lyricsText + text.slice(end);
          pendingCaret.current = positionFromFlatOffset(
            newText.split("\n"),
            start + lyricsText.length,
          );
          if (placements.length > 0) {
            const startPosition = positionFromFlatOffset(
              newText.split("\n"),
              start,
            );
            onPasteText(
              newText,
              startPosition.lineIndex,
              startPosition.offset,
              placements,
            );
          } else {
            onReconcileLyricsText(newText);
          }
        }}
      >
        {song.length === 0 ? (
          <div className="syllable-row document-empty-line" data-lyrics-line>
            <br data-empty-line-caret />
            {isFocused ? (
              <span className="lyric-caret" aria-hidden="true" />
            ) : null}
          </div>
        ) : null}
        {song.map((line, index) => (
          <LineView
            key={line.id}
            line={line}
            bisRule={bisStyles.get(index)}
            bisMarker={BIS_AT_LINE_END.test(lyricLines[index] ?? "")}
            trailingWhitespace={lyricLines[index]?.match(/\s+$/)?.[0] ?? ""}
            merges={merges}
            showUnderline={showUnderline}
            tracks={tracks}
            cells={cells}
            chordVariants={chordVariants}
            pitchDirections={pitchDirections}
            previousChordNotes={previousChordNotes}
            onSetCellText={onSetCellText}
            onSetChordVariant={onSetChordVariant}
            onToggleMerge={onToggleMerge}
            readOnly={!canEdit}
            showEmptyCaret={isFocused && caretLineIndex === index}
            dragSource={dragSource}
            dropTarget={dropTarget}
            onDragStartCell={handleDragStartCell}
            onDragEndCell={handleDragEndCell}
            onDragEnterCell={handleDragEnterCell}
            onDragLeaveCell={handleDragLeaveCell}
            onDropCell={handleDropCell}
          />
        ))}
      </div>
      {song.length === 0 && placeholder ? (
        <div className="song-placeholder" aria-hidden="true">
          {placeholder}
        </div>
      ) : null}
      {youtubeUrl ? <YoutubeEmbed url={youtubeUrl} /> : null}
      {showHelp ? <EditorHelp /> : null}
    </div>
  );
}
