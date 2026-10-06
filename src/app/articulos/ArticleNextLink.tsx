import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { nextArticle } from "./articleList";

export function ArticleNextLink({ slug }: { slug: string }) {
  const next = nextArticle(slug);
  if (!next) return null;

  return (
    <nav className="article-next" aria-label="Siguiente artículo">
      <p className="article-next__label">Siguiente artículo</p>
      <Link className="article-next__link" href={next.href}>
        {next.title}
        <ArrowRight aria-hidden="true" size={18} strokeWidth={1.75} />
      </Link>
    </nav>
  );
}
