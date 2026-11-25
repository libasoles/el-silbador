/** The Content-Security-Policy sent with every page. It is a static header (not a per-request
 *  nonce, which would force every page to render dynamically), so inline scripts stay allowed:
 *  what it enforces is that nothing loads from, or talks to, an origin we don't list, that no
 *  plugin content runs, and that the site can't be framed or have its <base> rewritten. */
export function buildContentSecurityPolicy({
  supabaseUrl,
  isDev,
}: {
  supabaseUrl?: string;
  isDev: boolean;
}): string {
  const supabaseOrigin = originOf(supabaseUrl);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next's own bootstrap scripts are inline; gtag.js is the only third-party script.
    "script-src": ["'self'", "'unsafe-inline'", "https://www.googletagmanager.com", ...(isDev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    // Any https image: a Partitura banner shows that page's own og:image.
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      ...(supabaseOrigin ? [supabaseOrigin] : []),
      "https://*.supabase.co",
      "https://www.googletagmanager.com",
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.sentry.io",
      "https://es.wiktionary.org",
      "https://en.wiktionary.org",
      "https://rae-api.com",
    ],
    "frame-src": ["https://www.youtube-nocookie.com"],
    // Sentry Replay compresses events in a blob: worker.
    "worker-src": ["'self'", "blob:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  const policy = Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

function originOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}
