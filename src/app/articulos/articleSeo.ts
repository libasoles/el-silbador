import type { Metadata } from "next";

const ARTICLE_IMAGE = "/banner.png";

type ArticleSeo = {
  title: string;
  description: string;
  slug: string;
};

export function articleMetadata({ title, description, slug }: ArticleSeo): Metadata {
  const url = `/articulos/${slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
    openGraph: {
      type: "article",
      url,
      siteName: "El Silbador",
      locale: "es_AR",
      title,
      description,
      images: [{ url: ARTICLE_IMAGE, width: 1734, height: 907, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ARTICLE_IMAGE],
    },
  };
}
