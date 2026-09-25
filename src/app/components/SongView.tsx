import { useLayoutEffect, useRef, useState } from "react";
import { parseChordSheet, type ChordPlacement } from "../../core/chordSheet";
import type { CellsByTrack, Song, TrackDef, TrackId } from "../../core/types";
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
  onSetCellText: (trackId: TrackId, slotId: string, text: string) => void;
  onToggleMerge: (lineId: string, aId: string, bId: string) => void;
  onMoveCellText: (trackId: TrackId, fromSlotId: string, toSlotId: string) => void;
  onReconcileLyricsText: (text: string) => void;
  onPasteText: (text: string, startLineIndex: number, startOffset: number, placements: ChordPlacement[]) => void;
}

interface CaretPosition {
  lineIndex: number;
  offset: number;
}

function lineText(line: HTMLElement): string {
  return (line.innerText || "").replaceAll("\u00a0", " ");
}

function readDocument(root: HTMLElement): string {
  return Array.from(root.querySelectorAll<HTMLElement>("[data-lyrics-line]")).map(lineText).join("\n");
}

function positionForBoundary(root: HTMLElement, node: Node, nodeOffset: number): CaretPosition | null {
  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const line = element?.closest<HTMLElement>("[data-lyrics-line]");
  if (!line || !root.contains(line)) return null;
  const range = document.createRange();
  range.selectNodeContents(line);
  try {
    range.setEnd(node, nodeOffset);
  } catch {
    return null;
  }
  return { lineIndex: Array.from(root.querySelectorAll("[data-lyrics-line]")).indexOf(line), offset: range.toString().length };
}

function captureCaret(root: HTMLElement): CaretPosition | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  return positionForBoundary(root, selection.anchorNode!, selection.anchorOffset);
}

function restoreCaret(root: HTMLElement, position: CaretPosition) {
  const line = root.querySelectorAll<HTMLElement>("[data-lyrics-line]")[position.lineIndex];
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

function insertPlainText(root: HTMLElement, text: string) {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return;

  range.deleteContents();
  const fragment = document.createDocumentFragment();
  const lines = text.replaceAll("\r\n", "\n").split("\n");
  for (const [index, line] of lines.entries()) {
    fragment.append(document.createTextNode(line));
    if (index < lines.length - 1) fragment.append(document.createElement("br"));
  }
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (!lastNode) return;
  range.setStartAfter(lastNode);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

export function SongView({
  song,
  merges,
  tracks,
  cells,
  onSetCellText,
  onToggleMerge,
  onMoveCellText,
  onReconcileLyricsText,
  onPasteText,
}: SongViewProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pendingCaret = useRef<CaretPosition | null>(null);
  const hasVisibleAnnotations = tracks.some((track) => track.visible);

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

  function commit() {
    const root = rootRef.current;
    if (!root) return;
    pendingCaret.current = captureCaret(root);
    onReconcileLyricsText(readDocument(root));
  }

  useLayoutEffect(() => {
    const root = rootRef.current;
    const caret = pendingCaret.current;
    if (root && caret) restoreCaret(root, caret);
    pendingCaret.current = null;
  }, [song]);

  return (
    <div
      ref={rootRef}
      className={
        "song" +
        (song.length === 0 ? " song--empty" : "") +
        (!hasVisibleAnnotations ? " song--annotations-hidden" : "")
      }
      contentEditable
      suppressContentEditableWarning
      spellCheck
      aria-label="Letra de la canción"
      onInput={(event) => {
        if ((event.target as HTMLElement).closest("[data-track]")) return;
        commit();
      }}
      onPaste={(event) => {
        event.preventDefault();
        const root = rootRef.current;
        if (!root) return;
        const selection = window.getSelection();
        if (!selection?.rangeCount) return;
        const pasteRange = selection.getRangeAt(0);
        const start = positionForBoundary(root, pasteRange.startContainer, pasteRange.startOffset);

        const { lyricsText, placements } = parseChordSheet(event.clipboardData.getData("text/plain"));
        insertPlainText(root, lyricsText);
        pendingCaret.current = captureCaret(root);
        const text = readDocument(root);
        if (start) {
          onPasteText(text, start.lineIndex, start.offset, placements);
        } else {
          onReconcileLyricsText(text);
        }
      }}
    >
      {song.length === 0 ? <div className="syllable-row document-empty-line" data-lyrics-line /> : null}
      {song.map((line) => (
        <LineView
          key={line.id}
          line={line}
          merges={merges}
          tracks={tracks}
          cells={cells}
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
  );
}
