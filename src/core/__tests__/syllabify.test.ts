import { describe, expect, it } from "vitest";
import { hyphenateWord } from "../syllabify";

describe("hyphenateWord", () => {
  it("splits common words correctly into Spanish syllables", () => {
    expect(hyphenateWord("noche")).toEqual(["no", "che"]);
    expect(hyphenateWord("conocimos")).toEqual(["co", "no", "ci", "mos"]);
    expect(hyphenateWord("camino")).toEqual(["ca", "mi", "no"]);
    expect(hyphenateWord("Camino")).toEqual(["Ca", "mi", "no"]);
    expect(hyphenateWord("amor")).toEqual(["a", "mor"]);
    expect(hyphenateWord("Amor")).toEqual(["A", "mor"]);
  });

  it("splits words from the Ypacaraí fixture correctly", () => {
    expect(hyphenateWord("Ypacaraí")).toEqual(["Y", "pa", "ca", "ra", "í"]);
    expect(hyphenateWord("Ypacarai")).toEqual(["Y", "pa", "ca", "rai"]);
    expect(hyphenateWord("renaciendo")).toEqual(["re", "na", "cien", "do"]);
    expect(hyphenateWord("guaraní")).toEqual(["gua", "ra", "ní"]);
  });

  it("splits words with initial vowels and terminal syllables that line-breakers choke on", () => {
    expect(hyphenateWord("Una")).toEqual(["U", "na"]);
    expect(hyphenateWord("azul")).toEqual(["a", "zul"]);
    expect(hyphenateWord("Iba")).toEqual(["I", "ba"]);
    expect(hyphenateWord("mano")).toEqual(["ma", "no"]);
    expect(hyphenateWord("vino")).toEqual(["vi", "no"]);
  });

  it("handles hiatus and diphthongs, including silent h", () => {
    expect(hyphenateWord("ahora")).toEqual(["a", "ho", "ra"]);
    expect(hyphenateWord("búho")).toEqual(["bú", "ho"]);
    expect(hyphenateWord("melodías")).toEqual(["me", "lo", "dí", "as"]);
    expect(hyphenateWord("cuñataí")).toEqual(["cu", "ña", "ta", "í"]);
    expect(hyphenateWord("canción")).toEqual(["can", "ción"]);
    expect(hyphenateWord("buey")).toEqual(["buey"]);
    expect(hyphenateWord("Paraguay")).toEqual(["Pa", "ra", "guay"]);
  });

  it("handles digraphs, qu/gu with silent u, and diaeresis", () => {
    expect(hyphenateWord("guitarra")).toEqual(["gui", "ta", "rra"]);
    expect(hyphenateWord("guerra")).toEqual(["gue", "rra"]);
    expect(hyphenateWord("pingüino")).toEqual(["pin", "güi", "no"]);
    expect(hyphenateWord("llama")).toEqual(["lla", "ma"]);
  });

  it("handles complex consonant clusters", () => {
    expect(hyphenateWord("constante")).toEqual(["cons", "tan", "te"]);
    expect(hyphenateWord("construcción")).toEqual(["cons", "truc", "ción"]);
    expect(hyphenateWord("embrujo")).toEqual(["em", "bru", "jo"]);
    expect(hyphenateWord("blanca")).toEqual(["blan", "ca"]);
  });

  it("preserves leading and trailing punctuation and handles tokens without vowels", () => {
    expect(hyphenateWord("¿camino?")).toEqual(["¿ca", "mi", "no?"]);
    expect(hyphenateWord("amor,")).toEqual(["a", "mor,"]);
    expect(hyphenateWord("G7")).toEqual(["G7"]);
    expect(hyphenateWord("y")).toEqual(["y"]);
  });
});
