import { StrictMode } from "react";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { MetricaEditor } from "../metrica/MetricaEditor";

import { mockMatchMedia } from "../../test/matchMedia";

const wordsLabel = /Escribí al menos 10 palabras/;
function add(words: string) {
  const input = screen.getByRole("textbox", { name: wordsLabel });
  fireEvent.change(input, { target: { value: words } });
  fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
}
function select(word: string) {
  fireEvent.click(within(screen.getByRole("list", { name: /Palabras del tema/ })).getByRole("button", { name: word }));
}
function scheme(view: ReturnType<typeof render>, value: string) {
  const el = view.container.querySelector<HTMLElement>("#campo-scheme")!;
  el.textContent = value;
  fireEvent.input(el);
}
function response(data: unknown) { return { ok: true, json: async () => data }; }
beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/campo-semantico");
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    if (String(url).startsWith("/diccionario")) return response({ io: "gentío estío" });
    if (String(url).includes("rae-api")) return response({ data: { meanings: [] } });
    return response({ parse: { wikitext: "" }, query: { categorymembers: [] } });
  }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it("adds phrases with Enter or Tab, deduplicates and builds the semantic field", async () => {
  render(<MetricaEditor mode="campo" />);
  add("amor, tierra, AMÓR, volver al pueblo");
  const list = screen.getByRole("list", { name: /Palabras del tema/ });
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  const input = screen.getByRole("textbox", { name: wordsLabel });
  fireEvent.change(input, { target: { value: "camino" } });
  fireEvent.keyDown(input, { key: "Tab" });
  expect(within(list).getAllByRole("listitem")).toHaveLength(3);
  expect(screen.getByRole("list", { name: "Palabras por agregar" })).toHaveTextContent("camino");
  fireEvent.change(input, { target: { value: "río, sol" } });
  fireEvent.click(screen.getByRole("button", { name: "Agregar" }));
  expect(within(list).getAllByRole("listitem")).toHaveLength(6);
  select("amor");
  const field = screen.getByRole("region", { name: "El campo semántico de la canción" });
  expect(within(field).getByText("amor")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "odio" }));
  expect(within(field).getByText("odio")).toBeInTheDocument();
  select("amor");
  expect(within(field).queryByText("odio")).not.toBeInTheDocument();
  await waitFor(() => expect(fetch).toHaveBeenCalled());
});

it("unlocks the matrix, recognizes forms and reuses the metric composer", () => {
  const view = render(<MetricaEditor mode="campo" />);
  expect(view.container.querySelector("#campo-matrix-body")).toHaveAttribute("inert");
  add("tierra"); select("tierra");
  expect(view.container.querySelector("#campo-matrix-body")).not.toHaveAttribute("inert");
  scheme(view, "8a 8b 8b 8a");
  expect(screen.getByText("Redondilla")).toBeInTheDocument();
  const verse = screen.getByRole("textbox", { name: "Verso 1" });
  verse.textContent = "Por el valle va mi canto";
  fireEvent.input(verse);
  expect(verse).toHaveTextContent("Por el valle va mi canto");
  expect(screen.getAllByRole("textbox", { name: /^Verso \d/ })).toHaveLength(4);
  fireEvent.click(screen.getByRole("button", { name: "Agregar un grupo de versos" }));
  expect(screen.getAllByRole("textbox", { name: /^Verso \d/ })).toHaveLength(8);
});

