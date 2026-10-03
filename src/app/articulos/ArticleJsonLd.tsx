type ArticleJsonLdProps = {
  title: string;
  description: string;
  slug: string;
};

const SITE_URL = "https://elsilbador.com.ar";
const ARTICLE_IMAGE = "/banner.png";

export function ArticleJsonLd({ title, description, slug }: ArticleJsonLdProps) {
  const url = `${SITE_URL}/articulos/${slug}`;
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    inLanguage: "es-AR",
    mainEntityOfPage: url,
    url,
    image: `${SITE_URL}${ARTICLE_IMAGE}`,
    publisher: {
      "@type": "Organization",
      name: "El Silbador",
      url: SITE_URL,
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
    />
  );
}
