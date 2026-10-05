import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// jsdom does no layout, and leaves these Range methods out entirely; the editor measures text
// with them. Zero-sized rects are what jsdom's elements already report.
Range.prototype.getBoundingClientRect ??= () => new DOMRect();
Range.prototype.getClientRects ??= () =>
  Object.assign([], { item: () => null }) as unknown as DOMRectList;

// `globals: false` means RTL can't register its own cleanup.
afterEach(() => {
  cleanup();
});
