import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { hyphenateWord, splitIntoWords } from "../syllabify";
import * as shared from "../../../shared/syllabify.js";

// `shared/` es lo que consumen otros proyectos (partitura) como dependencia de GitHub: se genera con `npm run build:shared`.
describe("shared syllabify export", () => {
  it("is up to date with src/core/syllabify.ts", () => {
    const out = mkdtempSync(join(tmpdir(), "syllabify-"));
    try {
      const script = JSON.parse(readFileSync("package.json", "utf8")).scripts["build:shared"] as string;
      const args = script.replace(/^tsc /, "").replace("--outDir shared", `--outDir ${out}`).split(" ");
      execFileSync("npx", ["tsc", ...args], { stdio: "pipe" });
      for (const file of ["syllabify.js", "syllabify.d.ts"]) {
        expect(readFileSync(join("shared", file), "utf8"), `${file} is stale: run npm run build:shared`).toBe(readFileSync(join(out, file), "utf8"));
      }
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it("splits like the source", () => {
    expect(shared.hyphenateWord("Ypacaraí")).toEqual(hyphenateWord("Ypacaraí"));
    expect(shared.splitIntoWords("a  b")).toEqual(splitIntoWords("a  b"));
  });
});
