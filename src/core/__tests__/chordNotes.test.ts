import { describe, expect, it } from "vitest";
import { chordToNoteNames } from "../chordNotes";

describe("chordToNoteNames", () => {
  it("returns the major triad, root to fifth, for a bare letter", () => {
    expect(chordToNoteNames("C")).toEqual(["do", "mi", "sol"]);
  });

  it("returns the minor triad for a lowercase 'm' quality", () => {
    expect(chordToNoteNames("Am")).toEqual(["la", "do", "mi"]);
  });

  it("does not read an explicit major 'M' as minor", () => {
    expect(chordToNoteNames("CM7")).toEqual(["do", "mi", "sol"]);
  });

  it("treats 'maj' as major, not minor", () => {
    expect(chordToNoteNames("Cmaj7")).toEqual(["do", "mi", "sol"]);
  });

  it("flattens the third and fifth for a diminished chord", () => {
    expect(chordToNoteNames("Bdim")).toEqual(["si", "re", "fa"]);
  });

  it("sharpens the fifth for an augmented chord", () => {
    expect(chordToNoteNames("Caug")).toEqual(["do", "mi", "sol#"]);
  });

  it("honors sharp and flat accidentals on the root", () => {
    expect(chordToNoteNames("F#")).toEqual(["fa#", "la#", "do#"]);
    expect(chordToNoteNames("Bb")).toEqual(["la#", "re", "fa"]);
  });

  it("ignores extensions and slash bass, keeping the underlying triad", () => {
    expect(chordToNoteNames("G7/B")).toEqual(["sol", "si", "re"]);
  });

  it("returns null for a no-chord marker or unparseable text", () => {
    expect(chordToNoteNames("N.C.")).toBeNull();
    expect(chordToNoteNames("")).toBeNull();
    expect(chordToNoteNames("  ")).toBeNull();
  });
});
