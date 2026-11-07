import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChordDiagram } from "./ChordDiagram";
import { findChordShape } from "../../core/findChordShape";
import { getChordPositions } from "../../core/chordPositions";

describe("ChordDiagram", () => {
  it.each([9, 10, 11, 12, 24])("reserves space inside the SVG for fret %i", (position) => {
    render(<ChordDiagram shape={{ name: "Test", position, fingers: [[1, position]] }} />);
    const label = screen.getByText(String(position));
    // Reserve 7px per digit for the 9px label, including wider fallback fonts.
    // Checking only textContent misses numbers clipped by the SVG viewport.
    expect(Number(label.getAttribute("x")) - String(position).length * 7).toBeGreaterThanOrEqual(0);
    expect(label).toHaveAttribute("text-anchor", "end");
  });

  it("shows Gm7 at fret 10 with taller cells and windowed fingering", () => {
    const shape = getChordPositions(findChordShape("Gm7")!).find((shape) => shape.position === 10)!;
    render(<ChordDiagram shape={shape} />);
    const svg = screen.getByRole("img", { name: "Diagrama del acorde Gm7" });
    expect(screen.getByText("10")).toBeInTheDocument();
    const frets = svg.querySelectorAll(".chord-diagram__fret");
    const strings = svg.querySelectorAll(".chord-diagram__string");
    const cellHeight = Number(frets[1].getAttribute("y1")) - Number(frets[0].getAttribute("y1"));
    const cellWidth = Math.abs(Number(strings[1].getAttribute("x1")) - Number(strings[0].getAttribute("x1")));
    expect(cellHeight / cellWidth).toBeGreaterThanOrEqual(1.5);
    expect(svg.querySelector(".chord-diagram__barre")).toHaveAttribute("y", String(Number(frets[0].getAttribute("y1")) + cellHeight / 2 - 8));
    expect(screen.getByText("2")).toHaveAttribute("y", String(Number(frets[0].getAttribute("y1")) + cellHeight * 1.5));
  });
});
