import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
let clientPromise: Promise<SupabaseClient> | undefined;

function isLocalSupabaseUrl(url: string): boolean {
  const parsedUrl = new URL(url);
  return (parsedUrl.hostname === "127.0.0.1" || parsedUrl.hostname === "localhost") && parsedUrl.port === "54321";
}

function isConnectionRefused(error: unknown): boolean {
  if (!(error instanceof Error) || typeof error.cause !== "object" || error.cause === null) return false;
  return "code" in error.cause && error.cause.code === "ECONNREFUSED";
}

/**
 * Adds an actionable diagnostic to the otherwise opaque "fetch failed" error emitted when the
 * configured local Supabase endpoint is down. It works in both the browser console and Next's
 * server console.
 */
export function createSupabaseFetch(supabaseUrl: string, baseFetch: typeof fetch = fetch): typeof fetch {
  let hasReportedUnavailableLocalSupabase = false;

  return async (input, init) => {
    try {
      return await baseFetch(input, init);
    } catch (error) {
      if (isLocalSupabaseUrl(supabaseUrl) && isConnectionRefused(error) && !hasReportedUnavailableLocalSupabase) {
        hasReportedUnavailableLocalSupabase = true;
        console.error(
          "\n⚠️  Supabase local no está disponible en 127.0.0.1:54321.\n" +
            "Docker no está corriendo o Supabase local no fue iniciado. Abrí Docker y ejecutá: npm run supabase:start\n" +
            "Para usar el proyecto remoto, quitá la URL local de .env.local y reiniciá npm run dev.\n",
        );
      }
      throw error;
    }
  };
}

/**
 * Lazily creates the shared Supabase client, so importing this module (or anything that imports
 * it, like the data-access functions) never fails just because env vars aren't set — only calling
 * a function that actually needs the client does. That keeps unit tests importable without
 * credentials, gating the network-touching parts instead of the imports.
 *
 * `@supabase/supabase-js` itself is dynamically imported here (rather than statically at module
 * top-level) so it never ships in the initial bundle for routes that reach this module through the
 * app-wide auth provider but haven't actually needed a Supabase call yet.
 */
export async function getSupabaseClient(): Promise<SupabaseClient> {
  if (client) return client;
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !anonKey) {
        throw new Error(
          "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in .env.local (see .env.example).",
        );
      }

      client = createClient(url, anonKey, { global: { fetch: createSupabaseFetch(url) } });
      return client;
    });
  }
  return clientPromise;
}
