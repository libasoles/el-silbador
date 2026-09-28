import { describe, expect, it } from "vitest";
import { requiredAnnotationGap } from "./annotationSpacing";

describe("requiredAnnotationGap", () => {
  it("adds only the missing space after a wide annotation", () => {
    expect(requiredAnnotationGap(48, 32)).toBe(22);
  });

  it("does not expand an already clear boundary", () => {
    expect(requiredAnnotationGap(28, 40)).toBe(0);
  });
});
