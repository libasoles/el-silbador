import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { NOTEBOOK_PAGES } from "./notebookSeo";
import LibrePage, { metadata as libreMetadata } from "../verso-libre/page";
import CampoPage, { metadata as campoMetadata } from "../campo-semantico/page";
import MetricaPage, { metadata as metricaMetadata } from "./page";

vi.mock("./fonts", () => ({ notebookSans: { variable: "notebook-font" } }));
vi.mock("./MetricaEditor", () => ({ MetricaEditor: () => null }));

const pages = [
  { mode: "libre", Page: LibrePage, metadata: libreMetadata },
  { mode: "campo", Page: CampoPage, metadata: campoMetadata },
  { mode: "metrica", Page: MetricaPage, metadata: metricaMetadata },
] as const;

describe("notebook search and sharing", () => {
  it.each(pages)("renders useful HTML without JavaScript for $mode", ({ mode, Page }) => {
    const html = document.createElement("div");
    html.innerHTML = renderToStaticMarkup(<Page />);
    expect(html.querySelectorAll("h1")).toHaveLength(1);
    expect(html.querySelector("h1")?.textContent).toBe(NOTEBOOK_PAGES[mode].title);
    expect(html.textContent).toContain(NOTEBOOK_PAGES[mode].explanation);
    for (const [key, page] of Object.entries(NOTEBOOK_PAGES)) {
      if (key !== mode) expect(html.querySelector(`a[href="${page.path}"]`)).not.toBeNull();
    }
    expect(html.querySelector('a[href="/articulos"]')).not.toBeNull();
  });

  it.each(pages)("uses route-specific canonical and complete social cards for $mode", ({ mode, metadata }) => {
    const page = NOTEBOOK_PAGES[mode];
    expect(metadata.alternates?.canonical).toBe(page.path);
    expect(metadata.description).toBe(page.description);
    expect(metadata.openGraph).toMatchObject({
      url: page.path, title: `${page.title} — El Silbador`,
      description: page.description, siteName: "El Silbador", locale: "es_AR",
      images: [expect.objectContaining({ url: expect.stringMatching(/\.png$/), width: expect.any(Number), height: expect.any(Number) })],
    });
    expect(metadata.twitter).toMatchObject({
      card: "summary_large_image", title: `${page.title} — El Silbador`,
      description: page.description, images: expect.arrayContaining([expect.objectContaining({ url: expect.any(String) })]),
    });
  });
});
