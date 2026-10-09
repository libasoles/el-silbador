import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AsciiTabs } from "ascii-tabs/ascii-tabs.js";
import type { TabBlock as TabBlockContent, TabColumn } from "../../core/types";
import { loadAsciiTabs, loadedAsciiTabs } from "../asciiTabsLoader";
import { dismissTabHint, hasDismissedTabHint, TAB_HINT_DISMISSED_EVENT } from "../tabHintStorage";
import "./TabBlock.css";

const DEFAULT_SPACING = 2;
const HINT_FADE_DURATION_MS = 2_000;

/** Events from inside the grid that must not reach the lyrics editor around it: it would take the
 *  keys typed into a fret as lyrics edits (or undo), and its caret handling would steal the focus. */
const CONTAINED_EVENTS = [
  "keydown",
  "keyup",
  "keypress",
  "beforeinput",
  "input",
  "paste",
  "copy",
  "cut",
  "compositionstart",
  "compositionend",
  "click",
] as const;

interface TabBlockProps {
  block: TabBlockContent;
  /** Reading: only the Sheets. */
  readOnly: boolean;
  onChange?: (tabs: TabColumn[][]) => void;
  onSpacingChange?: (spacing: number) => void;
  /** Deleting the block's last Tab deletes the whole block. */
  onRemove?: () => void;
}

/** A tab block drawn with ascii-tabs. Controlled: the content and spacing always come from the
 *  song, and every edit goes back to it. */
export function TabBlock({ block, readOnly, onChange, onSpacingChange, onRemove }: TabBlockProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<AsciiTabs | null>(null);
  const [ready, setReady] = useState(() => loadedAsciiTabs() !== null);
  const [hintVisibility, setHintVisibility] = useState<"shown" | "fading" | "hidden">(() =>
    hasDismissedTabHint() ? "hidden" : "shown",
  );
  const shouldRenderHint = hintVisibility !== "hidden";
  const callbacks = useRef({ onChange, onSpacingChange, onRemove });
  const blockRef = useRef(block);
  useLayoutEffect(() => {
    callbacks.current = { onChange, onSpacingChange, onRemove };
    blockRef.current = block;
  });

  useEffect(() => {
    if (ready) return;
    let cancelled = false;
    void loadAsciiTabs().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);

  useEffect(() => {
    const beginHidingHint = () => {
      setHintVisibility(visibility => (visibility === "shown" ? "fading" : visibility));
    };
    window.addEventListener(TAB_HINT_DISMISSED_EVENT, beginHidingHint);
    return () => window.removeEventListener(TAB_HINT_DISMISSED_EVENT, beginHidingHint);
  }, []);

  useEffect(() => {
    if (hintVisibility !== "fading") return;
    const timeout = window.setTimeout(() => setHintVisibility("hidden"), HINT_FADE_DURATION_MS);
    return () => window.clearTimeout(timeout);
  }, [hintVisibility]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const stop = (event: Event) => event.stopPropagation();
    for (const type of CONTAINED_EVENTS) host.addEventListener(type, stop);
    return () => {
      for (const type of CONTAINED_EVENTS) host.removeEventListener(type, stop);
    };
  }, []);

  // The parts are read once, when the element connects, so a change of mode builds a new one.
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!ready || !host) return;
    const element = document.createElement("ascii-tabs") as AsciiTabs;
    element.setAttribute("lang", "es");
    element.setAttribute("labels", "notes");
    element.setAttribute("theme", "light");
    element.setAttribute("variant", "flat");
    if (readOnly) {
      element.setAttribute("readonly", "");
      element.append(document.createElement("ascii-tabs-sheet"));
    } else {
      element.append(
        ...(hasDismissedTabHint() ? [] : [document.createElement("ascii-tabs-hint")]),
        document.createElement("ascii-tabs-spacing"),
        part("ascii-tabs-sheet", [
          document.createElement("ascii-tabs-copy"),
          // Enabled while the last Tab is empty too, so that click can delete the block.
          part("ascii-tabs-delete", [], { enabled: "" }),
        ]),
      );
    }
    element.value = blockRef.current.tabs;
    element.spacing = blockRef.current.spacing ?? DEFAULT_SPACING;

    const handleChange = (event: Event) => {
      // The spacing slider's own native `change` bubbles through here too.
      if (event.target !== element || !(event instanceof CustomEvent)) return;
      callbacks.current.onChange?.(element.value);
      if (!hasFret(blockRef.current.tabs) && hasFret(element.value)) dismissTabHint();
    };
    const handleInput = (event: Event) => {
      if (!(event.target instanceof HTMLElement) || !event.target.matches(".ascii-tabs-spacing-input")) return;
      callbacks.current.onSpacingChange?.(element.spacing);
    };
    const handleDelete = (event: Event) => {
      if (element.value.length > 1) return;
      event.preventDefault();
      callbacks.current.onRemove?.();
    };
    element.addEventListener("change", handleChange);
    element.addEventListener("input", handleInput);
    element.addEventListener("delete", handleDelete);
    host.append(element);
    elementRef.current = element;
    return () => {
      element.removeEventListener("change", handleChange);
      element.removeEventListener("input", handleInput);
      element.removeEventListener("delete", handleDelete);
      element.remove();
      elementRef.current = null;
    };
  }, [ready, readOnly]);

  // Dismissing the hint must not reconnect ascii-tabs: that discards its focused cell and
  // typing draft. The hint is presentational and can be removed without rebuilding the grid.
  useLayoutEffect(() => {
    if (!shouldRenderHint) elementRef.current?.querySelector(".ascii-tabs-hint")?.remove();
  }, [ready, readOnly, shouldRenderHint]);

  // Undo, redo and a reload change the block from outside. Writing an unchanged value back would
  // rebuild the Sheets under the fret being typed.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    if (JSON.stringify(element.value) !== JSON.stringify(block.tabs)) element.value = block.tabs;
    const spacing = block.spacing ?? DEFAULT_SPACING;
    if (element.spacing !== spacing) element.spacing = spacing;
  }, [block, ready, readOnly]);

  return (
    <div
      ref={hostRef}
      className="tab-block"
      data-tab-block
      data-ready={ready || undefined}
      data-tab-hint-fading={hintVisibility === "fading" || undefined}
    >
      {ready ? null : <div className="tab-block__placeholder" aria-hidden="true" />}
    </div>
  );
}

function hasFret(tabs: TabColumn[][]): boolean {
  return tabs.some(tab => tab.some(column => column.some(fret => fret !== null)));
}

function part(tag: string, children: Element[], attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.append(...children);
  return element;
}
