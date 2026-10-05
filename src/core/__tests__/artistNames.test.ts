import { describe, expect, it } from "vitest";
import { suggestArtistNames } from "../artistNames";

const ARTISTS = [
  "Abel Pintos",
  "Los Chalchaleros",
  "Mercedes Sosa",
  "Soledad",
  "Tamara Castro",
  "Víctor Jara",
];

describe("suggestArtistNames", () => {
  it("matches the start of a name", () => {
    expect(suggestArtistNames(ARTISTS, "tama", [])).toEqual(["Tamara Castro"]);
  });

  it("matches anywhere in the name", () => {
    expect(suggestArtistNames(ARTISTS, "chalcha", [])).toEqual(["Los Chalchaleros"]);
    expect(suggestArtistNames(ARTISTS, "sosa", [])).toEqual(["Mercedes Sosa"]);
  });

  it("ignores accents and case on both sides", () => {
    expect(suggestArtistNames(ARTISTS, "VICTOR", [])).toEqual(["Víctor Jara"]);
    expect(suggestArtistNames(ARTISTS, "chálcha", [])).toEqual(["Los Chalchaleros"]);
  });

  it("suggests nothing for blank text", () => {
    expect(suggestArtistNames(ARTISTS, "   ", [])).toEqual([]);
  });

  it("leaves out names already added, ignoring accents and case", () => {
    expect(suggestArtistNames(ARTISTS, "s", ["soledad", "MERCEDES SOSÁ"])).toEqual([
      "Abel Pintos",
      "Los Chalchaleros",
      "Tamara Castro",
    ]);
  });

  it("lists names that start with the text before the rest", () => {
    expect(suggestArtistNames(["Los Sosa", "Soledad", "Mercedes Sosa"], "so", [])).toEqual([
      "Soledad",
      "Los Sosa",
      "Mercedes Sosa",
    ]);
  });

  it("returns at most 8 suggestions", () => {
    const many = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10"];
    expect(suggestArtistNames(many, "a", [])).toEqual(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]);
  });
});
