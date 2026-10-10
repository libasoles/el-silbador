import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { AsciiTabs } from "ascii-tabs/ascii-tabs.js";
import type { TabBlock as TabBlockContent } from "../../core/types";
import { TabBlock } from "./TabBlock";
import * as asciiTabsLoader from "../asciiTabsLoader";

const ONE_TAB: TabBlockContent = { tabs: [[[3, null, null, null, null, null]]] };
const TWO_TABS: TabBlockContent = { tabs: [[[3, null, null, null, null, null]], [[null, 5, null, null, null, null]]] };
const EMPTY_TAB: TabBlockContent = { tabs: [[]] };

function ControlledBlock() {
  const [block, setBlock] = useState(EMPTY_TAB);
  return <TabBlock block={block} readOnly={false} onChange={tabs => setBlock({ tabs })} />;
}

async function renderBlock(props: Partial<Parameters<typeof TabBlock>[0]> = {}) {
  const view = render(<TabBlock block={ONE_TAB} readOnly={false} {...props} />);
  const element = await waitFor(() => {
    const found = view.container.querySelector<AsciiTabs>("ascii-tabs");
    if (!found?.querySelector(".ascii-tabs-sheet")) throw new Error("ascii-tabs has not rendered yet");
    return found;
  });
  return { ...view, element };
}

