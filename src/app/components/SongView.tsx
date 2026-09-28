import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { parseChordSheet, type ChordPlacement } from "../../core/chordSheet";
import { previousChordNotesBySlot } from "../../core/chordNotes";
import { columnForSlot, getLineCellSlots } from "../../core/model";
import { getCell } from "../../core/state";
import type { CellsByTrack, Song, TrackDef, TrackId } from "../../core/types";
import { EditorHelp } from "./EditorHelp";
import { LineView } from "./LineView";

interface DragCell {
  trackId: TrackId;
  slotId: string;
}

interface SongViewProps {
  song: Song;
  lyricsText: string;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  chordVariants: Record<string, number>;
  showUnderline: boolean;
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
  onReconcileLyricsText: (text: string) => void;
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
  for (let lineIndex = start.lineIndex; lineIndex <= end.lineIndex; lineIndex++) {
    const lineStartCol = lineIndex === start.lineIndex ? start.offset : 0;
    const lineEndCol = lineIndex === end.lineIndex ? end.offset : lines[lineIndex].length;
    const lineSlice = lines[lineIndex].slice(lineStartCol, lineEndCol);

    const modelLine = song[lineIndex];
    const tokens: { column: number; chord: string }[] = [];
    if (modelLine) {
      for (const slotId of getLineCellSlots(modelLine, merges)) {
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
      for (const token of tokens) chordLine = chordLine.padEnd(token.column, " ") + token.chord;
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
        placeCaretAt(parent, Array.from(parent.childNodes).indexOf(node as ChildNode));
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

function restoreCaret(root: HTMLElement, position: CaretPosition) {
  const line =
    root.querySelectorAll<HTMLElement>("[data-lyrics-line]")[
      position.lineIndex
    ];
  if (!line) return;
  const remaining = walkAndPlaceCaret(Array.from(line.childNodes), position.offset);
  if (remaining === -1) return;
  const range = document.createRange();
  range.selectNodeContents(line);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
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
  merges,
  tracks,
  cells,
  chordVariants,
  showUnderline,
  canEdit,
  onSetCellText,
  onSetChordVariant,
  onToggleMerge,
  onMoveCellText,
  onReconcileLyricsText,
  onPasteText,
}: SongViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<CaretPosition | null>(null);
  const hasVisibleAnnotations = tracks.some(
    (track) => track.visible && track.id !== "chordNotes",
  );
  const lyricLines = lyricsText.split("\n");

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
  const chordSlotOrder = song.flatMap((line) => getLineCellSlots(line, merges));
  const previousChordNotes = previousChordNotesBySlot(
    chordSlotOrder,
    (slotId) => getCell(cells, "chords", slotId),
  );

  // Drag state lives here, above every line, so a chord chip can be dragged from one line's
  // track row and dropped onto a slot in a different line — not just within the same line.
  const [dragSource, setDragSource] = useState<DragCell | null>(null);
  const [dropTarget, setDropTarget] = useState<DragCell | null>(null);

  function handleDragStartCell(trackId: TrackId, slotId: string) {
    setDragSource({ trackId, slotId });
  }

  function handleDragEndCell() {
    setDragSource(null);
    setDropTarget(null);
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
          focusDocument();
          setIsFocused(true);
          setCaretLineIndex(captureCaret(event.currentTarget)?.lineIndex ?? null);
        }}
        onBlur={(event) => {
          if (event.target === event.currentTarget) setIsFocused(false);
        }}
        onClick={(event) => {
          if (!isDocumentControl(event.target)) focusDocument();
        }}
        onInput={(event) => {
          if (!canEdit) return;
          if ((event.target as HTMLElement).closest("[data-track]")) return;
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
          if (flatOffset(lines, start) > flatOffset(lines, end)) [start, end] = [end, start];
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
            {isFocused ? <span className="lyric-caret" aria-hidden="true" /> : null}
          </div>
        ) : null}
        {song.map((line, index) => (
          <LineView
            key={line.id}
            line={line}
            trailingWhitespace={lyricLines[index]?.match(/\s+$/)?.[0] ?? ""}
            merges={merges}
            showUnderline={showUnderline}
            tracks={tracks}
            cells={cells}
            chordVariants={chordVariants}
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
      {song.length === 0 ? (
        <div className="song-placeholder" aria-hidden="true">
          <p>Escribí o pegá la letra de una canción para empezar.</p>
          <p>
            También podés pegar el texto con los acordes ya incluidos, ubicados
            arriba de la línea de letra que les corresponde, y Silbador los va a
            detectar solo. Por ejemplo:
          </p>
          <pre>
            {
              "Bm              B7   Em\nPor mas que la dicha busco\nA7        D    F#7\nVivo penando"
            }
          </pre>
        </div>
      ) : null}
      <EditorHelp />
    </div>
  );
}
