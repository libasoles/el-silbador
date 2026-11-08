const PARTITURA_HOSTS = new Set(["partitura.com.ar", "www.partitura.com.ar"]);

/** The URL of a line that is only a link to Partitura, or `null` for any other text. Only https
 *  links to partitura.com.ar itself count: the same check guards the server route that fetches the
 *  page, so an author can't point it at an arbitrary host. */
export function partituraUrlOf(lineText: string): string | null {
  const trimmed = lineText.trim();
  if (trimmed === "" || /\s/.test(trimmed)) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !PARTITURA_HOSTS.has(parsed.hostname) || parsed.port !== "") return null;
  return parsed.href;
}

/** Whether a raw lyric line is a lone link to Partitura, shown as a banner. */
export function isPartituraLinkText(lineText: string): boolean {
  return partituraUrlOf(lineText) !== null;
}

export interface LinkPreview {
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
}

function decodeEntities(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** Reads the Open Graph metadata (falling back to Twitter cards and the plain title/description)
 *  from a page's HTML. `pageUrl` resolves a relative image address. */
export function parseLinkPreview(html: string, pageUrl: string): LinkPreview {
  const head = html.slice(0, html.search(/<\/head>/i) === -1 ? 200_000 : html.search(/<\/head>/i));
  const meta = new Map<string, string>();
  for (const tag of head.match(/<meta\b[^>]*>/gi) ?? []) {
    const key = /\b(?:property|name)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    const content = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i.exec(tag);
    const value = content?.[1] ?? content?.[2];
    if (key && value !== undefined && !meta.has(key)) meta.set(key, decodeEntities(value).trim());
  }
  const pick = (...keys: string[]) => keys.map((key) => meta.get(key)).find((value) => value) ?? null;
  const titleTag = /<title[^>]*>([^<]*)<\/title>/i.exec(head)?.[1];
  let image = pick("og:image", "twitter:image");
  if (image) {
    try {
      image = new URL(image, pageUrl).href;
    } catch {
      image = null;
    }
  }
  return {
    title: pick("og:title", "twitter:title") ?? (titleTag ? decodeEntities(titleTag).trim() || null : null),
    description: pick("og:description", "twitter:description", "description"),
    image,
    siteName: pick("og:site_name"),
  };
}
