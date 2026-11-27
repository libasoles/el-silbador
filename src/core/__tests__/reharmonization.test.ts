import { describe, expect, it } from "vitest";
import {
  inferKey,
  keyName,
  modeAvailable,
  parseMelodyNote,
  suggestChords,
  type SongKey,
} from "../reharmonization";

const C: SongKey = { tonic: 0, minor: false };
const note = (text: string) => parseMelodyNote(text)!;
const chords = (input: Parameters<typeof suggestChords>[0]) => suggestChords(input).map((s) => s.chord);

describe("parseMelodyNote", () => {
  it("reads solfège with sharps and flats", () => {
    expect(parseMelodyNote("do")).toBe(0);
    expect(parseMelodyNote("fa#")).toBe(6);
    expect(parseMelodyNote("sib")).toBe(10);
    expect(parseMelodyNote("hola")).toBeNull();
  });
});

describe("inferKey", () => {
  it("hears C in a song built on C, G, Dm and F that ends on C", () => {
    const melody = ["mi", "sol", "do", "re", "fa", "sol", "la", "la"];
    const chords = ["C", "G", "Dm", "C", "G", "G7", "C", "C7", "F", "G", "C"];
    expect(inferKey(melody, chords)!.key).toEqual({ tonic: 0, minor: false });
  });

  it("finds do mayor from a melody and chords", () => {
    const result = inferKey(["do", "re", "mi", "fa", "sol", "mi", "do"], ["C", "F", "G", "C"]);
    expect(keyName(result!.key)).toBe("Do mayor");
  });

  it("settles a relative major/minor tie with the first and last chord", () => {
    const result = inferKey([], ["Am", "C", "G", "Am"]);
    expect(keyName(result!.key)).toBe("La menor");
  });

  it("returns null with nothing to go on", () => {
    expect(inferKey([], [])).toBeNull();
  });
});

describe("mode 1: triads", () => {
  it("offers the triads of the key that contain 'do'", () => {
    expect(chords({ key: C, note: note("do"), mode: 1 })).toEqual(["C", "F", "Am"]);
  });

  it("orders by least movement from the neighbours, then by function", () => {
    const result = chords({ key: C, note: note("do"), mode: 1, previous: "Am" });
    expect(result[0]).toBe("Am");
  });

  it("uses flats in flat keys", () => {
    const F: SongKey = { tonic: 5, minor: false };
    expect(chords({ key: F, note: note("sib"), mode: 1 })).toContain("Bb");
  });
});

describe("mode 2: extension by melody", () => {
  it("offers C for 'si' in do mayor", () => {
    expect(chords({ key: C, note: note("si"), mode: 2 })).toContain("C");
  });

  it("offers C (9th) for 're' without duplicates, and never a clashing triad", () => {
    const result = chords({ key: C, note: note("re"), mode: 2 });
    expect(result).toContain("C");
    expect(new Set(result).size).toBe(result.length);
    expect(result).not.toContain("Am");
  });
});

describe("mode 3: extension by chords", () => {
  it("offers Cmaj9, not Cmaj7, for 're'", () => {
    const result = chords({ key: C, note: note("re"), mode: 3 });
    expect(result).toContain("Cmaj9");
    expect(result).not.toContain("Cmaj7");
  });

  it("offers Bm7b5 when the note and key ask for it", () => {
    expect(chords({ key: C, note: note("fa"), mode: 3 })).toContain("Bm7b5");
  });

  it("only offers chords that exist in the catalog", () => {
    for (const chord of chords({ key: C, note: note("la"), mode: 3 })) expect(chord).toBeTruthy();
  });
});

describe("mode 4: ii-V-I", () => {
  it("is unavailable without any written chord", () => {
    expect(modeAvailable({ key: C, note: note("mi") }, 4)).toBe(false);
  });

  it("resolves to the I when there is no next chord", () => {
    const result = suggestChords({ key: C, note: note("mi"), mode: 4, previous: "C", syllablesBetween: 3 });
    expect(result.map((s) => s.degree)).toEqual(["ii", "V", "I"]);
  });

  it("cuts to the syllables available", () => {
    const result = suggestChords({ key: C, note: note("mi"), mode: 4, previous: "C", syllablesBetween: 1 });
    expect(result).toHaveLength(1);
    expect(result[0]!.degree).toBe("I");
  });

  it("starts from the tonic without a previous chord", () => {
    const result = suggestChords({ key: C, note: note("mi"), mode: 4, next: "F", syllablesBetween: 3 });
    expect(result[0]!.degree).toBe("I");
  });
});

describe("out-of-key notes", () => {
  it("offers chords containing 'fa#' after nothing diatonic, flagged", () => {
    const result = suggestChords({ key: C, note: note("fa#"), mode: 1 });
    expect(result.map((s) => s.chord)).toEqual(expect.arrayContaining(["D", "Bm"]));
    expect(result.every((s) => s.outOfKey)).toBe(true);
  });

  it("never disables a mode that has suggestions", () => {
    expect(modeAvailable({ key: C, note: note("fa#") }, 1)).toBe(true);
    expect(modeAvailable({ key: C, note: note("fa#") }, 3)).toBe(true);
  });
});
