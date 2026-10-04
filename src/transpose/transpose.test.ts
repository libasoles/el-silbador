import { describe, expect, it } from "vitest";
import { decideUseFlats, transposeCells, transposeChord, transposeNote } from "./transpose";

describe("transposeChord", () => {
  it("shifts a plain root up in sharps", () => {
    expect(transposeChord("C", 1, false)).toBe("C#");
  });

  it("shifts a plain root down, wrapping around", () => {
    expect(transposeChord("C", -1, false)).toBe("B");
  });

  it("keeps the suffix intact", () => {
    expect(transposeChord("Am7", 2, false)).toBe("Bm7");
  });

  it("uses flat spellings when asked", () => {
    expect(transposeChord("A", 1, true)).toBe("Bb");
  });

  it("transposes both sides of a slash chord independently", () => {
    expect(transposeChord("G/B", 2, false)).toBe("A/C#");
  });

  it("is a no-op for text with no recognizable root", () => {
    expect(transposeChord("N.C.", 3, false)).toBe("N.C.");
  });

  it("round-trips back to the original after equal and opposite shifts", () => {
    const up = transposeChord("F#m7", 5, false);
    expect(transposeChord(up, -5, false)).toBe("F#m7");
  });
});

describe("transposeChord with parentheses", () => {
  it("transposes a parenthesized chord like a plain one", () => {
    expect(transposeChord("(G)", 2, false)).toBe("(A)");
    expect(transposeChord("G", 2, false)).toBe("A");
  });

  it("transposes a parenthesized chord with suffix and bass note", () => {
    expect(transposeChord("(Am7/G)", 2, false)).toBe("(Bm7/A)");
  });
});

describe("decideUseFlats", () => {
  it("picks flats when a parenthesized chord uses a flat", () => {
    expect(decideUseFlats(["(Bb)", "F"])).toBe(true);
  });


  it("picks flats when any chord already uses a flat", () => {
    expect(decideUseFlats(["Bb", "F", "Gm"])).toBe(true);
  });

  it("prefers sharps when any chord uses one, even if others use flats", () => {
    expect(decideUseFlats(["Bb", "F#"])).toBe(false);
  });

  it("defaults to sharps when nothing hints at either", () => {
    expect(decideUseFlats(["C", "G", "Am"])).toBe(false);
  });
});

describe("transposeNote", () => {
  it("shifts a solfège note up in sharps", () => {
    expect(transposeNote("Do", 1, false)).toBe("Do#");
  });

  it("shifts a solfège note down, wrapping around", () => {
    expect(transposeNote("Do", -1, false)).toBe("Si");
  });

  it("uses flat spellings when asked", () => {
    expect(transposeNote("La", 1, true)).toBe("Sib");
  });

  it("preserves lowercase input", () => {
    expect(transposeNote("re", 2, false)).toBe("mi");
  });

  it("keeps text after the note intact", () => {
    expect(transposeNote("Sol#7", 1, false)).toBe("La7");
  });

  it("is a no-op for text with no recognizable note", () => {
    expect(transposeNote("???", 3, false)).toBe("???");
  });

  it("round-trips back to the original after equal and opposite shifts", () => {
    const up = transposeNote("Fa#", 5, false);
    expect(transposeNote(up, -5, false)).toBe("Fa#");
  });
});

describe("transposeNote with parentheses", () => {
  it("transposes a parenthesized solfège note, preserving case", () => {
    expect(transposeNote("(Re)", 2, false)).toBe("(Mi)");
    expect(transposeNote("(sol)", 1, false)).toBe("(sol#)");
  });
});

describe("transposeCells", () => {
  it("creates a transposed reader view without changing unrelated tracks", () => {
    const cells = {
      chords: { first: "Bb", second: "F" },
      vocalNotes: { first: "Sib" },
      chordNotes: { first: "sib, re, fa" },
    };

    expect(transposeCells(cells, 2)).toEqual({
      chords: { first: "C", second: "G" },
      vocalNotes: { first: "Do" },
      chordNotes: { first: "sib, re, fa" },
    });
    expect(cells.chords.first).toBe("Bb");
  });
});
