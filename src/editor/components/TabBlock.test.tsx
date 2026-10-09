import { act, fireEvent, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AsciiTabs } from "ascii-tabs/ascii-tabs.js";
import type { TabBlock as TabBlockContent } from "../../core/types";
import { TabBlock } from "./TabBlock";

const ONE_TAB: TabBlockContent = { tabs: [[[3, null, null, null, null, null]]] };
const TWO_TABS: TabBlockContent = { tabs: [[[3, null, null, null, null, null]], [[null, 5, null, null, null, null]]] };
const EMPTY_TAB: TabBlockContent = { tabs: [[]] };

afterEach(() => window.localStorage.clear());

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
  it("uses the flat ascii-tabs sheet variant", async () => {
    const { element } = await renderBlock();

    expect(element).toHaveAttribute("variant", "flat");
  });

  it("draws the block's content in Spanish", async () => {
    const { element } = await renderBlock();

    expect(element.getAttribute("lang")).toBe("es");
    expect(element.value).toEqual(ONE_TAB.tabs);
  });

  it("offers the hint, spacing, copy and delete while editing", async () => {
    const { element } = await renderBlock();

    for (const selector of [".ascii-tabs-hint", ".ascii-tabs-spacing-input", ".ascii-tabs-copy", ".ascii-tabs-delete"]) {
      expect(element.querySelector(selector), selector).not.toBeNull();
    }
    expect(element.querySelector(".ascii-tabs-add")).toBeNull();
  });

  it("only lets a reader copy", async () => {
    const { element } = await renderBlock({ readOnly: true });

    expect(element.hasAttribute("readonly")).toBe(true);
    expect(element.querySelector(".ascii-tabs-copy")).not.toBeNull();
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

  it("fades the hint after the first fret and remembers it", async () => {
    const { container, element } = await renderBlock({ block: EMPTY_TAB });
    vi.useFakeTimers();

    try {
      element.value = ONE_TAB.tabs;
      fireEvent(element, new CustomEvent("change", { bubbles: true }));

      expect(container.querySelector(".tab-block")).toHaveAttribute("data-tab-hint-fading");
      expect(window.localStorage.getItem("el-silbador:tab-hint-dismissed")).toBe("true");

      await act(async () => {});
      act(() => vi.advanceTimersByTime(1_999));
      expect(container.querySelector(".ascii-tabs-hint")).not.toBeNull();

      act(() => vi.advanceTimersByTime(1));
      expect(container.querySelector(".ascii-tabs-hint")).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not show the hint again after a first fret was entered", async () => {
    window.localStorage.setItem("el-silbador:tab-hint-dismissed", "true");

    const { element } = await renderBlock({ block: EMPTY_TAB });

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
