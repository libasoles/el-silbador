import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the tablature focused through edits and hint dismissal inside the lyrics editor", async () => {
    mockMatchMedia(false);
    window.localStorage.removeItem("el-silbador:tab-hint-dismissed");
    const scrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    try {
      render(<Editor initial={songState("una\nTAB\nnoche")} />);
      const element = await loadedTabs();
      fireEvent.pointerDown(element.querySelector(".ascii-tabs-cell")!, { button: 0 });
      const input = element.querySelector<HTMLInputElement>(".ascii-tabs-input")!;
      expect(input).toHaveFocus();
      vi.useFakeTimers();
      fireEvent.keyDown(input, { key: "1" });
      act(() => vi.advanceTimersByTime(2_000));
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
      vi.useRealTimers();
      window.localStorage.removeItem("el-silbador:tab-hint-dismissed");
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
