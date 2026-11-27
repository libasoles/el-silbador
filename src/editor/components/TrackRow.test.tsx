import { act, fireEvent, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrackId } from "../../core/types";
import { mockMatchMedia } from "../../test/matchMedia";
import { TrackRow } from "./TrackRow";

const drag = {
  draggedSlotId: null,
  onDragStart: vi.fn(),
  onDragEnd: vi.fn(),
  onDragEnter: vi.fn(),
  onDragLeave: vi.fn(),
  onDrop: vi.fn(),
};

function row(trackId: TrackId, slotIds: string[]) {
  return (
    <TrackRow
      key={trackId + slotIds[0]}
      trackId={trackId}
      label={trackId}
      slotIds={slotIds}
      slotRects={{}}
      cells={{}}
      chordVariants={{}}
      onSetCellText={() => {}}
      onSetChordVariant={() => {}}
      drag={drag}
      slotPositions={new Map()}
    />
  );
}

describe("TrackRow Tab navigation", () => {
  beforeEach(() => mockMatchMedia(false));

  it("moves to the next verse's cells of the same track, skipping the chords track", () => {
    const { container } = render(
      <div>
        {row("vocalNotes", ["a1", "a2"])}
        {row("chords", ["c1", "c2"])}
        {row("vocalNotes", ["b1", "b2"])}
        {row("chords", ["c3"])}
      </div>,
    );
    const cell = (id: string) => container.querySelector<HTMLElement>(`[data-slot-id="${id}"]`)!;

    act(() => cell("a2").focus());
    fireEvent.keyDown(cell("a2"), { key: "Tab" });
    expect(document.activeElement).toBe(cell("b1"));
  });

  it("Shift+Tab goes back within the same track", () => {
    const { container } = render(
      <div>
        {row("vocalNotes", ["a1"])}
        {row("chords", ["c1"])}
        {row("vocalNotes", ["b1"])}
      </div>,
    );
    const cell = (id: string) => container.querySelector<HTMLElement>(`[data-slot-id="${id}"]`)!;

    act(() => cell("b1").focus());
    fireEvent.keyDown(cell("b1"), { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(cell("a1"));
  });
});