it("keeps independent compositions, keyboard navigation and restored drafts", () => {
  const view = render(<MetricaEditor mode="campo" />);
  fireEvent.input(screen.getByRole("textbox", { name: /¿De qué trata/ }), { target: { value: "Mi pueblo" } });
  add("tierra"); select("tierra"); scheme(view, "8a 8b");
  const verse = screen.getByRole("textbox", { name: "Verso 1" });
  verse.textContent = "Por el valle va mi canto"; fireEvent.input(verse);
  fireEvent.input(screen.getByRole("textbox", { name: "Un verso por renglón" }), { target: { value: "Por el valle va mi voz" } });
  fireEvent.click(screen.getByRole("button", { name: "Nueva composición" }));
  expect(screen.getByRole("textbox", { name: /¿De qué trata/ })).toHaveValue("");
  expect(screen.queryByRole("textbox", { name: "Verso 1" })).not.toBeInTheDocument();
  fireEvent.keyDown(screen.getByRole("tab", { selected: true }), { key: "ArrowLeft" });
  expect(screen.getByRole("tab", { name: "Mi pueblo" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("textbox", { name: "Verso 1" })).toHaveTextContent("Por el valle va mi canto");
  expect(screen.getByRole("textbox", { name: "Un verso por renglón" })).toHaveValue("Por el valle va mi voz");
  view.unmount(); render(<MetricaEditor mode="campo" />);
  expect(screen.getByRole("tab", { name: "Mi pueblo" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("textbox", { name: "Verso 1" })).toHaveTextContent("Por el valle va mi canto");
});

it("requires confirmation to delete a composition and preserves another document", async () => {
  render(<MetricaEditor mode="campo" />);
  add("tierra");
  fireEvent.click(screen.getByRole("button", { name: "Nueva composición" }));
  fireEvent.click(screen.getByRole("tab", { name: "Composición 1" }));
  fireEvent.click(screen.getByRole("button", { name: "Eliminar Composición 1" }));
  const dialog = screen.getByRole("dialog", { name: /¿Eliminar/ });
  fireEvent.click(within(dialog).getAllByRole("button", { name: "Cancelar" })[1]);
  expect(screen.getByRole("tab", { name: "Composición 1" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Eliminar Composición 1" }));
  fireEvent.click(within(screen.getByRole("dialog", { name: /¿Eliminar/ })).getByRole("button", { name: "Eliminar" }));
  await waitFor(() => expect(screen.queryByRole("tab", { name: "Composición 1" })).not.toBeInTheDocument());
  expect(screen.getByRole("tab", { name: "Composición 2" })).toHaveAttribute("aria-selected", "true");
});

it("loads dictionary rhymes and follows Spanish, English and RAE fallback calls", async () => {
  vi.mocked(fetch).mockImplementation(async (input) => {
    const url = String(input);
    if (url.startsWith("/diccionario")) return response({ io: "gentío estío" }) as Response;
    if (url.includes("rae-api")) return response({ data: { meanings: [{ senses: [{ synonyms: ["impulso"], antonyms: ["apatía"] }] }] } }) as Response;
    if (url.includes("action=parse")) return response({ parse: { wikitext: url.includes("en.wiktionary") ? "==Spanish==\n{{syn|es|vigor}}" : "" } }) as Response;
    return response({ query: { categorymembers: [{ title: "bravío" }] } }) as Response;
  });
  render(<MetricaEditor mode="campo" />);
  add("brío"); select("brío");
  await waitFor(() => expect(screen.getByRole("button", { name: "gentío" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "vigor" })).toBeInTheDocument());
  await waitFor(() => expect(screen.getByRole("button", { name: "impulso" })).toBeInTheDocument());
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("es.wiktionary.org"));
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("en.wiktionary.org"));
  expect(fetch).toHaveBeenCalledWith("https://rae-api.com/api/words/br%C3%ADo");
});

it("offers spelling corrections and analyzes free verse", async () => {
  const view = render(<MetricaEditor mode="campo" />);
  add("cancion, tierra");
  await waitFor(() => expect(screen.getByRole("button", { name: /Revisar ortografía: 1/ })).toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: /Revisar ortografía: 1/ }));
  fireEvent.click(screen.getByRole("button", { name: "Corregir" }));
  select("canción");
  fireEvent.input(screen.getByRole("textbox", { name: "Un verso por renglón" }), { target: { value: "Por el valle va mi voz\ncon el viento del lugar" } });
  expect(view.container.querySelector("#campo-free-summary")).toHaveTextContent("2 versos");
  expect(view.container.querySelectorAll("#campo-free-result .slot").length).toBeGreaterThan(0);
});

it("handles storage and network failures, including StrictMode remounts", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw Error("storage blocked"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw Error("storage blocked"); });
  vi.mocked(fetch).mockRejectedValue(Error("offline"));
  render(<StrictMode><MetricaEditor mode="campo" /></StrictMode>);
  add("amor"); select("amor");
  expect(screen.getByText(/No se pudo guardar/)).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText(/No pude cargar el diccionario/)).toBeInTheDocument());
  expect(screen.getByRole("button", { name: "odio" })).toBeInTheDocument();
});


it("opens the assonance popup by clicking the Lucide icon and closes it with Escape", async () => {
  render(<MetricaEditor mode="campo" />);
  add("amor"); select("amor");
  const trigger = () => screen.getByRole("button", { name: "¿Qué es una rima asonante?" });
  await waitFor(() => expect(trigger().querySelector("svg")).not.toBeNull());
  fireEvent.click(trigger().querySelector("svg")!);
  expect(screen.getByRole("dialog", { name: "Rima asonante" })).toBeVisible();
  expect(screen.getByRole("button", { name: "¿Qué es una rima asonante?" })).toHaveAttribute("aria-expanded", "true");
  fireEvent.keyDown(document, { key: "Escape" });
  expect(screen.queryByRole("dialog", { name: "Rima asonante" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "¿Qué es una rima asonante?" })).toHaveFocus();
});

