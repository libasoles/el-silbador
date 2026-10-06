import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../../test/matchMedia";
import { TOUCH_DRAG_HOLD_MS } from "../../editor/touchDrag";
import { ArticleChordEditor, EXAMPLE_LINE, MOVE_EXCERPT } from "./ArticleChordEditor";

function renderEditor(sheet = EXAMPLE_LINE) {
  return render(<ArticleChordEditor sheet={sheet} label="Editor de ejemplo" />);
}

function chordChip(container: HTMLElement, chord: string) {
  return [...container.querySelectorAll<HTMLElement>(".track-cell--chip")].find(
    (chip) => chip.textContent === chord,
  )!;
}

function touch(type: string, target: Element | Document, x: number) {
  fireEvent(
    target,
    new PointerEvent(type, { bubbles: true, pointerId: 7, pointerType: "touch", isPrimary: true, clientX: x, clientY: 0 }),
  );
}

describe("ArticleChordEditor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    Reflect.deleteProperty(document, "elementFromPoint");
  });

  it("lets the lyrics be edited on desktop", () => {
    mockMatchMedia(false);
    renderEditor();

    expect(screen.getByLabelText("Letra de la canción")).toHaveAttribute("contenteditable", "true");
  });

  it("lets the lyrics be edited on mobile too, without a read-only notice", () => {
    mockMatchMedia(true);
    renderEditor();

    expect(screen.getByLabelText("Letra de la canción")).toHaveAttribute("contenteditable", "true");
    expect(screen.queryByText(/solo lectura/)).not.toBeInTheDocument();
  });

  it("opens a chord for editing with a double tap", () => {
    mockMatchMedia(true);
    const { container } = renderEditor();

    fireEvent.click(chordChip(container, "A7"));
    fireEvent.click(chordChip(container, "A7"));

    expect(screen.getByDisplayValue("A7")).toHaveFocus();
  });

  it("moves a chord to another syllable with a long press and a drag of the finger", () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    const { container } = renderEditor(MOVE_EXCERPT);
    const chip = chordChip(container, "A");
    const from = chip.dataset.slotId;
    const nun = screen.getByText("nun");
    // jsdom does no layout: the finger starts on the chip and ends over "nun".
    document.elementFromPoint = (x: number) => (x > 0 ? nun : chip);

    touch("pointerdown", chip, 0);
    act(() => void vi.advanceTimersByTime(TOUCH_DRAG_HOLD_MS));
    touch("pointermove", document, 40);
    touch("pointerup", document, 40);

    const moved = chordChip(container, "A");
    expect(moved.dataset.slotId).not.toBe(from);
    expect(chordChip(container, "A7")).toBeDefined();
  });

  it("leaves a quick swipe over a chord to the page's scrolling", () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    const { container } = renderEditor(MOVE_EXCERPT);
    const chip = chordChip(container, "A");
    const from = chip.dataset.slotId;
    const dragStart = vi.fn();
    chip.addEventListener("dragstart", dragStart);

    touch("pointerdown", chip, 0);
    touch("pointermove", document, 40);
    act(() => void vi.advanceTimersByTime(TOUCH_DRAG_HOLD_MS));
    touch("pointerup", document, 40);

    expect(dragStart).not.toHaveBeenCalled();
    expect(chordChip(container, "A").dataset.slotId).toBe(from);
  });
});
