/** Minimum breathing room, in pixels, kept between one annotation label and the next thing
 *  beside it — another label, or (at the start/end of a line) the line's own edge. 4px read as
 *  touching/overlapping once labels used a heavier weight, so this keeps a visibly clear gap. */
export const minimumLabelGap = 6;

/** Extra space needed after an annotation so the next unit starts after its visible label. */
export function requiredAnnotationGap(annotationWidth: number, unitDistance: number): number {
  return Math.max(0, annotationWidth + minimumLabelGap - unitDistance);
}
