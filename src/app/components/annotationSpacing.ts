/** Extra space needed after an annotation so the next unit starts after its visible label. */
export function requiredAnnotationGap(annotationWidth: number, unitDistance: number): number {
  const minimumLabelGap = 4;
  return Math.max(0, annotationWidth + minimumLabelGap - unitDistance);
}
