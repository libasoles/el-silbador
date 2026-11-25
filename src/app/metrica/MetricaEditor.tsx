"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { notebookMarkup } from "./markup";
import { mountMetrica } from "./notebook.js";
import { notebookIcons, notebookIconComponents } from "./icons";

export function MetricaEditor() {
  const host = useRef<HTMLDivElement>(null);
  const [iconTargets, setIconTargets] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    element.innerHTML = notebookMarkup;
    const dispose = mountMetrica(element, notebookIcons);
    const syncIcons = () => {
      const next = [...element.querySelectorAll<HTMLElement>("[data-metrica-icon]")];
      setIconTargets((previous) =>
        previous.length === next.length && previous.every((node, i) => node === next[i])
          ? previous : next,
      );
    };
    const observer = new MutationObserver(syncIcons);
    observer.observe(element, { childList: true, subtree: true });
    syncIcons();
    return () => { observer.disconnect(); dispose(); };
  }, []);

  return (
    <>
      <div className="metrica-notebook" ref={host} />
      {iconTargets.map((target, index) => {
        const Icon = notebookIconComponents[target.dataset.metricaIcon ?? ""];
        return Icon ? createPortal(<Icon size={20} aria-hidden="true" />, target, String(index)) : null;
      })}
    </>
  );
}
