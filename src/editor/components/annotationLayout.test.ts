import { describe, expect, it } from "vitest";
import { layoutAnnotationLabels } from "./annotationLayout";

describe("layoutAnnotationLabels", () => {
  it("pins every annotation to the left edge of its syllable, even when labels are wide", () => {
    const rects = [
      { left: 0, width: 20 },
      { left: 21, width: 20 },
    ];

    const lefts = layoutAnnotationLabels(rects);

    expect(lefts).toEqual([0, 21]);
  });
});
