import { useEffect, useState } from "react";
import { partituraUrlOf, type LinkPreview } from "../../core/partituraLink";
import { ExternalLinkIcon } from "./icons";
import "./PartituraBanner.css";

const previews = new Map<string, Promise<LinkPreview | null>>();

/** One request per link for the whole session, so a song re-render (or the same link in two
 *  songs) never fetches twice. A failed request is forgotten so a later render can retry it. */
function loadPreview(url: string): Promise<LinkPreview | null> {
  let preview = previews.get(url);
  if (!preview) {
    preview = fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
      .then((response) => (response.ok ? (response.json() as Promise<LinkPreview>) : null))
      .catch(() => null)
      .then((result) => {
        if (!result) previews.delete(url);
        return result;
      });
    previews.set(url, preview);
  }
  return preview;
}

/** The banner a lone Partitura link in a song becomes. It paints as soon as the link is
 *  recognized, with the link's own address as a stand-in, and fills in the page's title,
 *  description and image once its metadata arrives. */
export function PartituraBanner({ text }: { text: string }) {
  const url = partituraUrlOf(text);
  const [preview, setPreview] = useState<{ url: string; data: LinkPreview } | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    loadPreview(url).then((data) => {
      if (!cancelled && data) setPreview({ url, data });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (!url) return null;
  const data = preview?.url === url ? preview.data : null;
  const title = data?.title ?? "Partitura";
  const description = data?.description ?? new URL(url).pathname.replace(/\/+$/, "");
  return (
    <a
      className="partitura-banner"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      contentEditable={false}
      data-loaded={data ? "" : undefined}
    >
      {data?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="partitura-banner__image" src={data.image} alt="" loading="lazy" />
      ) : (
        <span className="partitura-banner__image partitura-banner__image--empty" aria-hidden="true" />
      )}
      <span className="partitura-banner__body">
        <span className="partitura-banner__site">{data?.siteName ?? "partitura.com.ar"}</span>
        <span className="partitura-banner__title">{title}</span>
        <span className="partitura-banner__description">{description}</span>
      </span>
      <span className="partitura-banner__icon">
        <ExternalLinkIcon size={18} aria-hidden="true" />
      </span>
    </a>
  );
}
