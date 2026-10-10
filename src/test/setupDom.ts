import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom does no layout, and leaves these Range methods out entirely; the editor measures text
// with them. Zero-sized rects are what jsdom's elements already report.
Range.prototype.getBoundingClientRect ??= () => new DOMRect();
Range.prototype.getClientRects ??= () =>
  Object.assign([], { item: () => null }) as unknown as DOMRectList;
HTMLElement.prototype.scrollIntoView ??= () => {};

// jsdom has PointerEvent but no pointer capture. Track capture for tab dragging tests.
const capturedPointers = new WeakMap<Element, Set<number>>();
Element.prototype.setPointerCapture ??= function (pointerId) {
  const pointers = capturedPointers.get(this) ?? new Set<number>();
  pointers.add(pointerId);
  capturedPointers.set(this, pointers);
};
Element.prototype.hasPointerCapture ??= function (pointerId) {
  return capturedPointers.get(this)?.has(pointerId) ?? false;
};
Element.prototype.releasePointerCapture ??= function (pointerId) {
  capturedPointers.get(this)?.delete(pointerId);
};

// `globals: false` means RTL can't register its own cleanup.
afterEach(() => {
  cleanup();
});
