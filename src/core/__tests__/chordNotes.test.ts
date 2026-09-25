import { describe, expect, it } from "vitest";
import { chordToNoteNames, previousChordNotesBySlot } from "../chordNotes";

describe("chordToNoteNames", () => {
  it("returns the major triad, root to fifth, for a bare letter", () => {
    expect(chordToNoteNames("C")).toEqual(["do", "mi", "sol"]);
  });

  it("returns the minor triad for a lowercase 'm' quality", () => {
    expect(chordToNoteNames("Am")).toEqual(["la", "do", "mi"]);
  });

  it("does not read an explicit major 'M' as minor", () => {
    expect(chordToNoteNames("CM")).toEqual(["do", "mi", "sol"]);
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

  it("adds a fourth, minor-seventh note for a dominant seventh chord", () => {
    expect(chordToNoteNames("G7")).toEqual(["sol", "si", "re", "fa"]);
  });

  it("adds a minor seventh for a minor-seventh chord", () => {
    expect(chordToNoteNames("Am7")).toEqual(["la", "do", "mi", "sol"]);
  });

  it("adds a major seventh for 'maj7' or explicit 'M7'", () => {
    expect(chordToNoteNames("Cmaj7")).toEqual(["do", "mi", "sol", "si"]);
    expect(chordToNoteNames("CM7")).toEqual(["do", "mi", "sol", "si"]);
  });

  it("adds a fully-diminished seventh for a diminished-seventh chord", () => {
    expect(chordToNoteNames("Bdim7")).toEqual(["si", "re", "fa", "sol#"]);
  });

  it("keeps the underlying triad or seventh chord when a slash bass is present", () => {
    expect(chordToNoteNames("G7/B")).toEqual(["sol", "si", "re", "fa"]);
  });

  it("returns null for a no-chord marker or unparseable text", () => {
    expect(chordToNoteNames("N.C.")).toBeNull();
    expect(chordToNoteNames("")).toBeNull();
    expect(chordToNoteNames("  ")).toBeNull();
  });
});

describe("previousChordNotesBySlot", () => {
  it("maps each chord slot to the notes of the chord before it", () => {
    const chords: Record<string, string> = { a: "C", b: "Em" };
    const result = previousChordNotesBySlot(["a", "b"], (slotId) => chords[slotId] ?? "");
    expect(result.get("a")).toBeUndefined();
    expect(result.get("b")).toEqual(["do", "mi", "sol"]);
  });

  it("skips slots with no recognizable chord when finding the previous one", () => {
    const chords: Record<string, string> = { a: "C", b: "", c: "Em" };
    const result = previousChordNotesBySlot(["a", "b", "c"], (slotId) => chords[slotId] ?? "");
    expect(result.get("c")).toEqual(["do", "mi", "sol"]);
  });
});
