import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArticleNextLink } from "./ArticleNextLink";
import { ARTICLES } from "./articleList";

const slugOf = (href: string) => href.replace("/articulos/", "");

describe("ArticleNextLink", () => {
  it("links each article to the one after it in the index", () => {
    for (const [index, article] of ARTICLES.entries()) {
      const next = ARTICLES[(index + 1) % ARTICLES.length];
      const { unmount } = render(<ArticleNextLink slug={slugOf(article.href)} />);
      const nav = screen.getByRole("navigation", { name: "Siguiente artículo" });
      expect(nav.querySelector("a")?.getAttribute("href")).toBe(next.href);
      expect(nav.textContent).toContain(next.title);
      unmount();
    }
  });

  it("renders nothing for a page that is not in the index", () => {
    const { container } = render(<ArticleNextLink slug="ejemplo" />);
    expect(container.innerHTML).toBe("");
  });
});
