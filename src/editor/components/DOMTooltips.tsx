"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { getIconTooltipPlacement } from "./iconTooltipPlacement";

/** Styled tooltips for dynamic DOM content, using the site's shared tooltip appearance. */
export function DOMTooltips({ container }: { container: RefObject<HTMLElement | null> }) {
  const id = useId();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = container.current;
    if (!root) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const target = (event: Event) => event.target instanceof Element
      ? event.target.closest<HTMLElement>("[data-tooltip]") : null;
    root.addEventListener("pointerover", event => {
      if (event.pointerType === "touch") return;
      setAnchor(target(event));
    }, options);
    root.addEventListener("pointerout", event => {
      const current = target(event);
      if (current && event.relatedTarget instanceof Node && current.contains(event.relatedTarget)) return;
      setAnchor(null);
    }, options);
    root.addEventListener("focusin", event => {
      const element = target(event);
      if (element?.matches(":focus-visible")) setAnchor(element);
    }, options);
    root.addEventListener("focusout", () => setAnchor(null), options);
    root.addEventListener("pointerdown", () => setAnchor(null), options);
    document.addEventListener("keydown", event => {
      if (event.key === "Escape") setAnchor(null);
    }, options);
    window.addEventListener("scroll", () => setAnchor(null), { ...options, capture: true });
    window.addEventListener("resize", () => setAnchor(null), options);
    const observer = new MutationObserver(() => {
      setAnchor(current => current?.isConnected ? current : null);
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => { controller.abort(); observer.disconnect(); };
  }, [container]);

  useLayoutEffect(() => {
    const bubble = bubbleRef.current;
    if (!anchor || !bubble) return;
    const rect = anchor.getBoundingClientRect();
    const { width, height } = bubble.getBoundingClientRect();
    const placement = getIconTooltipPlacement(rect, width, { width: document.documentElement.clientWidth }, "bottom");
    const top = rect.bottom + 10;
    bubble.style.left = `${rect.left + (rect.width - width) / 2 + placement.shift}px`;
    bubble.style.top = `${top + height <= window.innerHeight - 8 ? top : Math.max(8, rect.top - height - 10)}px`;
    const previous = anchor.getAttribute("aria-describedby");
    anchor.setAttribute("aria-describedby", [previous, id].filter(Boolean).join(" "));
    return () => {
      if (previous === null) anchor.removeAttribute("aria-describedby");
      else anchor.setAttribute("aria-describedby", previous);
    };
  }, [anchor, id]);

  return anchor ? createPortal(
    <div ref={bubbleRef} id={id} role="tooltip" className="app-tooltip">
      {anchor.dataset.tooltip}
    </div>, document.body,
  ) : null;
}
