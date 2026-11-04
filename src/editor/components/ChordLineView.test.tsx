import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState } from "react";
import { describe, expect, it } from "vitest";
import { ReaderChordPositionsContext } from "../ReaderChordPositionsContext";
import { ChordLineView } from "./ChordLineView";

function Reader({ initial }: { initial: Record<string, number> }) {
  const [picked, setPicked] = useState(initial);
  const value = useMemo(
    () => ({ get: (name: string) => picked[name], set: (name: string, index: number) => setPicked({ ...picked, [name]: index }) }),
    [picked],
  );
  return (
    <ReaderChordPositionsContext.Provider value={value}>
      <ChordLineView text="C  G" labelProps={{}} readOnly chordsVisible chordNotesVisible={false} />
      <output data-testid="picked">{JSON.stringify(picked)}</output>
    </ReaderChordPositionsContext.Provider>
  );
}

describe("ChordLineView reading", () => {
  it("remembers the position a reader picks for a chord", () => {
    render(<Reader initial={{}} />);
    fireEvent.click(screen.getByLabelText("Ver diagrama de C"));
    fireEvent.click(screen.getByLabelText("Posición siguiente"));
    expect(screen.getByTestId("picked").textContent).toBe('{"C":1}');
  });

  it("opens a chord on the position remembered for it", () => {
    render(<Reader initial={{ C: 1 }} />);
    fireEvent.click(screen.getByLabelText("Ver diagrama de C"));
    // The barre position is drawn from a higher fret, so it shows the fret number.
    expect(document.querySelector(".chord-diagram__position")).not.toBeNull();
  });
});
