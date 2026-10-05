import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockMatchMedia } from "../../test/matchMedia";
import { ArticleChordEditor, EXAMPLE_LINE } from "./ArticleChordEditor";

const READ_ONLY_NOTE = /En el celular el editor es de solo lectura/;

function renderEditor() {
  render(<ArticleChordEditor sheet={EXAMPLE_LINE} label="Editor de ejemplo" needsEditing />);
}

describe("ArticleChordEditor", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets the lyrics be edited on desktop", () => {
    mockMatchMedia(false);
    renderEditor();

    expect(screen.getByLabelText("Letra de la canción")).toHaveAttribute("contenteditable", "true");
    expect(screen.queryByText(READ_ONLY_NOTE)).not.toBeInTheDocument();
  });

  it("is read-only on mobile and says so", () => {
    mockMatchMedia(true);
    renderEditor();

    expect(screen.getByLabelText("Letra de la canción")).toHaveAttribute("contenteditable", "false");
    expect(screen.getByText(READ_ONLY_NOTE)).toBeInTheDocument();
  });
});
