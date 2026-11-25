import { describe, expect, it } from "vitest";
import { parseLinkPreview } from "./partituraLink";

const PAGE = "https://partitura.com.ar/cancion/1";
const withImage = (src: string) => `<head><meta property="og:image" content="${src}"></head>`;

describe("parseLinkPreview image", () => {
  it("resolves a relative https image against the page", () => {
    expect(parseLinkPreview(withImage("/img/a.png"), PAGE).image).toBe("https://partitura.com.ar/img/a.png");
  });

  it.each(["http://example.com/a.png", "javascript:alert(1)", "data:image/svg+xml,<svg/>"])(
    "drops a non-https image: %s",
    (src) => {
      expect(parseLinkPreview(withImage(src), PAGE).image).toBeNull();
    },
  );
});
