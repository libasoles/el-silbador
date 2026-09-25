import { describe, expect, it } from "vitest";
import { parseChordSheet } from "../chordSheet";

describe("parseChordSheet", () => {
  it("strips chord lines out of the lyrics and records where each chord sat", () => {
    const text = [
      "D             A7sus4 A7",
      "Jai guru deva om",
      "A                         A7",
      "Nothing's gonna change my world",
    ].join("\n");

    const { lyricsText, placements } = parseChordSheet(text);

    expect(lyricsText).toBe("Jai guru deva om\nNothing's gonna change my world");
    expect(placements).toEqual([
      { lineIndex: 0, column: 0, chord: "D" },
      { lineIndex: 0, column: 14, chord: "A7sus4" },
      { lineIndex: 0, column: 21, chord: "A7" },
      { lineIndex: 1, column: 0, chord: "A" },
      { lineIndex: 1, column: 26, chord: "A7" },
    ]);
  });

  it("leaves plain lyrics (with no chord lines) untouched", () => {
    const text = "Nothing's gonna change my world";
    expect(parseChordSheet(text)).toEqual({ lyricsText: text, placements: [] });
  });

  it("preserves blank separator lines between verses", () => {
    const text = "G                         D\nNothing's gonna change my world\n\nJai guru deva om";
    const { lyricsText, placements } = parseChordSheet(text);

    expect(lyricsText).toBe("Nothing's gonna change my world\n\nJai guru deva om");
    expect(placements).toEqual([
      { lineIndex: 0, column: 0, chord: "G" },
      { lineIndex: 0, column: 26, chord: "D" },
    ]);
  });

  it("keeps trailing chords with no lyric line under them by appending an empty line", () => {
    const text = "Nothing's gonna change my world\nC";
    const { lyricsText, placements } = parseChordSheet(text);

    expect(lyricsText).toBe("Nothing's gonna change my world\n");
    expect(placements).toEqual([{ lineIndex: 1, column: 0, chord: "C" }]);
  });

  it("does not mistake ordinary lyric lines for chord lines", () => {
    const text = "Everybody wants to rule the world";
    expect(parseChordSheet(text)).toEqual({ lyricsText: text, placements: [] });
  });
});