describe("TabBlock", () => {
  it("draws six strings with note skeletons per sheet while loading, then shows the frets", async () => {
    const module = await asciiTabsLoader.loadAsciiTabs();
    let finishLoading!: (result: typeof module) => void;
    const pending = new Promise<typeof module>(resolve => { finishLoading = resolve; });
    const loaded = vi.spyOn(asciiTabsLoader, "loadedAsciiTabs").mockReturnValue(null);
    const load = vi.spyOn(asciiTabsLoader, "loadAsciiTabs").mockReturnValue(pending);
    try {
      const view = render(<TabBlock block={TWO_TABS} readOnly />);
      const sheets = view.container.querySelectorAll(".tab-block__placeholder-sheet");
      expect(sheets).toHaveLength(2);
      for (const sheet of sheets) {
        expect(Array.from(sheet.children, line => line.textContent)).toEqual(
          ["e|", "B|", "G|", "D|", "A|", "E|"].map(label => label + "-".repeat(512)),
        );
        for (const line of sheet.children) {
          expect(line.querySelectorAll(".skeleton.tab-block__placeholder-note").length).toBeGreaterThan(0);
        }
      }
      expect(view.container.querySelector("ascii-tabs")).toBeNull();

      await act(async () => { finishLoading(module); });

      expect(view.container.querySelector(".tab-block__placeholder")).toBeNull();
      expect(view.container.querySelector(".tab-block__placeholder-note")).toBeNull();
      expect(view.container.querySelector<AsciiTabs>("ascii-tabs")?.value).toEqual(TWO_TABS.tabs);
    } finally {
      loaded.mockRestore();
      load.mockRestore();
    }
  });

  it("preserves typing and all four arrows across controlled content updates", async () => {
    const scrollIntoView = HTMLElement.prototype.scrollIntoView;
    HTMLElement.prototype.scrollIntoView = vi.fn();
    try {
      const view = render(<ControlledBlock />);
      const element = await waitFor(() => {
        const found = view.container.querySelector<AsciiTabs>("ascii-tabs");
        if (!found?.querySelector(".ascii-tabs-cell")) throw new Error("ascii-tabs has not rendered yet");
        return found;
      });
      fireEvent.pointerDown(element.querySelector(".ascii-tabs-cell")!, { button: 0 });
      const input = element.querySelector<HTMLInputElement>(".ascii-tabs-input")!;
      for (const key of ["1", "2", "ArrowRight", "ArrowDown", "5", "ArrowLeft", "ArrowUp"]) {
        fireEvent.keyDown(input, { key });
        expect(input).toHaveFocus();
        expect(element.querySelector(".ascii-tabs-cur")).not.toBeNull();
      }
      expect(element.value).toEqual([[[12, null, null, null, null, null], [null, 5, null, null, null, null]]]);
      expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-c", "0");
      expect(element.querySelector(".ascii-tabs-cur")).toHaveAttribute("data-s", "0");
    } finally {
      if (scrollIntoView) HTMLElement.prototype.scrollIntoView = scrollIntoView;
      else Reflect.deleteProperty(HTMLElement.prototype, "scrollIntoView");
    }
  });

  it("uses the flat ascii-tabs sheet variant", async () => {
    const { element } = await renderBlock();

    expect(element).toHaveAttribute("variant", "flat");
  });

  it("pastes and duplicates a group through controlled updates without editing the surrounding lyrics", async () => {
    const onPaste = vi.fn();
    const onKeyDown = vi.fn();
    const view = render(<div onPaste={onPaste} onKeyDown={onKeyDown}><ControlledBlock /></div>);
    const element = await waitFor(() => {
      const found = view.container.querySelector<AsciiTabs>("ascii-tabs");
      if (!found?.querySelector(".ascii-tabs-cell")) throw new Error("ascii-tabs has not rendered yet");
      return found;
    });
    fireEvent.pointerDown(element.querySelector('.ascii-tabs-cell[data-c="0"][data-s="0"]')!, { button: 0 });
    fireEvent.pointerUp(window);
    const input = element.querySelector<HTMLInputElement>(".ascii-tabs-input")!;
    fireEvent.paste(input, { clipboardData: { getData: () => "e|-3--5-\nB|-7----\nG|------\nD|------\nA|------\nE|------" } });
    const group = [[3, 7, null, null, null, null], [5, null, null, null, null, null]];
    expect(element.value).toEqual([group]);
    expect(element.querySelectorAll(".ascii-tabs-selected")).toHaveLength(3);

    fireEvent.keyDown(input, { key: "ArrowRight", altKey: true });

    expect(element.value).toEqual([[...group, ...group]]);
    expect(element.querySelectorAll(".ascii-tabs-selected")).toHaveLength(3);
    expect(input).toHaveFocus();
    expect(onPaste).not.toHaveBeenCalled();
    expect(onKeyDown).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Delete" });
    expect(element.value[0].slice(0, 2)).toEqual(group);
    expect(element.querySelectorAll(".ascii-tabs-selected")).toHaveLength(0);
  });

  it("saves a dragged group while preserving its relative string and column positions", async () => {
    const view = render(<ControlledBlock />);
    const element = await waitFor(() => {
      const found = view.container.querySelector<AsciiTabs>("ascii-tabs");
      if (!found?.querySelector(".ascii-tabs-cell")) throw new Error("ascii-tabs has not rendered yet");
      return found;
    });
    const cell = (c: number, s: number) => element.querySelector<HTMLElement>(`.ascii-tabs-cell[data-c="${c}"][data-s="${s}"]`)!;
    fireEvent.pointerDown(cell(0, 0), { button: 0 });
    fireEvent.pointerUp(window);
    fireEvent.paste(element.querySelector(".ascii-tabs-input")!, {
      clipboardData: { getData: () => "e|-3--5-\nB|-7----\nG|------\nD|------\nA|------\nE|------" },
    });
    // jsdom has no hit testing; provide the cell under the release point.
    const original = document.elementFromPoint;
    document.elementFromPoint = () => cell(1, 1);
    try {
      fireEvent.pointerDown(cell(0, 0), { button: 0, pointerId: 1, pointerType: "mouse", clientX: 0, clientY: 0 });
      fireEvent.pointerMove(window, { pointerId: 1, clientX: 20, clientY: 20 });
      expect(element.querySelectorAll(".ascii-tabs-drag-preview .ascii-tabs-fret")).toHaveLength(3);
      fireEvent.pointerUp(window, { pointerId: 1, clientX: 20, clientY: 20 });
      expect(element.value[0].slice(0, 3)).toEqual([
        [null, null, null, null, null, null],
        [null, 3, 7, null, null, null],
        [null, 5, null, null, null, null],
      ]);
      expect(element.querySelectorAll(".ascii-tabs-selected")).toHaveLength(3);
      expect(element.querySelector(".ascii-tabs-drag-preview")).toBeNull();
    } finally {
      if (original) document.elementFromPoint = original;
      else Reflect.deleteProperty(document, "elementFromPoint");
    }
  });

  it("draws the block's content in Spanish", async () => {
    const { element } = await renderBlock();

    expect(element.getAttribute("lang")).toBe("es");
    expect(element.value).toEqual(ONE_TAB.tabs);
  });

  it("offers spacing, copy and delete while editing", async () => {
    const { element } = await renderBlock();

    for (const selector of [".ascii-tabs-spacing-input", ".ascii-tabs-copy", ".ascii-tabs-delete"]) {
      expect(element.querySelector(selector), selector).not.toBeNull();
    }
    expect(element.querySelector(".ascii-tabs-add")).toBeNull();
  });

  it("shows sheets without a copy button while reading", async () => {
    const { element } = await renderBlock({ readOnly: true });

    expect(element.hasAttribute("readonly")).toBe(true);
    expect(element.querySelector(".ascii-tabs-sheet")).not.toBeNull();
    expect(element.querySelector(".ascii-tabs-copy")).toBeNull();
    for (const selector of [".ascii-tabs-hint", ".ascii-tabs-spacing-input", ".ascii-tabs-delete", ".ascii-tabs-add"]) {
      const found = element.querySelector<HTMLElement>(selector);
      expect(found === null || found.hidden || getComputedStyle(found).display === "none", selector).toBe(true);
    }
  });

  it("deletes the whole block from its last Tab, even an empty one", async () => {
    const onRemove = vi.fn();
    const onChange = vi.fn();
    const { element } = await renderBlock({ block: { tabs: [[]] }, onRemove, onChange });

    fireEvent.click(element.querySelector(".ascii-tabs-delete")!);

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("deletes only that Tab when the block has several", async () => {
    const onRemove = vi.fn();
    const onChange = vi.fn();
    const { element } = await renderBlock({ block: TWO_TABS, onRemove, onChange });

    fireEvent.click(element.querySelectorAll(".ascii-tabs-delete")[0]!);

    expect(onRemove).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenLastCalledWith([TWO_TABS.tabs[1]]);
  });

  it("reports a spacing change from the slider", async () => {
    const onSpacingChange = vi.fn();
    const { element } = await renderBlock({ onSpacingChange });
    const slider = element.querySelector<HTMLInputElement>(".ascii-tabs-spacing-input")!;

    fireEvent.input(slider, { target: { value: "4" } });

    expect(onSpacingChange).toHaveBeenLastCalledWith(4);
  });

  it.each([false, true])("initializes without a hint, readOnly=%s", async (readOnly) => {
    const { element } = await renderBlock({ block: EMPTY_TAB, readOnly });
    expect(element.querySelector(".ascii-tabs-hint")).toBeNull();
  });

  it("shows content that changed outside it, such as an undo", async () => {
    const { element, rerender } = await renderBlock();

    rerender(<TabBlock block={{ tabs: TWO_TABS.tabs, spacing: 5 }} readOnly={false} />);

    expect(element.value).toEqual(TWO_TABS.tabs);
    expect(element.spacing).toBe(5);
  });

  it("keeps the keys typed into the grid away from the lyrics around it", async () => {
    const onKeyDown = vi.fn();
    const view = render(
      <div onKeyDown={onKeyDown}>
        <TabBlock block={ONE_TAB} readOnly={false} />
      </div>,
    );
    const element = await waitFor(() => view.container.querySelector("ascii-tabs .ascii-tabs-sheet")!);

    fireEvent.keyDown(element, { key: "5" });

    expect(onKeyDown).not.toHaveBeenCalled();
  });
});
