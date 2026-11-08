import { describe, expect, it } from "vitest";
import { buildSong } from "../model";
import { isPartituraLinkText, parseLinkPreview, partituraUrlOf } from "../partituraLink";

const DEMO = "https://partitura.com.ar/es/demos/canto-en-la-rama/?tools=voices%2Cplay%2Cintervals&sound=uh&banner=hide";

describe("partituraUrlOf", () => {
  it("recognizes a lone https link to partitura.com.ar", () => {
    expect(partituraUrlOf(DEMO)).toBe(DEMO);
    expect(partituraUrlOf(`  ${DEMO}  `)).toBe(DEMO);
    expect(partituraUrlOf("https://www.partitura.com.ar/")).toBe("https://www.partitura.com.ar/");
  });

  it("rejects other hosts, look-alikes, plain http and text around the link", () => {
    for (const text of [
      "",
      "https://example.com/",
      "https://partitura.com.ar.evil.com/",
      "https://evil.com/?u=partitura.com.ar",
      "https://user@partitura.com.ar@evil.com/",
      "http://partitura.com.ar/",
      "https://partitura.com.ar:8443/",
      `mirá ${DEMO}`,
      `${DEMO} gracias`,
    ]) {
      expect(isPartituraLinkText(text), text).toBe(false);
    }
  });

  it("builds a link line instead of syllables", () => {
    const [line] = buildSong(DEMO);
    expect(line?.partituraLink).toBe(DEMO);
    expect(line?.words).toEqual([]);
  });
});

describe("parseLinkPreview", () => {
  it("reads Open Graph metadata and resolves a relative image", () => {
    const html = `<html><head><title>Fallback</title>
      <meta property="og:title" content="Canto &amp; rama | Partitura">
      <meta property="og:description" content='Para "tres" voces'>
      <meta content="/demos/og.png" property="og:image">
      <meta property="og:site_name" content="Partitura"></head><body></body></html>`;
    expect(parseLinkPreview(html, DEMO)).toEqual({
      title: "Canto & rama | Partitura",
      description: 'Para "tres" voces',
      image: "https://partitura.com.ar/demos/og.png",
      siteName: "Partitura",
    });
  });

  it("falls back to the title tag and returns nulls when nothing is there", () => {
    expect(parseLinkPreview("<head><title>Solo título</title></head>", DEMO).title).toBe("Solo título");
    expect(parseLinkPreview("<p>hola</p>", DEMO)).toEqual({ title: null, description: null, image: null, siteName: null });
  });
});
