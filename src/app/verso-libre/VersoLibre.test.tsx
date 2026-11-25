import { StrictMode } from "react";
import { readFileSync } from "node:fs";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { MetricaEditor } from "../metrica/MetricaEditor";

beforeEach(() => { localStorage.clear(); window.history.replaceState(null, "", "/verso-libre"); });
afterEach(() => vi.restoreAllMocks());
const poem = "Por el monte va mi canto\ncon el viento del lugar\nlleva tierra del camino\ncon recuerdos de mamá";
function write(text: string) {
  fireEvent.input(screen.getByRole("textbox", { name: "Un verso por renglón" }), { target: { value: text } });
}
it("uses only the syllable border to underline the final stressed syllable across meters", () => {
  const style = document.createElement("style");
  style.textContent = readFileSync("src/app/metrica/metrica.css", "utf8");
  document.head.append(style);
  try {
    const view = render(<MetricaEditor mode="libre" />);
    write("Mi padre es mi abuelo\nmi madre mi hermana\nel monte es mi casa");
    fireEvent.click(screen.getByLabelText("Configuración del editor"));
    fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar todos los acentos" }));
    const tonics = view.container.querySelectorAll<HTMLElement>(".detect-tonic");
    expect(tonics).toHaveLength(3);
    for (const tonic of tonics) {
      expect(getComputedStyle(tonic.closest(".slot")!).borderBottomStyle).toBe("solid");
      expect(getComputedStyle(tonic).textDecoration).toBe("none");
      expect(tonic.tagName).toBe("SPAN");
    }
  } finally {
    style.remove();
  }
});
it("counts syllables, detects rhymes and recognizes a copla", () => {
  const view = render(<MetricaEditor mode="libre" />);
  write(poem);
  expect(screen.getByText("4 versos")).toBeInTheDocument();
  expect(screen.getByText("Esquema detectado:")).toHaveTextContent("Esquema detectado: 8— 8a 8— 8a");
  expect(screen.getByText("Coincide con:")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Pasar el texto a la solapa Copla" })).toBeInTheDocument();
  expect(screen.getAllByRole("button", { name: "Rima a, asonante" })).toHaveLength(2);
  expect(view.container.querySelector(".detect-text .slot")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "A medida" })).not.toBeInTheDocument();
});
it("keeps independent documents, restores them and navigates tabs by keyboard", () => {
  const view = render(<MetricaEditor mode="libre" />);
  write(poem);
  fireEvent.click(screen.getByRole("button", { name: "Nuevo texto" }));
  write("Otro texto distinto");
  const first = screen.getByRole("tab", { name: /Por el monte/ });
  fireEvent.click(first);
  expect(screen.getByRole("textbox")).toHaveValue(poem);
  fireEvent.keyDown(screen.getByRole("tab", { name: /Por el monte/ }), { key: "ArrowRight" });
  expect(screen.getByRole("textbox")).toHaveValue("Otro texto distinto");
  view.unmount();
  render(<MetricaEditor mode="libre" />);
  expect(screen.getAllByRole("tab")).toHaveLength(2);
  expect(screen.getByRole("tab", { name: "Otro texto distinto" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("textbox")).toHaveValue("Otro texto distinto");
  vi.spyOn(window, "confirm").mockReturnValue(true);
  fireEvent.click(screen.getByRole("button", { name: "Eliminar Otro texto distinto" }));
  expect(screen.getByRole("textbox")).toHaveValue(poem);
});
it("receives a recognized text in the metric notebook", () => {
  localStorage.setItem("el-silbador-metrica-libre-envio", JSON.stringify({ form: 0, variant: 0, lines: poem.split("\n") }));
  render(<MetricaEditor />);
  expect(screen.getByRole("textbox", { name: "Verso 1" })).toHaveTextContent("Por el monte va mi canto");
  expect(localStorage.getItem("el-silbador-metrica-libre-envio")).toBeNull();
  expect(location.hash).toBe("#copla");
});
it("shares display settings and handles unavailable storage in StrictMode", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("unavailable"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("unavailable"); });
  const view = render(<StrictMode><MetricaEditor mode="libre" /></StrictMode>);
  write("Por el valle va mi voz");
  expect(screen.getByText(/No se pudo guardar/)).toBeInTheDocument();
  expect(screen.getByText("1 verso")).toBeInTheDocument();
  expect(screen.getByText("Esquema detectado:")).toHaveTextContent("Esquema detectado: 8—");
  fireEvent.click(screen.getByLabelText("Configuración del editor"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar numeración de las sílabas" }));
  expect(view.container.querySelector("#detect-result")).toHaveClass("hide-nums");
  expect(within(screen.getByRole("tablist")).getAllByRole("tab")).toHaveLength(1);
});
it("opens the metric syllables explanation and returns focus to the count", async () => {
  render(<MetricaEditor mode="libre" />);
  write(poem);
  const count = screen.getAllByRole("button", { name: /8 sílabas métricas/ })[0];
  count.focus();
  fireEvent.click(count);
  expect(screen.getByRole("dialog", { name: "¿Qué son las sílabas métricas?" })).toBeInTheDocument();
  expect(screen.getByText(/sinalefa/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await vi.waitFor(() => expect(count).toHaveFocus());
});
it("explains detected rhyme families on click and closes on Escape", () => {
  render(<MetricaEditor mode="libre" />);
  write(poem);
  fireEvent.click(screen.getAllByRole("button", { name: "Rima a, asonante" })[0]);
  expect(screen.getByRole("tooltip")).toHaveTextContent(/Rima asonante.*otros.*a/);
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
  fireEvent.click(screen.getAllByRole("button", { name: "Sin rima detectada" })[0]);
  expect(screen.getByRole("tooltip")).toHaveTextContent("Sin rima detectada: no se encontró otro verso con la misma terminación.");
});

it("labels only the first occurrence of each rhyme family as its reference", () => {
  const view = render(<MetricaEditor mode="libre" />);
  write(poem);
  const notes = [...view.container.querySelectorAll(".rhyme-text")].map(note => note.textContent);
  expect(notes).toEqual(["Sin pareja", "Referencia a", "Sin pareja", "Rima a · asonante"]);
  write("con el viento del lugar");
  expect(screen.queryByText("Referencia a")).not.toBeInTheDocument();
});
