import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { ArticleJsonLd } from "./ArticleJsonLd";
import { articleMetadata } from "./articleSeo";

const article = {
  title: "Cómo usar los acordes en el editor",
  description: "Guía práctica para trabajar con acordes.",
  slug: "usar-acordes-en-el-editor",
};

describe("article SEO", () => {
  it("provides canonical, crawler and social metadata for published guides", () => {
    const metadata = articleMetadata(article);

    expect(metadata.alternates).toEqual({ canonical: "/articulos/usar-acordes-en-el-editor" });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.openGraph).toMatchObject({ type: "article", url: "/articulos/usar-acordes-en-el-editor" });
    expect(metadata.twitter).toMatchObject({ card: "summary_large_image" });
  });

  it("adds Article structured data that identifies the canonical page", () => {
    const markup = renderToStaticMarkup(createElement(ArticleJsonLd, article));

    expect(markup).toContain('type="application/ld+json"');
    expect(markup).toContain('"@type":"Article"');
    expect(markup).toContain('"mainEntityOfPage":"https://elsilbador.com.ar/articulos/usar-acordes-en-el-editor"');
  });
});
