import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AsciiTabs } from "ascii-tabs/ascii-tabs.js";
import { createInitialState, editorReducer, tabLineIds, type Action } from "../../core/state";
import type { EditorState, TabBlock } from "../../core/types";
import { mockMatchMedia } from "../../test/matchMedia";
import { useEditor } from "../useEditor";
import { useTabsToggle } from "../useTabsToggle";
import { SongView } from "./SongView";
import { TabsToggleButton } from "./TabsToggleButton";

const RIFF: TabBlock = { tabs: [[[3, null, null, null, null, null]]] };

function songState(text: string, ...actions: (Action | ((state: EditorState) => Action))[]): EditorState {
  let state = editorReducer(createInitialState(), { type: "setLyricsText", text });
  for (const action of actions) state = editorReducer(state, typeof action === "function" ? action(state) : action);
  return state;
}

let latest: EditorState;

function Editor({
  initial,
  canEdit = true,
  withTabsToggle = false,
  afterLoad,
}: {
  initial: EditorState;
  canEdit?: boolean;
  withTabsToggle?: boolean;
  /** An edit made once the song has loaded (loading turns every `TAB` line into a block). */
  afterLoad?: (actions: ReturnType<typeof useEditor>["actions"]) => void;
}) {
  const { state, actions } = useEditor(initial, false);
  const tabsToggle = useTabsToggle(state.song, canEdit);
  useLayoutEffect(() => {
    latest = state;
  });
  useLayoutEffect(() => {
    afterLoad?.(actions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <>
      {withTabsToggle && tabsToggle.available && <TabsToggleButton pressed={tabsToggle.pressed} onToggle={tabsToggle.toggle} />}
      <SongView
        song={state.song}
        lyricsText={state.lyricsText}
        bisGroups={state.bisGroups}
        merges={state.merges}
        tracks={state.tracks}
        cells={state.cells}
        chordVariants={state.chordVariants}
        pitchDirections={state.pitchDirections}
        showUnderline={state.showUnderline}
        showHelp={false}
        placeholder={null}
        canEdit={canEdit}
        onSetCellText={actions.setCellText}
        onSetChordVariant={actions.setChordVariant}
        onToggleMerge={actions.toggleSyllableMerge}
        onMoveCellText={actions.moveCellText}
        onDragPitchDirection={actions.dragPitchDirection}
        onReconcileLyricsText={actions.reconcileLyricsText}
        onToggleBis={actions.toggleBis}
        onPasteText={actions.pasteText}
        tabs={state.tabs}
        showTabs={withTabsToggle ? tabsToggle.showTabBlocks : true}
        onInsertTabBlock={tabsToggle.showForEditing}
        onSetTabBlock={actions.setTabBlock}
        onSetTabSpacing={actions.setTabSpacing}
        onRemoveTabBlock={actions.removeTabBlock}
      />
    </>
  );
}

/** jsdom only focuses an editable element that also has a tab index. (Found by its attribute:
 *  Testing Library's label queries trip over ascii-tabs' `<label>`.) */
function focusedLyrics() {
  const lyrics = document.querySelector<HTMLElement>('[aria-label="Letra de la canción"]')!;
  lyrics.tabIndex = 0;
  act(() => lyrics.focus());
  return lyrics;
}

function lyricLines() {
  return [...document.querySelectorAll<HTMLElement>("[data-lyrics-line]")];
}

/** The text node holding the end (or the start) of lyric line `index`. */
function textNodeOf(index: number, which: "first" | "last" = "last"): Text {
  const walker = document.createTreeWalker(lyricLines()[index]!, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return which === "first" ? nodes[0]! : nodes.at(-1)!;
}

function input(target: HTMLElement, inputType: string, data: string | null = null) {
  fireEvent(target, new InputEvent("beforeinput", { bubbles: true, cancelable: true, inputType, data }));
}

async function loadedTabs(): Promise<AsciiTabs> {
  return waitFor(() => {
    const element = document.querySelector<AsciiTabs>("ascii-tabs");
    if (!element?.querySelector(".ascii-tabs-sheet")) throw new Error("ascii-tabs has not rendered yet");
    return element;
  });
}

describe("SongView tab blocks", () => {
  it.each(["before", "after"] as const)("keeps native composition intact when writing %s a tablature", async side => {
    mockMatchMedia(false);
    render(<Editor initial={songState("TAB")} />);
    await loadedTabs();
    fireEvent.click(screen.getByRole("button", { name: side === "before" ? "Antes de la tablatura" : "Después de la tablatura" }));
    const lyrics = focusedLyrics();
    fireEvent.compositionStart(lyrics);
    expect(latest.lyricsText).toBe(side === "before" ? "\nTAB" : "TAB\n");
    const line = lyricLines()[side === "before" ? 0 : 1]!;
    line.insertBefore(document.createTextNode("canción"), line.firstChild);
    fireEvent.input(lyrics, { inputType: "insertCompositionText", data: "canción", isComposing: true });
    expect(latest.lyricsText).toBe(side === "before" ? "\nTAB" : "TAB\n");
    fireEvent.compositionEnd(lyrics, { data: "canción" });
    expect(latest.lyricsText).toBe(side === "before" ? "canción\nTAB" : "TAB\ncanción");
    expect(document.querySelectorAll("[data-tab-block]")).toHaveLength(1);
  });

  it.each(["before", "after"] as const)("pastes ASCII tablature %s a block without losing either block", async side => {
    mockMatchMedia(false);
    const initial = songState("TAB", state => ({ type: "setTabBlock", lineId: tabLineIds(state.song)[0]!, block: RIFF }));
    render(<Editor initial={initial} />);
    await loadedTabs();
    fireEvent.click(screen.getByRole("button", { name: side === "before" ? "Antes de la tablatura" : "Después de la tablatura" }));
    const lyrics = focusedLyrics();
    fireEvent.paste(lyrics, { clipboardData: { getData: () => "e|-5-\nB|---\nG|---\nD|---\nA|---\nE|---" } });
    await waitFor(() => expect(latest.lyricsText).toBe("TAB\nTAB"));
    const ids = tabLineIds(latest.song);
    expect(ids[side === "before" ? 1 : 0]).toBe(tabLineIds(initial.song)[0]);
    expect(latest.tabs[ids[side === "before" ? 1 : 0]!]).toEqual(RIFF);
    expect(latest.tabs[ids[side === "before" ? 0 : 1]!].tabs).toEqual([[[5, null, null, null, null, null]]]);
  });

  it("deletes an explicit selection after leaving a lateral cursor", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTAB\nnoche")} />);
    await loadedTabs();
    fireEvent.click(screen.getByRole("button", { name: "Antes de la tablatura" }));
    const lyrics = focusedLyrics();
    const from = textNodeOf(0);
    act(() => window.getSelection()!.setBaseAndExtent(from, from.length, textNodeOf(2, "first"), 0));
    fireEvent(document, new Event("selectionchange"));
    input(lyrics, "deleteContentBackward");
    expect(latest.lyricsText).toBe("unanoche");
  });

  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  beforeEach(() => { HTMLElement.prototype.scrollIntoView = vi.fn(); });
  afterEach(() => {
    if (originalScrollIntoView) HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
    else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
  });
  it("keeps vertical movement inside intermediate visual rows", async () => {
    mockMatchMedia(false);
    const longRiff: TabBlock = { tabs: [Array.from({ length: 80 }, () => [3, null, null, null, null, null])] };
    render(<Editor initial={songState("TAB", state => ({ type: "setTabBlock", lineId: tabLineIds(state.song)[0]!, block: longRiff }))} />);
    const element = await loadedTabs();
    const staves = element.querySelectorAll(".ascii-tabs-staff");
    expect(staves.length).toBeGreaterThan(2);
    fireEvent.pointerDown(staves[1]!.querySelector('[data-s="0"]')!, { button: 0 });
    const field = element.querySelector<HTMLInputElement>(".ascii-tabs-input")!;
    fireEvent.keyDown(field, { key: "ArrowUp" });
    expect(field).toHaveFocus();
    expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-s", "5");
    fireEvent.keyDown(field, { key: "ArrowDown" });
    expect(field).toHaveFocus();
    expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-s", "0");
    expect(latest.lyricsText).toBe("TAB");
    expect(element.value).toEqual(longRiff.tabs);
  });

  it.each(["TAB", "TAB\nnoche", "una\nTAB", "una\nTAB\nnoche"])("types from both sides of a block in %j without changing its frets", async text => {
    mockMatchMedia(false);
    const initial = songState(text, state => ({ type: "setTabBlock", lineId: tabLineIds(state.song)[0]!, block: RIFF }));
    render(<Editor initial={initial} />);
    const element = await loadedTabs();
    fireEvent.click(screen.getByRole("button", { name: "Antes de la tablatura" }));
    const lyrics = focusedLyrics();
    input(lyrics, "insertText", "hola");
    input(lyrics, "insertText", "!");
    expect(latest.lyricsText).toBe(text.replace("TAB", "hola!\nTAB"));
    fireEvent.click(screen.getByRole("button", { name: "Después de la tablatura" }));
    input(lyrics, "insertText", "fin");
    input(lyrics, "insertText", ".");
    expect(latest.lyricsText).toBe(text.replace("TAB", "hola!\nTAB\nfin."));
    expect(tabLineIds(latest.song)).toEqual(tabLineIds(initial.song));
    expect(element.value).toEqual(RIFF.tabs);
  });

  it("uses the shared position for clicks and slot exits between consecutive blocks", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("TAB\nTAB")} />);
    await loadedTabs();
    fireEvent.click(screen.getAllByRole("button", { name: "Después de la tablatura" })[0]!);
    expect(screen.getAllByRole("button", { name: "Antes de la tablatura" })[1]).toHaveAttribute("aria-pressed", "true");
    const lyrics = focusedLyrics();
    fireEvent.keyDown(lyrics, { key: "Enter" });
    expect(latest.lyricsText).toBe("TAB\n\nTAB");
    expect(screen.getAllByRole("button", { name: "Antes de la tablatura" })[1]).toHaveAttribute("aria-pressed", "true");
  });

  it("moves onto the new lyric line after Enter on the right", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("TAB")} />);
    await loadedTabs();
    fireEvent.click(screen.getByRole("button", { name: "Después de la tablatura" }));
    const lyrics = focusedLyrics();
    fireEvent.keyDown(lyrics, { key: "Enter" });
    expect(latest.lyricsText).toBe("TAB\n");
    expect(screen.getByRole("button", { name: "Después de la tablatura" })).toHaveAttribute("aria-pressed", "false");
    input(lyrics, "insertText", "noche");
    expect(latest.lyricsText).toBe("TAB\nnoche");
  });

  it("walks vertically from lyrics through the sides and stays at document boundaries", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTAB\nnoche")} />);
    await loadedTabs();
    const lyrics = focusedLyrics();
    act(() => window.getSelection()!.collapse(textNodeOf(0), 1));
    fireEvent.keyDown(lyrics, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Antes de la tablatura" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(lyrics, { key: "ArrowDown" });
    expect(screen.getByRole("button", { name: "Después de la tablatura" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(lyrics, { key: "ArrowDown" });
    expect(window.getSelection()!.anchorNode).toBe(textNodeOf(2, "first"));
    fireEvent.keyDown(lyrics, { key: "ArrowUp" });
    expect(screen.getByRole("button", { name: "Después de la tablatura" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(lyrics, { key: "ArrowUp" });
    expect(screen.getByRole("button", { name: "Antes de la tablatura" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(lyrics, { key: "ArrowUp" });
    input(lyrics, "insertText", "!");
    expect(latest.lyricsText).toBe("una!\nTAB\nnoche");
  });

  it("protects the block from lateral deletion and navigation adds no undo steps", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("TAB")} />);
    await loadedTabs();
    const lyrics = focusedLyrics();
    fireEvent.click(screen.getByRole("button", { name: "Antes de la tablatura" }));
    for (const key of ["ArrowUp", "ArrowLeft", "Backspace", "Delete"]) fireEvent.keyDown(lyrics, { key });
    expect(screen.getByRole("button", { name: "Antes de la tablatura" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(lyrics, { key: "ArrowRight" });
    for (const key of ["ArrowDown", "ArrowRight", "Backspace", "Delete"]) fireEvent.keyDown(lyrics, { key });
    input(lyrics, "deleteContentBackward");
    input(lyrics, "deleteContentForward");
    expect(screen.getByRole("button", { name: "Después de la tablatura" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(latest.lyricsText).toBe("TAB");
  });

  it.each([{ mobile: true, canEdit: true }, { mobile: false, canEdit: false }])("offers no lateral editing for %j", async ({ mobile, canEdit }) => {
    mockMatchMedia(mobile);
    render(<Editor initial={songState("TAB")} canEdit={canEdit} />);
    const element = await loadedTabs();
    expect(element).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Antes de la tablatura" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Después de la tablatura" })).toBeNull();
  });

  it.each(["ArrowUp", "ArrowDown"])("exits a slot at the visual boundary with %s and can insert lyrics", async key => {
    mockMatchMedia(false);
    render(<Editor initial={songState("TAB", state => ({ type: "setTabBlock", lineId: tabLineIds(state.song)[0]!, block: RIFF }))} />);
    const element = await loadedTabs();
    const string = key === "ArrowUp" ? 0 : 5;
    fireEvent.pointerDown(element.querySelector(`[data-c="0"][data-s="${string}"]`)!, { button: 0 });
    const field = element.querySelector<HTMLInputElement>(".ascii-tabs-input")!;
    fireEvent.keyDown(field, { key });
    const lyrics = document.querySelector<HTMLElement>('[aria-label="Letra de la canción"]')!;
    expect(lyrics).toHaveFocus();
    expect(screen.getByRole("button", { name: key === "ArrowUp" ? "Antes de la tablatura" : "Después de la tablatura" })).toHaveAttribute("aria-pressed", "true");
    expect(latest.lyricsText).toBe("TAB");
    input(lyrics, "insertText", "canto");
    expect(latest.lyricsText).toBe(key === "ArrowUp" ? "canto\nTAB" : "TAB\ncanto");
    expect(element.value).toEqual(RIFF.tabs);
  });

  it("walks consecutive tablatures once in each direction without editing the document", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTAB\nTAB\nnoche")} />);
    await loadedTabs();
    const lyrics = focusedLyrics();
    act(() => window.getSelection()!.collapse(textNodeOf(0), textNodeOf(0).length));
    const before = screen.getAllByRole("button", { name: "Antes de la tablatura" });
    const after = screen.getAllByRole("button", { name: "Después de la tablatura" });
    for (const target of [before[0], before[1], after[1]]) {
      fireEvent.keyDown(lyrics, { key: "ArrowRight" });
      expect(target).toHaveAttribute("aria-pressed", "true");
    }
    fireEvent.keyDown(lyrics, { key: "ArrowRight" });
    expect(window.getSelection()!.anchorNode).toBe(textNodeOf(3, "first"));
    expect(window.getSelection()!.anchorOffset).toBe(0);
    for (const target of [after[1], before[1], before[0]]) {
      fireEvent.keyDown(lyrics, { key: "ArrowLeft" });
      expect(target).toHaveAttribute("aria-pressed", "true");
    }
    fireEvent.keyDown(lyrics, { key: "ArrowLeft" });
    expect(window.getSelection()!.anchorNode).toBe(textNodeOf(0));
    expect(window.getSelection()!.anchorOffset).toBe(textNodeOf(0).length);
    expect(latest.lyricsText).toBe("una\nTAB\nTAB\nnoche");
  });

  it.each(["before", "after"] as const)("pastes a chord sheet %s a tablature, preserving its identity and undo history", async side => {
    mockMatchMedia(false);
    const initial = songState("TAB", state => ({ type: "setTabBlock", lineId: tabLineIds(state.song)[0]!, block: { ...RIFF, spacing: 4 } }));
    render(<Editor initial={initial} />);
    await loadedTabs();
    fireEvent.click(screen.getByRole("button", { name: side === "before" ? "Antes de la tablatura" : "Después de la tablatura" }));
    const lyrics = focusedLyrics();
    fireEvent.paste(lyrics, { clipboardData: { getData: () => "G\nuna noche" } });
    expect(latest.lyricsText).toBe(side === "before" ? "una noche\nTAB" : "TAB\nuna noche");
    expect(Object.values(latest.cells.chords ?? {})).toContain("G");
    expect(tabLineIds(latest.song)).toEqual(tabLineIds(initial.song));
    expect(latest.tabs).toEqual(initial.tabs);
    fireEvent.keyDown(window, { key: "z", metaKey: true });
    expect(latest.lyricsText).toBe("TAB");
    expect(latest.tabs).toEqual(initial.tabs);
    fireEvent.keyDown(window, { key: "z", metaKey: true, shiftKey: true });
    expect(latest.lyricsText).toBe(side === "before" ? "una noche\nTAB" : "TAB\nuna noche");
    expect(latest.tabs).toEqual(initial.tabs);
  });

  it("inserts a line before an isolated tablature and keeps its lateral caret", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("TAB")} />);
    await loadedTabs();
    fireEvent.click(screen.getByRole("button", { name: "Antes de la tablatura" }));
    const lyrics = focusedLyrics();
    expect(latest.lyricsText).toBe("TAB");
    fireEvent.keyDown(lyrics, { key: "Enter" });
    expect(latest.lyricsText).toBe("\nTAB");
    expect(screen.getByRole("button", { name: "Antes de la tablatura" })).toHaveAttribute("aria-pressed", "true");
  });

  afterEach(() => vi.unstubAllGlobals());

  it("keeps the tablature focused through edits inside the lyrics editor", async () => {
    mockMatchMedia(false);
    const scrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    try {
      render(<Editor initial={songState("una\nTAB\nnoche")} />);
      const element = await loadedTabs();
      fireEvent.pointerDown(element.querySelector(".ascii-tabs-cell")!, { button: 0 });
      const input = element.querySelector<HTMLInputElement>(".ascii-tabs-input")!;
      expect(input).toHaveFocus();
      fireEvent.keyDown(input, { key: "1" });
      expect(document.querySelector(".ascii-tabs-hint")).toBeNull();
      expect(input).toHaveFocus();
      for (const key of ["2", "ArrowRight", "ArrowDown", "5", "ArrowLeft", "ArrowUp"]) {
        fireEvent.keyDown(input, { key });
        expect(input).toHaveFocus();
      }
      expect(latest.tabs[tabLineIds(latest.song)[0]!].tabs).toEqual([
        [[12, null, null, null, null, null], [null, 5, null, null, null, null]],
      ]);
      expect(latest.lyricsText).toBe("una\nTAB\nnoche");
      expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-c", "0");
      expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-s", "0");
    } finally {
      if (scrollIntoView) HTMLElement.prototype.scrollIntoView = scrollIntoView;
      else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("leaves the arrows and Enter of a fret to the tablature, wherever the lyrics caret was left", async () => {
    mockMatchMedia(false);
    const scrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    try {
      render(<Editor initial={songState("una\nTAB\nnoche")} />);
      const element = await loadedTabs();
      focusedLyrics();
      act(() => window.getSelection()!.collapse(textNodeOf(2, "first"), 0));
      fireEvent.pointerDown(element.querySelector(".ascii-tabs-cell")!, { button: 0 });
      const input = element.querySelector<HTMLInputElement>(".ascii-tabs-input")!;
      act(() => input.focus());
      const selection = window.getSelection()!;
      const before = [selection.anchorNode, selection.anchorOffset];

      for (const [key, c, s] of [["ArrowDown", "0", "1"], ["ArrowRight", "1", "1"], ["Enter", "2", "1"]] as const) {
        fireEvent.keyDown(input, { key });
        expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-c", c);
        expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-s", s);
        expect([selection.anchorNode, selection.anchorOffset]).toEqual(before);
      }
      expect(latest.lyricsText).toBe("una\nTAB\nnoche");
    } finally {
      if (scrollIntoView) HTMLElement.prototype.scrollIntoView = scrollIntoView;
      else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it.each(["Enter", "Tab", " ", "blur"])("shows tabs when a typed TAB is confirmed with %j while the toggle is off", async (key) => {
    mockMatchMedia(false);
    render(<Editor initial={songState("TAB\nTA")} withTabsToggle />);
    const toggle = screen.getByRole("button", { name: "Tablaturas" });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    const lyrics = focusedLyrics();
    const typed = textNodeOf(1);
    act(() => window.getSelection()!.collapse(typed, typed.length));
    input(lyrics, "insertText", "B");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    const end = textNodeOf(1);
    act(() => window.getSelection()!.collapse(end, end.length));

    if (key === "blur") act(() => lyrics.blur());
    else fireEvent.keyDown(lyrics, { key });

    expect(latest.song.filter((line) => line.tab)).toHaveLength(2);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    await loadedTabs();
    expect(document.querySelectorAll("[data-tab-block]")).toHaveLength(2);
    expect(window.localStorage.getItem("el-silbador:tabs-toggle-visible")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector("[data-tab-block]")).toBeNull();
  });

  it("turns a typed TAB into a block once the author presses Enter", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTA")} />);
    const lyrics = focusedLyrics();
    const typed = textNodeOf(1);
    act(() => window.getSelection()!.collapse(typed, typed.length));

    input(lyrics, "insertText", "B");
    expect(document.querySelector("[data-tab-line]")).toBeNull();

    const end = textNodeOf(1);
    act(() => window.getSelection()!.collapse(end, end.length));
    fireEvent.keyDown(lyrics, { key: "Enter" });

    await loadedTabs();
    expect(lyricLines()[1]).toHaveAttribute("data-tab-line");
    expect(lyricLines()[1]!.textContent).not.toContain("TAB");
    expect(latest.lyricsText).toBe("una\nTAB\n");
  });

  it("shows a just-typed TAB like a structural keyword until it is confirmed", () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTA")} />);
    const lyrics = focusedLyrics();
    const typed = textNodeOf(1);
    act(() => window.getSelection()!.collapse(typed, typed.length));

    input(lyrics, "insertText", "B");

    expect(lyricLines()[1]).toHaveTextContent("TAB");
    expect(lyricLines()[1]!.closest(".line")).toHaveClass("line--tab-candidate");
  });

  it("offers no chord or note cells on a just-typed TAB", () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTA")} />);
    const lyrics = focusedLyrics();
    const typed = textNodeOf(1);
    act(() => window.getSelection()!.collapse(typed, typed.length));

    input(lyrics, "insertText", "B");

    const candidate = lyricLines()[1]!.closest(".line")!;
    expect(candidate.querySelectorAll(".track-cell")).toHaveLength(0);
    expect(lyricLines()[0]!.closest(".line")!.querySelectorAll(".track-cell").length).toBeGreaterThan(0);
  });

  it.each(["Tab", " "])("turns a typed TAB into a block once the author presses %j", async (key) => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTA")} />);
    const lyrics = focusedLyrics();
    const typed = textNodeOf(1);
    act(() => window.getSelection()!.collapse(typed, typed.length));
    input(lyrics, "insertText", "B");
    const end = textNodeOf(1);
    act(() => window.getSelection()!.collapse(end, end.length));

    fireEvent.keyDown(lyrics, { key });

    await loadedTabs();
    expect(latest.lyricsText).toBe("una\nTAB");
  });

  it("leaves a TAB the caret was not on as lyrics, such as one undo brought back", () => {
    mockMatchMedia(false);
    render(
      <Editor
        initial={songState("una\nnoche")}
        afterLoad={(actions) => actions.reconcileLyricsText("una\nTAB\nnoche", { textLineIndexes: [1] })}
      />,
    );
    expect(latest.lyricsText).toBe("una\nTAB\nnoche");
    focusedLyrics();

    act(() => window.getSelection()!.collapse(textNodeOf(0), 1));
    fireEvent(document, new Event("selectionchange"));
    act(() => window.getSelection()!.collapse(textNodeOf(2, "first"), 0));
    fireEvent(document, new Event("selectionchange"));

    expect(document.querySelector("[data-tab-line]")).toBeNull();
  });

  it("never inserts a block on mobile, typed or pasted", () => {
    mockMatchMedia(true);
    render(<Editor initial={songState("una\nTA")} />);
    const lyrics = focusedLyrics();
    const typed = textNodeOf(1);
    act(() => window.getSelection()!.collapse(typed, typed.length));
    input(lyrics, "insertText", "B");
    const end = textNodeOf(1);
    act(() => window.getSelection()!.collapse(end, end.length));
    fireEvent.keyDown(lyrics, { key: "Enter" });

    const staff = ["1 -3--", "2 ----", "3 ----", "4 ----", "5 ----", "6 ----"].join("\n");
    fireEvent.paste(lyrics, { clipboardData: { getData: () => staff } });

    expect(latest.lyricsText.startsWith("una\nTAB\n")).toBe(true);
    expect(latest.song.some((line) => line.tab)).toBe(false);
  });

  it("keeps typing into the grid out of the lyrics", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTAB")} />);
    const element = await loadedTabs();

    const field = element.querySelector("input")!;
    fireEvent.keyDown(field, { key: "5" });
    input(field, "insertText", "5");

    expect(latest.lyricsText).toBe("una\nTAB");
  });

  it("does not delete a block with Backspace at the start of the line after it", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTAB\nnoche")} />);
    await loadedTabs();
    const lyrics = focusedLyrics();
    act(() => window.getSelection()!.collapse(textNodeOf(2, "first"), 0));

    input(lyrics, "deleteContentBackward");

    expect(latest.lyricsText).toBe("una\nTAB\nnoche");
    expect(document.querySelector("[data-tab-line]")).not.toBeNull();
  });

  it("deletes a block inside a deleted selection, and undo brings it back with its content", async () => {
    mockMatchMedia(false);
    const initial = songState("una\nTAB\nnoche", (state) => ({ type: "setTabBlock", lineId: tabLineIds(state.song)[0]!, block: RIFF }));
    render(<Editor initial={initial} />);
    await loadedTabs();
    const lyrics = focusedLyrics();
    const from = textNodeOf(0);
    const to = textNodeOf(2, "first");
    act(() => window.getSelection()!.setBaseAndExtent(from, from.length, to, 0));

    input(lyrics, "deleteContentBackward");
    expect(latest.lyricsText).toBe("unanoche");
    expect(document.querySelector("[data-tab-line]")).toBeNull();

    fireEvent.keyDown(window, { key: "z", metaKey: true });
    const element = await loadedTabs();
    expect(latest.lyricsText).toBe("una\nTAB\nnoche");
    expect(element.value).toEqual(RIFF.tabs);
  });

  it("deletes the block from its last Tab's delete button", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTAB\nnoche")} />);
    const element = await loadedTabs();

    fireEvent.click(element.querySelector(".ascii-tabs-delete")!);

    expect(latest.lyricsText).toBe("una\nnoche");
  });

  it("turns pasted ASCII tablatures into blocks in their places, with the chords as before", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una")} />);
    const lyrics = focusedLyrics();
    const end = textNodeOf(0);
    act(() => window.getSelection()!.collapse(end, end.length));
    const staff = (fret: number) => [`1 -${fret}--`, "2 ----", "3 ----", "4 ----", "5 ----", "6 ----"].join("\n");

    fireEvent.paste(lyrics, {
      clipboardData: { getData: () => `\nG\nnoche\n${staff(3)}\ntibia\n${staff(5)}` },
    });

    await waitFor(() => expect(latest.lyricsText).toBe("una\nnoche\nTAB\ntibia\nTAB"));
    const [first, second] = tabLineIds(latest.song);
    expect(latest.tabs[first!]).toEqual({ tabs: [[[3, null, null, null, null, null]]] });
    expect(latest.tabs[second!]).toEqual({ tabs: [[[5, null, null, null, null, null]]] });
    expect(Object.values(latest.cells.chords ?? {})).toContain("G");
  });

  it("gives a tablature pasted mid-line a line of its own", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una noche")} />);
    const lyrics = focusedLyrics();
    const first = textNodeOf(0, "first");
    act(() => window.getSelection()!.collapse(first, first.length));
    const staff = ["e|-0-", "B|---", "G|---", "D|---", "A|---", "E|---"].join("\n");

    fireEvent.paste(lyrics, { clipboardData: { getData: () => staff } });

    await waitFor(() => expect(latest.song.some((line) => line.tab)).toBe(true));
    expect(latest.lyricsText.split("\n")).toContain("TAB");
    expect(latest.lyricsText.split("\n")).toHaveLength(3);
  });

  it("shows the block read-only on mobile, even where the lyrics are editable", async () => {
    mockMatchMedia(true);
    render(<Editor initial={songState("una\nTAB")} />);

    const element = await loadedTabs();

    expect(element).toHaveAttribute("readonly");
  });

  it("shows the block read-only to a reader", async () => {
    mockMatchMedia(false);
    render(<Editor initial={songState("una\nTAB")} canEdit={false} />);

    const element = await loadedTabs();

    expect(element).toHaveAttribute("readonly");
  });
});
