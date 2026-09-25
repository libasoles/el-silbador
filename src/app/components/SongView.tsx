import { useLayoutEffect, useRef, useState } from "react";
import { parseChordSheet, type ChordPlacement } from "../../core/chordSheet";
import { previousChordNotesBySlot } from "../../core/chordNotes";
import { getLineCellSlots } from "../../core/model";
import { getCell } from "../../core/state";
import type { CellsByTrack, Song, TrackDef, TrackId } from "../../core/types";
import { ChordIcon, NoteStackIcon, UnderlineIcon } from "./icons";
import { LineView } from "./LineView";

interface DragCell {
  trackId: TrackId;
  slotId: string;
}

interface SongViewProps {
  song: Song;
  merges: ReadonlySet<string>;
  tracks: TrackDef[];
  cells: CellsByTrack;
  showUnderline: boolean;
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
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
  // boundary so beforeinput can perform the edit through the document model.
  if (node === root) {
    const nextLine = Array.from(root.childNodes)
      .slice(nodeOffset)
      .find(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && child.matches("[data-lyrics-line]"),
      );
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

function restoreCaret(root: HTMLElement, position: CaretPosition) {
  const line =
    root.querySelectorAll<HTMLElement>("[data-lyrics-line]")[
      position.lineIndex
    ];
  if (!line) return;
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let remaining = position.offset;
  let node = walker.nextNode();
  while (node) {
    const length = node.textContent?.length ?? 0;
    if (remaining <= length) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      return;
    }
    remaining -= length;
    node = walker.nextNode();
  }
  const range = document.createRange();
  range.selectNodeContents(line);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

// Only a single collapsed character insertion (including one step of IME composition) is left to
// the browser's native fast path — it mutates one text node in place and never touches element
// structure. Every other input type is intercepted in `handleBeforeInput` below.
const NATIVE_FAST_PATH_TYPES = new Set([
  "insertText",
  "insertCompositionText",
  "insertReplacementText",
]);

export function SongView({
  song,
  merges,
  tracks,
  cells,
  showUnderline,
  onSetCellText,
  onToggleMerge,
  onMoveCellText,
  onReconcileLyricsText,
  onPasteText,
}: SongViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<CaretPosition | null>(null);
  const hasVisibleAnnotations = tracks.some((track) => track.visible);

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
    root.focus({ preventScroll: true });
    if (!captureCaret(root)) restoreCaret(root, { lineIndex: 0, offset: 0 });
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
    if ((event.target as HTMLElement).closest("[data-track]")) return;
    const inputType = event.inputType;

    const root = rootRef.current;
    if (!root) return;
    const selection = window.getSelection();
    const range = captureSelectionRange(root);
    if (!selection || !range) return;

    if (NATIVE_FAST_PATH_TYPES.has(inputType) && selection.isCollapsed) return;

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
        contentEditable
        suppressContentEditableWarning
        spellCheck={false}
        aria-label="Letra de la canción"
        onFocus={(event) => {
          // React focus events bubble from chord/note inputs too; only the editing host itself
          // should establish a lyric caret.
          if (event.target === event.currentTarget) focusDocument();
        }}
        onClick={(event) => {
          if (!isDocumentControl(event.target)) focusDocument();
        }}
        onInput={(event) => {
          if ((event.target as HTMLElement).closest("[data-track]")) return;
          commit();
        }}
        onKeyDown={handleKeyDown}
        onPaste={(event) => {
          if ((event.target as HTMLElement).closest("[data-track]")) return;
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
          <div className="syllable-row document-empty-line" data-lyrics-line />
        ) : null}
        {song.map((line) => (
          <LineView
            key={line.id}
            line={line}
            merges={merges}
            tracks={tracks}
            cells={cells}
            previousChordNotes={previousChordNotes}
            onSetCellText={onSetCellText}
            onToggleMerge={onToggleMerge}
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
            arriba de la línea de letra que les corresponde, y Silabeo los va a
            detectar solo. Por ejemplo:
          </p>
          <pre>
            {
              "Bm              B7   Em\nPor mas que la dicha busco\nA7        D    F#7\nVivo penando"
            }
          </pre>
          <ul className="song-placeholder__list">
            <li>
              <ChordIcon />
              <span>Muestra u oculta la fila de acordes arriba de la letra.</span>
            </li>
            <li>
              <UnderlineIcon />
              <span>Muestra u oculta la línea debajo de cada sílaba.</span>
            </li>
            <li>
              <NoteStackIcon />
              <span>
                Muestra, debajo de la línea, las notas que forman cada acorde,
                por ejemplo do-mi-sol para un Do mayor.
              </span>
            </li>
          </ul>
          <p>
            La separación en sílabas funciona para español. No hay garantía de
            que funcione correctamente en otros idiomas.
          </p>
        </div>
      ) : null}
    </div>
  );
}
