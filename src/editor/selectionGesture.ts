/** A completed text drag still emits a `click`. Only treat that click as an insertion request
    when it did not create a range; otherwise the new caret placement would erase the selection
    the author just made. */
export function shouldPreserveTextSelection(
  selection: Pick<Selection, "isCollapsed"> | null,
  pointerMoved: boolean,
  extendsSelection: boolean,
): boolean {
  return selection !== null && !selection.isCollapsed && (pointerMoved || extendsSelection);
}
