import { describe, expect, it } from "vitest";
import { hyphenateWord } from "../syllabify";

describe("hyphenateWord", () => {
  it("splits common words from the Ypacaraí fixture", () => {
    expect(hyphenateWord("noche")).toEqual(["no", "che"]);
    expect(hyphenateWord("conocimos")).toEqual(["co", "no", "ci", "mos"]);
  });

  it("splits words with melismas from the fixture", () => {
    expect(hyphenateWord("Ypacaraí")).toEqual(["Ypa", "ca", "raí"]);
    expect(hyphenateWord("renaciendo")).toEqual(["re", "na", "cien", "do"]);
    expect(hyphenateWord("guaraní")).toEqual(["gua", "ra", "ní"]);
  });
});