it("closes an info tooltip when clicking outside and puts a lightbulb inside the tooltips of steps 1 and 5", async () => {
  const view = render(<MetricaEditor mode="campo" />);
  await waitFor(() => expect(view.container.querySelector("#campo-scheme-info svg")).not.toBeNull());
  const step = (id: string) => view.container.querySelector(`#${id}`)!;
  for (const id of ["campo-tema-section", "campo-matrix-section"]) {
    for (const tip of step(id).querySelectorAll(".composer-info")) {
      expect(tip.querySelector("summary svg")).toHaveClass("lucide-info");
      const bulb = tip.querySelector(".composer-tooltip > p:first-child > .campo-tip-bulb svg");
      // The scheme tooltip explains notation, not a tip: no bulb there.
      if (tip.id === "campo-scheme-info") expect(bulb).toBeNull();
      else expect(bulb).toHaveClass("lucide-lightbulb");
    }
  }
  expect(step("campo-results-section").querySelector(".campo-tip-bulb")).toBeNull();
  const details = view.container.querySelector<HTMLDetailsElement>("#campo-scheme-info")!;
  details.open = true;
  fireEvent.click(details.querySelector("summary")!);
  details.open = true;
  fireEvent.click(document.body);
  expect(details.open).toBe(false);
  expect(screen.getByText(/para ver las formas clásicas/)).toBeInTheDocument();
  const icon = view.container.querySelector(".campo-optional-icon")!;
  expect(icon.querySelector("svg")).toHaveClass("lucide-biceps-flexed");
  expect(icon.nextElementSibling?.tagName).toBe("P");
});

it("checks spelling only in the free-field text and fixes it in place", async () => {
  const view = render(<MetricaEditor mode="campo" />);
  const button = view.container.querySelector<HTMLButtonElement>("#spell-btn-libre")!;
  expect(button.hidden).toBe(true);
  const area = view.container.querySelector<HTMLTextAreaElement>("#campo-free-text")!;
  fireEvent.input(area, { target: { value: "Una cancion para volver" } });
  await waitFor(() => expect(button.hidden).toBe(false));
  await waitFor(() => expect(button).toHaveClass("has-issues"));
  fireEvent.click(button);
  const panel = view.container.querySelector<HTMLElement>("#spell-panel-libre")!;
  expect(within(panel).getByText("cancion")).toBeInTheDocument();
  fireEvent.click(within(panel).getByRole("button", { name: "Corregir" }));
  expect(area.value).toBe("Una canción para volver");
  // Words from other cards are not this card's business.
  expect(view.container.querySelector("#spell-btn")).not.toBe(button);
});

it("disables selection until a word is added and disables it again after removal", async () => {
  const view = render(<MetricaEditor mode="campo" />);
  const step = screen.getByRole("region", { name: /Seleccioná las mejores/ });
  expect(step).toHaveAttribute("aria-disabled", "true");
  expect(view.container.querySelector("#campo-words")).toHaveAttribute("inert");
  await waitFor(() => expect(view.container.querySelector("#campo-count svg")).toHaveClass("lucide-triangle-alert"));
  add("tierra");
  expect(step).toHaveAttribute("aria-disabled", "false");
  expect(view.container.querySelector("#campo-words")).not.toHaveAttribute("inert");
  expect(view.container.querySelector("#campo-count [data-metrica-icon]")).not.toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Quitar tierra de la lista" }));
  expect(step).toHaveAttribute("aria-disabled", "true");
  expect(screen.getByText(/Todavía no hay palabras/)).toBeInTheDocument();
});

it.each([false, true])("shows concise examples on mobile (%s)", (mobile) => {
  mockMatchMedia(mobile);
  render(<MetricaEditor mode="campo" />);
  expect(screen.getByRole("textbox", { name: /¿De qué trata/ })).toHaveAttribute("placeholder", (mobile ? "Volver" : "Por ejemplo: volver") + " al pueblo después de muchos años");
  expect(screen.getByRole("textbox", { name: /Argumento/ })).toHaveAttribute("placeholder", (mobile ? "Alguien" : "Por ejemplo: alguien") + " regresa a su pueblo y encuentra la casa abandonada, pero la calle arbolada sigue igual.");
});

it("restores syllable markup when a keyboard replaces a verse with the same text", () => {
  render(<MetricaEditor mode="campo" />);
  add("camino"); select("camino");
  const field = document.querySelector<HTMLElement>("#campo-scheme")!;
  field.textContent = "8a 8b"; fireEvent.input(field);
  const verse = screen.getByRole("textbox", { name: "Verso 1" });
  for (let i = 0; i < 2; i++) {
    verse.textContent = "camino";
    fireEvent.input(verse);
    expect([...verse.querySelectorAll(".slot")].map(slot => slot.textContent)).toEqual(["ca", "mi", "no"]);
  }
});
