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

/** jsdom only focuses an editable element that also has a tab index. */
function focusableLyrics() {
  const lyrics = screen.getByLabelText("Letra de la canción");
  lyrics.tabIndex = 0;
  return lyrics;
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
    // A finished drag still guards the focus for a moment; let it end before the next test.
    if (vi.isFakeTimers()) vi.runOnlyPendingTimers();
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

  it("leaves the lyrics unfocused on arrival, so a phone's keyboard stays closed", () => {
    mockMatchMedia(true);
    renderEditor();

    expect(screen.getByLabelText("Letra de la canción")).not.toHaveFocus();
  });

  it("types a phone keyboard's composed word once", () => {
    mockMatchMedia(true);
    renderEditor("hola");
    const lyrics = screen.getByLabelText("Letra de la canción");
    const text = screen.getByText("la").firstChild as Text;
    lyrics.focus();
    window.getSelection()!.collapse(text, text.length);

    fireEvent.compositionStart(lyrics);
    for (const composed of ["s", "se"]) {
      const beforeInput = new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: false,
        inputType: "insertCompositionText",
        data: composed,
        isComposing: true,
      });
      fireEvent(lyrics, beforeInput);
      // The browser writes the composition into the DOM itself.
      text.data = "la" + composed;
      fireEvent.input(lyrics, { isComposing: true });
    }
    fireEvent.compositionEnd(lyrics, { data: "se" });

    expect(lyrics.querySelector("[data-lyrics-line]")).toHaveTextContent(
      /^holase$/,
    );
  });

  it("leaves the lyrics and the caret alone when a keyboard ends a composition without changes", () => {
    mockMatchMedia(true);
    renderEditor("hola\namor");
    const lyrics = screen.getByLabelText("Letra de la canción");
    const syllable = screen.getByText("la");
    const text = syllable.firstChild as Text;
    lyrics.focus();
    window.getSelection()!.collapse(text, 1);
    const collapse = vi.spyOn(Selection.prototype, "addRange");

    // A phone keyboard picks up the word next to the caret, then lets it go untouched.
    fireEvent.compositionStart(lyrics);
    fireEvent.compositionEnd(lyrics, { data: "hola" });

    expect(syllable).toBeInTheDocument();
    expect(collapse).not.toHaveBeenCalled();
    expect(window.getSelection()!.anchorNode).toBe(text);
    expect(window.getSelection()!.anchorOffset).toBe(1);
  });

  it("rebuilds only the line a keyboard's composed word went into", () => {
    mockMatchMedia(true);
    renderEditor("hola\namor");
    const lyrics = screen.getByLabelText("Letra de la canción");
    const otherLine = screen.getByText("mor");
    const text = screen.getByText("la").firstChild as Text;
    lyrics.focus();
    window.getSelection()!.collapse(text, text.length);

    fireEvent.compositionStart(lyrics);
    text.data = "lase";
    fireEvent.input(lyrics, { isComposing: true });
    fireEvent.compositionEnd(lyrics, { data: "se" });

    const lines = [...lyrics.querySelectorAll("[data-lyrics-line]")];
    expect(lines.map((line) => line.textContent)).toEqual(["holase", "amor"]);
    expect(otherLine).toBeInTheDocument();
  });

  it("puts the caret on the line a finger taps between two words, not at the start of the song", () => {
    mockMatchMedia(true);
    renderEditor("hola\nmi amor");
    const lyrics = focusableLyrics();
    const gap = screen.getByRole("button", { name: 'Unir sílabas "mi" y "a"' });
    // Not in jsdom.
    lyrics.setPointerCapture = () => {};

    fireEvent.pointerDown(gap, { button: 0, pointerId: 1 });
    lyrics.focus();
    fireEvent.click(gap);

    const lines = [...lyrics.querySelectorAll("[data-lyrics-line]")];
    const anchor = window.getSelection()!.anchorNode!;
    const caretLine = (anchor instanceof Element ? anchor : anchor.parentElement)!.closest(
      "[data-lyrics-line]",
    );
    expect(lines.indexOf(caretLine!)).toBe(1);
    expect(gap).toHaveAttribute("aria-pressed", "false");
  });

  it("keeps a phone keyboard's word out of the caret drawn on an empty line", () => {
    mockMatchMedia(true);
    renderEditor("hola\n\nchau");
    const lyrics = focusableLyrics();
    const emptyLine = lyrics.querySelectorAll("[data-lyrics-line]")[1]!;
    lyrics.focus();
    window.getSelection()!.collapse(emptyLine, 1);
    act(() => {
      document.dispatchEvent(new Event("selectionchange"));
    });

    // The keyboard writes the word itself, wherever the browser lets it: never inside the bar.
    expect(emptyLine.querySelector(".lyric-caret")).toHaveAttribute("contenteditable", "false");
  });

  it("reads a keyboard's multi-line paste as chords over the lyrics", () => {
    mockMatchMedia(true);
    const { container } = renderEditor("");
    const lyrics = screen.getByLabelText("Letra de la canción");
    lyrics.focus();
    window
      .getSelection()!
      .collapse(lyrics.querySelector("[data-lyrics-line]")!, 0);

    fireEvent(
      lyrics,
      new InputEvent("beforeinput", {
        bubbles: true,
        cancelable: true,
        inputType: "insertText",
        data: "A       D\nhola amor",
      }),
    );

    const lines = [...lyrics.querySelectorAll("[data-lyrics-line]")];
    expect(lines.map((line) => line.textContent)).toEqual(["holaamor"]);
    expect(chordChip(container, "A")).toBeDefined();
    expect(chordChip(container, "D")).toBeDefined();
  });

  it("shows the track toggles' hints above them on mobile", () => {
    mockMatchMedia(true);
    render(
      <ArticleChordEditor
        sheet={EXAMPLE_LINE}
        label="Editor de ejemplo"
        tools={["trackToggles", "underline"]}
      />,
    );

    const toggle = screen.getByRole("button", { name: "Acordes" });
    expect(toggle.closest(".icon-button-tooltip")).toHaveAttribute(
      "data-tooltip-side",
      "top",
    );
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

  it("keeps the keyboard closed while a chord is held to be dragged", async () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    const { container } = renderEditor(MOVE_EXCERPT);
    const chip = chordChip(container, "A");
    const lyrics = focusableLyrics();
    document.elementFromPoint = () => chip;

    touch("pointerdown", chip, 0);
    // The browser answers a long press inside editable text by putting a caret in it.
    await act(async () => lyrics.focus());
    expect(lyrics).not.toHaveFocus();
    act(() => void vi.advanceTimersByTime(TOUCH_DRAG_HOLD_MS));
    await act(async () => lyrics.focus());
    expect(lyrics).not.toHaveFocus();
    touch("pointerup", document, 0);
    await act(async () => lyrics.focus());
    expect(lyrics).not.toHaveFocus();
    // A moment later the lyrics can be tapped into again.
    act(() => void vi.advanceTimersByTime(400));
    await act(async () => lyrics.focus());
    expect(lyrics).toHaveFocus();
  });

  it("still lets a tap put the caret in the lyrics", async () => {
    mockMatchMedia(true);
    vi.useFakeTimers();
    const { container } = renderEditor(MOVE_EXCERPT);
    const lyrics = focusableLyrics();

    touch("pointerdown", chordChip(container, "A"), 0);
    touch("pointerup", document, 0);
    await act(async () => lyrics.focus());

    expect(lyrics).toHaveFocus();
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

describe("ArticleChordEditor tracks", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("exposes the chords track as a named group, not as a table row", () => {
    mockMatchMedia(false);
    const { container } = renderEditor();

    expect(screen.getAllByRole("group", { name: "Acordes" }).length).toBeGreaterThan(0);
    expect(container.querySelector('[role="row"]')).toBeNull();
  });

  it("keeps moving between a track's cells with the arrow keys", () => {
    mockMatchMedia(false);
    renderEditor();
    const [track] = screen.getAllByRole("group", { name: "Acordes" });
    const slotIds = [...track.querySelectorAll<HTMLElement>(".track-cell")].map((cell) => cell.dataset.slotId);
    act(() => track.querySelector<HTMLElement>(".track-cell")!.focus());
    expect(document.activeElement).toHaveAttribute("data-slot-id", slotIds[0]);

    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(document.activeElement).toHaveAttribute("data-slot-id", slotIds[1]);
  });
});
