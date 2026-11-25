"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog } from "../../editor/components/Dialog";
import { DOMTooltips } from "../../editor/components/DOMTooltips";
import { campoMarkup } from "../campo-semantico/markup";
import { libreMarkup } from "../verso-libre/markup";
import { notebookMarkup } from "./markup";
import { mountMetrica } from "./notebook.js";
import { notebookIcons, notebookIconComponents } from "./icons";

export function MetricaEditor({ mode = "metrica" }: { mode?: "metrica" | "libre" | "campo" }) {
  const [metricHelp, setMetricHelp] = useState(false);
  const metricTrigger = useRef<HTMLElement | null>(null);
  const host = useRef<HTMLDivElement>(null);
  const [iconTargets, setIconTargets] = useState<HTMLElement[]>([]);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    element.innerHTML = mode === "campo" ? campoMarkup : mode === "libre" ? libreMarkup : notebookMarkup;
    const dispose = mountMetrica(element, notebookIcons, mode);
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
  }, [mode]);

  return (
    <>
      <div className={`metrica-notebook${mode === "campo" ? " campo" : ""}`} ref={host} onClick={event => {
        if (mode !== "libre" || !(event.target instanceof Element)) return;
        const trigger = event.target.closest<HTMLElement>(".detect-count");
        if (trigger) { metricTrigger.current = trigger; setMetricHelp(true); }
      }} />
      {mode === "libre" && <Dialog open={metricHelp} onOpenChange={open => {
        setMetricHelp(open);
        if (!open) requestAnimationFrame(() => metricTrigger.current?.focus());
      }} title="¿Qué son las sílabas métricas?" className="metric-syllables-dialog">
        <p>Son las unidades con las que medimos un verso. La cuenta puede ser distinta de las sílabas que pronunciamos por separado.</p>
        <p>La sinalefa une en una sola sílaba métrica la vocal final de una palabra y la vocal inicial de la siguiente, incluso si hay una h: «mi alma» se cuenta como «mi‿al-ma».</p>
        <p>También influye la última palabra del verso:</p>
        <ul>
          <li><b>Aguda:</b> se suma una sílaba.</li>
          <li><b>Grave:</b> la cuenta se mantiene.</li>
          <li><b>Esdrújula:</b> se resta una sílaba.</li>
        </ul>
        <p>Por ejemplo, «Por el valle va mi voz» tiene 7 sílabas pronunciadas y 8 sílabas métricas, porque «voz» lleva el acento al final.</p>
      </Dialog>}
      <DOMTooltips container={host} />
      {iconTargets.map((target, index) => {
        const Icon = notebookIconComponents[target.dataset.metricaIcon ?? ""];
        return Icon ? createPortal(<Icon size={20} aria-hidden="true" />, target, String(index)) : null;
      })}
    </>
  );
}
