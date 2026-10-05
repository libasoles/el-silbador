import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ChipsInput } from "./ChipsInput";

function Harness({ initial = [] }: { initial?: string[] }) {
  const [values, setValues] = useState(initial);
  return <ChipsInput label="Intérpretes" values={values} onChange={setValues} />;
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
