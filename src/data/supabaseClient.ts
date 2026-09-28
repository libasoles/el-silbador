import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

/**
 * Lazily creates the shared Supabase client, so importing this module (or anything that imports
 * it, like the data-access functions) never fails just because env vars aren't set — only calling
 * a function that actually needs the client does. That keeps unit tests importable without
 * credentials, gating the network-touching parts instead of the imports.
 */
export function getSupabaseClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. Set them in .env.local (see .env.example).",
    );
  }

  client = createClient(url, anonKey);
  return client;
}
