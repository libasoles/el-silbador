import { describe, expect, it } from "vitest";
import { nextId, reserveIds } from "./ids";

describe("reserveIds", () => {
  it("makes nextId skip past ids that already exist", () => {
    reserveIds(["line630", "word12", "syl9"]);
    expect(nextId("line")).toBe("line631");
  });

  it("never moves the counter backwards", () => {
    reserveIds(["line900"]);
    reserveIds(["line5"]);
    expect(nextId("line")).toBe("line901");
  });
});
