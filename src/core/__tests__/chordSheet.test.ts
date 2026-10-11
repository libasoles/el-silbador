import { describe, expect, it } from "vitest";
import { isChordLineText, parseChordSheet } from "../chordSheet";

describe("parseChordSheet", () => {
  it("preserves ° when importing consecutive diminished chords above lyrics", () => {
    expect(parseChordSheet("C#°D°7\nla llama")).toEqual({
      lyricsText: "la llama",
      placements: [
        { lineIndex: 0, column: 0, chord: "C#°" },
        { lineIndex: 0, column: 3, chord: "D°7" },
      ],
    });
  });

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

  it("keeps trailing chords with no lyric line under them as a line of text", () => {
    const text = "Nothing's gonna change my world\nC   G";
    const { lyricsText, placements } = parseChordSheet(text);

    expect(lyricsText).toBe(text);
    expect(placements).toEqual([]);
  });

  it("keeps a row of chords above a blank line, another row or a non-lyric line as text", () => {
    const text = ["A   D", "", "G", "E7      A", "Intro", "A", "la llama"].join("\n");
    const { lyricsText, placements } = parseChordSheet(text, (line) => line.trim() !== "" && line !== "Intro");

    expect(lyricsText).toBe(["A   D", "", "G", "E7      A", "Intro", "la llama"].join("\n"));
    expect(placements).toEqual([{ lineIndex: 5, column: 0, chord: "A" }]);
  });

  it("splits chords written back-to-back without a space between them", () => {
    const text = ["C       A7D7", "la llama del amor", "      G    D7C", "lo despertó"].join("\n");

    const { lyricsText, placements } = parseChordSheet(text);

    expect(lyricsText).toBe("la llama del amor\nlo despertó");
    expect(placements).toEqual([
      { lineIndex: 0, column: 0, chord: "C" },
      { lineIndex: 0, column: 8, chord: "A7" },
      { lineIndex: 0, column: 10, chord: "D7" },
      { lineIndex: 1, column: 6, chord: "G" },
      { lineIndex: 1, column: 11, chord: "D7" },
      { lineIndex: 1, column: 13, chord: "C" },
    ]);
  });

  it("uses the chord database to pick the cut, keeping known chords whole", () => {
    const chords = (line: string) =>
      parseChordSheet(`${line}\nx`).placements.map((p) => `${p.column}:${p.chord}`);

    expect(chords("Am7")).toEqual(["0:Am7"]);
    expect(chords("Dm7G7C")).toEqual(["0:Dm7", "3:G7", "5:C"]);
    expect(chords("CGm")).toEqual(["0:C", "1:Gm"]);
    expect(chords("F#mB7")).toEqual(["0:F#m", "3:B7"]);
  });

  it("does not mistake ordinary lyric lines for chord lines", () => {
    const text = "Everybody wants to rule the world";
    expect(parseChordSheet(text)).toEqual({ lyricsText: text, placements: [] });
  });
});

describe("isChordLineText", () => {
  it("reads a line of only chords as a chord line", () => {
    expect(isChordLineText("A   D   E7")).toBe(true);
    expect(isChordLineText("  F#m7  Bb/F  N.C.")).toBe(true);
    expect(isChordLineText("D")).toBe(true);
  });

  it("leaves lyrics, empty lines and a lone chord that is also a word as lyrics", () => {
    expect(isChordLineText("Ya nunca te he de olvidar")).toBe(false);
    expect(isChordLineText("")).toBe(false);
    expect(isChordLineText("   ")).toBe(false);
    expect(isChordLineText("A")).toBe(false);
    expect(isChordLineText(" E ")).toBe(false);
    expect(isChordLineText("A E")).toBe(true);
  });
});
