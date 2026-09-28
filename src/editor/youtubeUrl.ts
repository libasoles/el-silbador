/** Recognizes the handful of URL shapes YouTube itself hands out (watch, share, embed, Shorts),
 *  on both youtube.com and the no-cookie/short domains, with or without extra query params like
 *  a playlist or timestamp. Anything else — including a non-YouTube URL — is rejected rather than
 *  guessed at, since this id is about to be embedded as a trusted iframe source. */
export function extractYoutubeVideoId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }

  const host = parsed.hostname.replace(/^www\./, "");
  const isValidId = (id: string | undefined): id is string => !!id && /^[\w-]{11}$/.test(id);

  if (host === "youtu.be") {
    const id = parsed.pathname.slice(1).split("/")[0];
    return isValidId(id) ? id : null;
  }

  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    if (parsed.pathname === "/watch") {
      const id = parsed.searchParams.get("v") ?? undefined;
      return isValidId(id) ? id : null;
    }
    const embedMatch = parsed.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);
    if (embedMatch) {
      const id = embedMatch[1];
      return isValidId(id) ? id : null;
    }
  }

  return null;
}

export function isValidYoutubeUrl(url: string): boolean {
  return extractYoutubeVideoId(url) !== null;
}
