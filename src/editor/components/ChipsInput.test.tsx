import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChipsInput } from "./ChipsInput";

function Harness({
  initial = [],
  suggestions,
}: {
  initial?: string[];
  suggestions?: string[];
}) {
  const [values, setValues] = useState(initial);
  return (
    <ChipsInput
      label="Intérpretes"
      values={values}
      onChange={setValues}
      suggestions={suggestions}
      suggestionsLabel="Sugerencias de intérpretes"
    />
  );
}

const ARTISTS = [
  "Abel Pintos",
  "Atahualpa Yupanqui",
  "Chaqueño Palavecino",
  "Jorge Cafrune",
  "Los Chalchaleros",
  "Los Fronterizos",
  "Los Nocheros",
  "Los Tekis",
  "Los Tucu Tucu",
  "Los Manseros Santiagueños",
  "Mercedes Sosa",
  "Soledad",
  "Tamara Castro",
];

function suggestionTexts(): string[] {
  const listbox = screen.queryByRole("listbox", { name: "Sugerencias de intérpretes" });
  if (!listbox) return [];
  return within(listbox)
    .queryAllByRole("option")
    .map((option) => option.textContent ?? "");
}

function chipTexts(): string[] {
  const list = screen.queryByRole("list", { name: "Intérpretes" });
  if (!list) return [];
  return within(list)
    .queryAllByRole("listitem")
    .map((item) => item.textContent ?? "");
}

describe("ChipsInput", () => {
  it("confirms a chip with Enter and clears the input", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByRole("textbox", { name: "Intérpretes" });
    await user.type(input, "Tamara Castro{Enter}");

    expect(chipTexts()).toEqual(["Tamara Castro"]);
    expect(input).toHaveValue("");
  });

  it("confirms a chip with a comma", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(screen.getByRole("textbox", { name: "Intérpretes" }), "Soledad,Abel Pintos,");

    expect(chipTexts()).toEqual(["Soledad", "Abel Pintos"]);
  });

  it("turns a pasted comma-separated list into one chip per name", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("textbox", { name: "Intérpretes" }));
    await user.paste("Tamara Castro, Soledad");

    expect(chipTexts()).toEqual(["Tamara Castro", "Soledad"]);
  });

  it("ignores blank names and names already added", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["Los Chalchaleros"]} />);

    const input = screen.getByRole("textbox", { name: "Intérpretes" });
    await user.type(input, "  {Enter}los chalchaléros{Enter}");

    expect(chipTexts()).toEqual(["Los Chalchaleros"]);
  });

  it("removes the last chip with Backspace on an empty input", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["Tamara Castro", "Soledad"]} />);

    await user.click(screen.getByRole("textbox", { name: "Intérpretes" }));
    await user.keyboard("{Backspace}");

    expect(chipTexts()).toEqual(["Tamara Castro"]);
  });

  it("keeps the chips while Backspace edits typed text", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["Tamara Castro"]} />);

    const input = screen.getByRole("textbox", { name: "Intérpretes" });
    await user.type(input, "So{Backspace}");

    expect(chipTexts()).toEqual(["Tamara Castro"]);
    expect(input).toHaveValue("S");
  });

  it("removes a chip with its ✕ button", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["Tamara Castro", "Soledad"]} />);

    await user.click(screen.getByRole("button", { name: "Quitar Tamara Castro" }));

    expect(chipTexts()).toEqual(["Soledad"]);
  });
});

describe("ChipsInput suggestions", () => {
  it('suggests "Tamara Castro" for "tama"', async () => {
    const user = userEvent.setup();
    render(<Harness suggestions={ARTISTS} />);

    const input = screen.getByRole("combobox", { name: "Intérpretes" });
    await user.type(input, "tama");

    expect(suggestionTexts()).toEqual(["Tamara Castro"]);
    expect(input).toHaveAttribute("aria-expanded", "true");
  });

  it('suggests "Los Chalchaleros" for "chalcha", matching inside the name', async () => {
    const user = userEvent.setup();
    render(<Harness suggestions={ARTISTS} />);

    await user.type(screen.getByRole("combobox", { name: "Intérpretes" }), "chalcha");

    expect(suggestionTexts()).toEqual(["Los Chalchaleros"]);
  });

  it("shows at most 8 suggestions", async () => {
    const user = userEvent.setup();
    render(<Harness suggestions={ARTISTS} />);

    await user.type(screen.getByRole("combobox", { name: "Intérpretes" }), "o");

    expect(suggestionTexts()).toEqual([
      "Abel Pintos",
      "Chaqueño Palavecino",
      "Jorge Cafrune",
      "Los Chalchaleros",
      "Los Fronterizos",
      "Los Nocheros",
      "Los Tekis",
      "Los Tucu Tucu",
    ]);
  });

  it("leaves out performers already added as chips", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["los nocheros", "Los Tekis"]} suggestions={ARTISTS} />);

    await user.type(screen.getByRole("combobox", { name: "Intérpretes" }), "los ");

    expect(suggestionTexts()).toEqual([
      "Los Chalchaleros",
      "Los Fronterizos",
      "Los Tucu Tucu",
      "Los Manseros Santiagueños",
    ]);
  });

  it("moves the selection with the arrows and adds the selected one with Enter", async () => {
    const user = userEvent.setup();
    render(<Harness initial={["Soledad"]} suggestions={ARTISTS} />);

    const input = screen.getByRole("combobox", { name: "Intérpretes" });
    await user.type(input, "eros");
    expect(suggestionTexts()).toEqual(["Los Chalchaleros", "Los Nocheros", "Los Manseros Santiagueños"]);

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("option", { name: "Los Chalchaleros" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await user.keyboard("{ArrowDown}");
    const nocheros = screen.getByRole("option", { name: "Los Nocheros" });
    expect(nocheros).toHaveAttribute("aria-selected", "true");
    expect(input).toHaveAttribute("aria-activedescendant", nocheros.id);
    await user.keyboard("{ArrowDown}{ArrowUp}{Enter}");

    expect(chipTexts()).toEqual(["Soledad", "Los Nocheros"]);
    expect(input).toHaveValue("");
    expect(suggestionTexts()).toEqual([]);
  });

  it("adds the typed text with Enter when no suggestion is selected", async () => {
    const user = userEvent.setup();
    render(<Harness suggestions={ARTISTS} />);

    await user.type(screen.getByRole("combobox", { name: "Intérpretes" }), "tama{Enter}");

    expect(chipTexts()).toEqual(["tama"]);
  });

  it("adds a suggestion when it is clicked", async () => {
    const user = userEvent.setup();
    render(<Harness suggestions={ARTISTS} />);

    await user.type(screen.getByRole("combobox", { name: "Intérpretes" }), "chaque");
    await user.click(screen.getByRole("option", { name: "Chaqueño Palavecino" }));

    expect(chipTexts()).toEqual(["Chaqueño Palavecino"]);
  });

  it("closes the suggestions with Escape and keeps the typed text", async () => {
    const user = userEvent.setup();
    render(<Harness suggestions={ARTISTS} />);

    const input = screen.getByRole("combobox", { name: "Intérpretes" });
    await user.type(input, "tama{Escape}");

    expect(suggestionTexts()).toEqual([]);
    expect(input).toHaveValue("tama");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });
});
