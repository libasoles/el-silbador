interface SlotRect {
  left: number;
  width: number;
}

/**
 * An annotation belongs to the onset of its syllable. Its text width and neighboring cells never
 * alter that anchor: the annotation's left edge is the syllable's left edge.
 */
export function layoutAnnotationLabels(rects: SlotRect[]): number[] {
  return rects.map((rect) => rect.left);
}
