import { expect, it, vi } from "vitest";
import sitemap from "./sitemap";
import { ARTICLES } from "./articulos/articleList";
import { NOTEBOOK_PAGES } from "./metrica/notebookSeo";

vi.mock("../data/songs", () => ({
  listPublicSongs: vi.fn().mockResolvedValue([{ slug: "cancion-publica", updatedAt: "2026-11-25T00:00:00Z" }]),
}));

it("includes every published article and notebook, plus public songs without drafts", async () => {
  const entries = await sitemap();
  const urls = entries.map(entry => entry.url);
  for (const path of [...ARTICLES.map(article => article.href), ...Object.values(NOTEBOOK_PAGES).map(page => page.path)]) {
    expect(urls).toContain(`https://elsilbador.com.ar${path}`);
  }
  expect(new Set(urls).size).toBe(urls.length);
  expect(urls).not.toContain("https://elsilbador.com.ar/articulos/ejemplo");
  expect(entries).toContainEqual(expect.objectContaining({ url: "https://elsilbador.com.ar/cancion/cancion-publica", lastModified: "2026-11-25T00:00:00Z" }));
});
