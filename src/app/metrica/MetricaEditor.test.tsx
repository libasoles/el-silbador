import { StrictMode } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MetricaEditor } from "./MetricaEditor";

beforeEach(() => {
  localStorage.clear();
  window.history.replaceState(null, "", "/metrica");
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function writeVerse(number: number, text: string) {
  const field = screen.getByRole("textbox", { name: `Verso ${number}` });
  field.textContent = text;
  fireEvent.input(field);
  return field;
}

it("opens all ten forms and the custom notebook without the original navigation", () => {
  render(<MetricaEditor />);
  const forms = within(screen.getByRole("group", { name: "Formas" }));
  expect(forms.getAllByRole("button")).toHaveLength(11);
  expect(screen.getAllByRole("textbox")).toHaveLength(4);
  expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  expect(screen.queryByText("verso y raíz")).not.toBeInTheDocument();
  fireEvent.click(forms.getByRole("button", { name: "Décima" }));
  expect(screen.getAllByRole("textbox")).toHaveLength(10);
});

it("keeps drafts separate by form and restores them after remounting", () => {
  const view = render(<MetricaEditor />);
  writeVerse(1, "Por el monte va mi canto");
  fireEvent.click(screen.getByRole("button", { name: "Décima" }));
  writeVerse(1, "Una décima distinta");
  fireEvent.click(screen.getByRole("button", { name: "Copla" }));
  expect(screen.getByRole("textbox", { name: "Verso 1" })).toHaveTextContent("Por el monte va mi canto");
  view.unmount();
  render(<MetricaEditor />);
  expect(screen.getByRole("textbox", { name: "Verso 1" })).toHaveTextContent("Por el monte va mi canto");
});

it("restores the selected variant through the URL and keeps its draft", () => {
  const view = render(<MetricaEditor />);
  fireEvent.click(screen.getByRole("button", { name: "Seguidilla" }));
  fireEvent.click(screen.getByRole("button", { name: /Variante/ }));
  fireEvent.click(screen.getByRole("option", { name: /Seguidilla compuesta/ }));
  expect(screen.getAllByRole("textbox")).toHaveLength(7);
  expect(location.hash).toBe("#seguidilla/compuesta");
  writeVerse(1, "Por el sendero claro");
  view.unmount();
  render(<MetricaEditor />);
  expect(screen.getAllByRole("textbox")).toHaveLength(7);
  expect(screen.getByRole("textbox", { name: "Verso 1" })).toHaveTextContent("Por el sendero claro");
});

it("adds, deletes and empties groups, with undo for deletion", () => {
  render(<MetricaEditor />);
  fireEvent.click(screen.getByRole("button", { name: "Agregar un grupo de versos" }));
  expect(screen.getAllByRole("textbox")).toHaveLength(8);
  writeVerse(5, "Un verso del segundo grupo");
  fireEvent.click(screen.getByRole("button", { name: "Eliminar el grupo de versos 2" }));
  expect(screen.getAllByRole("textbox")).toHaveLength(4);
  fireEvent.keyDown(screen.getByRole("textbox", { name: "Verso 1" }), { key: "z", ctrlKey: true });
  expect(screen.getByRole("textbox", { name: "Verso 5" })).toHaveTextContent("Un verso del segundo grupo");
  writeVerse(1, "Un verso para vaciar");
  fireEvent.click(screen.getByRole("button", { name: "Vaciar el grupo de versos" }));
  expect(screen.getByRole("textbox", { name: "Verso 1" })).toBeEmptyDOMElement();
});

it("pastes multiline text and copies the complete composition", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<MetricaEditor />);
  fireEvent.paste(screen.getByRole("textbox", { name: "Verso 1" }), {
    clipboardData: { getData: () => "Por el monte va mi canto\ncon el viento del lugar" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Copiar todo el texto" }));
  expect(writeText).toHaveBeenCalledWith("Por el monte va mi canto\ncon el viento del lugar");
  expect(await screen.findByText("Texto copiado")).toBeInTheDocument();
});

it("persists display settings and toggles individual sinalefas", () => {
  const view = render(<MetricaEditor />);
  writeVerse(1, "Canta en el monte y los cerros");
  const join = screen.getByRole("button", { name: /Sinalefa posible: canta y en/ });
  fireEvent.click(join);
  expect(screen.getByRole("button", { name: /Sinalefa unida: canta y en/ })).toHaveAttribute("aria-pressed", "true");
  fireEvent.click(screen.getByLabelText("Configuración del editor"));
  fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar subrayado de las sílabas" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Mostrar notas bajo los versos" }));
  view.unmount();
  const again = render(<MetricaEditor />);
  expect(again.container.querySelector(".composer")).toHaveClass("hide-lines");
  expect(again.container.querySelector(".composer")).not.toHaveClass("hide-notes");
  expect(screen.getByRole("button", { name: /Sinalefa unida: canta y en/ })).toHaveAttribute("aria-pressed", "true");
});

it("suggests rhyme endings, copies chosen endings, and explains the meter", async () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.stubGlobal("navigator", { clipboard: { writeText } });
  render(<MetricaEditor />);
  writeVerse(2, "con el viento del lugar");
  fireEvent.click(screen.getAllByRole("button", { name: /Buscar palabras para el verso 4/ })[0]);
  const suggestions = screen.getByRole("dialog", { name: /Verso 4/ });
  const pick = within(suggestions).getAllByRole("button").find(button => button.hasAttribute("data-pick"));
  expect(pick).toBeDefined();
  if (!pick) throw new Error("Expected a rhyme suggestion");
  const word = pick.getAttribute("data-pick");
  fireEvent.click(pick);
  expect(screen.getByRole("button", { name: `Verso 4: terminación «${word}». Cambiarla` })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Copiar todo el texto" }));
  expect(writeText).toHaveBeenCalledWith(`\ncon el viento del lugar\n\n${word}`);
  fireEvent.click(screen.getByRole("button", { name: /Verso 2:.*sílabas métricas. Ver explicación/ }));
  expect(screen.getByRole("dialog", { name: "¿Qué es una sílaba métrica?" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Cerrar explicación de métrica" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  await screen.findByText("Texto copiado");
});

it("creates custom schemes, retains hidden verses and restores the notebook", () => {
  const view = render(<MetricaEditor />);
  fireEvent.click(screen.getByRole("button", { name: "A medida" }));
  const scheme = screen.getByRole("textbox", { name: "Esquema de la estrofa" });
  fireEvent.input(scheme, { target: { value: "8a 8b 8a 8b" } });
  writeVerse(4, "con el viento del lugar");
  fireEvent.input(scheme, { target: { value: "8a 8b" } });
  fireEvent.input(scheme, { target: { value: "8a 8b 8a 8b" } });
  expect(screen.getByRole("textbox", { name: "Verso 4" })).toHaveTextContent("con el viento del lugar");
  view.unmount();
  render(<MetricaEditor />);
  expect(screen.getByRole("textbox", { name: "Esquema de la estrofa" })).toHaveValue("8a 8b 8a 8b");
  expect(screen.getByRole("textbox", { name: "Verso 4" })).toHaveTextContent("con el viento del lugar");
});

it("mounts in StrictMode and still works when browser storage is unavailable", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("Storage unavailable"); });
  render(<StrictMode><MetricaEditor /></StrictMode>);
  writeVerse(1, "Un verso que sigue editable");
  expect(screen.getByText("No se pudo guardar: copiá tu texto para conservarlo.")).toBeInTheDocument();
  expect(screen.getAllByRole("group", { name: "Formas" })).toHaveLength(1);
});
