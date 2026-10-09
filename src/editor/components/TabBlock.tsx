import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { AsciiTabs } from "ascii-tabs/ascii-tabs.js";
import type { TabBlock as TabBlockContent, TabColumn } from "../../core/types";
import { loadAsciiTabs, loadedAsciiTabs } from "../asciiTabsLoader";
import "./TabBlock.css";

const DEFAULT_SPACING = 2;
const PLACEHOLDER_NOTES = [
  { label: "e|", positions: [18, 52] },
  { label: "B|", positions: [30] },
  { label: "G|", positions: [42, 70] },
  { label: "D|", positions: [18, 60] },
  { label: "A|", positions: [35] },
  { label: "E|", positions: [48, 78] },
];

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
  /** Leave the grid only at the top/bottom visual boundary of the whole block. */
  onExit?: (side: "before" | "after") => void;
}

/** A tab block drawn with ascii-tabs. Controlled: the content and spacing always come from the
 *  song, and every edit goes back to it. */
export function TabBlock({ block, readOnly, onChange, onSpacingChange, onRemove, onExit }: TabBlockProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const elementRef = useRef<AsciiTabs | null>(null);
  const [ready, setReady] = useState(() => loadedAsciiTabs() !== null);
  const callbacks = useRef({ onChange, onSpacingChange, onRemove, onExit });
  const blockRef = useRef(block);
  useLayoutEffect(() => {
    callbacks.current = { onChange, onSpacingChange, onRemove, onExit };
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readOnly || !callbacks.current.onExit || event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) return;
      if (!(event.target instanceof HTMLElement) || !event.target.matches(".ascii-tabs-input")) return;
      const current = element.querySelector<HTMLElement>(".ascii-tabs-cur");
      const staff = current?.closest(".ascii-tabs-staff");
      const staves = element.querySelectorAll(".ascii-tabs-staff");
      const side = event.key === "ArrowUp" && current?.dataset.s === "0" && staff === staves[0]
        ? "before"
        : event.key === "ArrowDown" && current?.dataset.s === "5" && staff === staves[staves.length - 1]
          ? "after"
          : null;
      if (!side) return;
      event.preventDefault();
      event.stopPropagation();
      callbacks.current.onExit(side);
    };
    element.addEventListener("change", handleChange);
    element.addEventListener("input", handleInput);
    element.addEventListener("delete", handleDelete);
    element.addEventListener("keydown", handleKeyDown, true);
    host.append(element);
    elementRef.current = element;
    return () => {
      element.removeEventListener("change", handleChange);
      element.removeEventListener("input", handleInput);
      element.removeEventListener("delete", handleDelete);
      element.removeEventListener("keydown", handleKeyDown, true);
      element.remove();
      elementRef.current = null;
    };
  }, [ready, readOnly]);

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
    >
      {ready ? null : (
        <div className="tab-block__placeholder" data-editable={!readOnly || undefined} aria-hidden="true">
          {Array.from({ length: Math.max(1, block.tabs.length) }, (_, index) => (
            <div className="tab-block__placeholder-sheet" key={index}>
              {PLACEHOLDER_NOTES.map(({ label, positions }) => (
                <span className="tab-block__placeholder-line" key={label}>
                  <span className="tab-block__placeholder-label">{label}</span>
                  {"-".repeat(512)}
                  {positions.map(position => (
                    <span
                      className="skeleton tab-block__placeholder-note"
                      style={{ left: `${position}%` }}
                      key={position}
                    />
                  ))}
                </span>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function part(tag: string, children: Element[], attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tag);
  for (const [name, value] of Object.entries(attributes)) element.setAttribute(name, value);
  element.append(...children);
  return element;
}
