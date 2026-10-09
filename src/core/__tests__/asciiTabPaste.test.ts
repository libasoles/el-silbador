import { describe, expect, it } from "vitest";
import { splitAsciiTabs } from "../asciiTabPaste";

const NUMBERED = `1 -0--3--
2 -1-----
3 -0--0--
4 -2--0--
5 -3--2--
6 -----3-`;

const NOTES = `e|-0--3--|
B|-1--0--|
G|-0--0--|
D|-2--0--|
A|-3--2--|
E|-----3-|`;

describe("splitAsciiTabs", () => {
  it("reads a pasted tablature alone as one run", () => {
    expect(splitAsciiTabs(NUMBERED)).toEqual([{ kind: "tab", ascii: NUMBERED }]);
  });

  it("finds each tablature among lyrics and chords, in place", () => {
    const pasted = `C       G\nUna noche tibia\n${NUMBERED}\nnos conocimos\n\n${NOTES}\nfin`;

    expect(splitAsciiTabs(pasted)).toEqual([
      { kind: "text", text: "C       G\nUna noche tibia" },
      { kind: "tab", ascii: NUMBERED },
      { kind: "text", text: "nos conocimos\n" },
      { kind: "tab", ascii: NOTES },
      { kind: "text", text: "fin" },
    ]);
  });

  it("keeps staves separated only by blank lines in one run, as ascii-tabs joins them", () => {
    const pasted = `${NUMBERED}\n\n${NOTES}\n\nletra`;

    expect(splitAsciiTabs(pasted)).toEqual([
      { kind: "tab", ascii: `${NUMBERED}\n\n${NOTES}` },
      { kind: "text", text: "\nletra" },
    ]);
  });

  it("leaves plain chord lines and a short run of string lines as text", () => {
    const pasted = "E\nB\nG\nD\nA\nE";
    const fiveStrings = NUMBERED.split("\n").slice(0, 5).join("\n");

    expect(splitAsciiTabs(pasted)).toEqual([{ kind: "text", text: pasted }]);
    expect(splitAsciiTabs(fiveStrings)).toEqual([{ kind: "text", text: fiveStrings }]);
  });

  it("returns lyrics without tablature untouched", () => {
    expect(splitAsciiTabs("una noche\ntibia")).toEqual([{ kind: "text", text: "una noche\ntibia" }]);
  });
});
