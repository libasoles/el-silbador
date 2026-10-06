import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyableText } from "./CopyableText";
import { EXAMPLE_LINE } from "./ArticleChordEditor";

describe("CopyableText", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("copies the example with its chords still lined up over the lyrics", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<CopyableText text={EXAMPLE_LINE} label="Texto de ejemplo" />);

    fireEvent.click(screen.getByRole("button", { name: "Copiar" }));

    expect(await screen.findByRole("button", { name: "Copiado" })).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith("   A           A7     D\nYa nunca te he de olvidar");
  });
});
