import { describe, expect, it } from "vitest";
import { decideUseFlats } from "./transpose";
import { replayTransposeOffset } from "./transposeReplay";

describe("replayTransposeOffset", () => {
  it("transposes content the owner added after the offset was saved", () => {
    // The viewer saved an offset while the song only had slot "a"; the owner has since added "b".
    const liveChords = { a: "C", b: "G" };
    const replayed = replayTransposeOffset(liveChords, undefined, {
      semitones: 2,
      useFlats: false,
    });
    expect(replayed.chords).toEqual({ a: "D", b: "A" });
  });

  it("transposes melody notes alongside chords", () => {
    const replayed = replayTransposeOffset({ a: "C" }, { a: "Do" }, {
      semitones: 1,
      useFlats: false,
    });
    expect(replayed.chords.a).toBe("C#");
    expect(replayed.vocalNotes.a).toBe("Do#");
  });

  it("keeps the saved useFlats even when decideUseFlats on current content disagrees", () => {
    const liveChords = { a: "C#", b: "F#" };
    // The current content alone would push `decideUseFlats` toward sharps...
    expect(decideUseFlats(Object.values(liveChords))).toBe(false);
    // ...but a flats offset saved earlier is honored as-is on replay.
    const replayed = replayTransposeOffset(liveChords, undefined, {
      semitones: 1,
      useFlats: true,
    });
    expect(replayed.chords).toEqual({ a: "D", b: "G" });
  });

  it("leaves blank cells untouched", () => {
    const replayed = replayTransposeOffset({ a: "" }, { a: "  " }, {
      semitones: 3,
      useFlats: false,
    });
    expect(replayed.chords.a).toBe("");
    expect(replayed.vocalNotes.a).toBe("  ");
  });

  it("is a no-op shift (semitones 0) that still rewrites spelling per useFlats", () => {
    const replayed = replayTransposeOffset({ a: "C#" }, undefined, {
      semitones: 0,
      useFlats: true,
    });
    expect(replayed.chords.a).toBe("Db");
  });
});
