import type { Session } from "@supabase/supabase-js";
import { getSupabaseClient } from "./supabaseClient";

export async function getSession(): Promise<Session | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

/** Subscribes to Supabase auth changes (sign-in, sign-out, token refresh); returns an unsubscribe function. */
export function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const supabase = getSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => subscription.unsubscribe();
}

/** Sends a magic link to the given email; following it signs the person in, creating an account
 *  first if none exists yet. The session itself arrives later via `onAuthStateChange`, once the
 *  link is opened and Supabase picks up the token from the URL. */
export async function signInWithMagicLink(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    // Strip any hash: a previous magic-link callback can leave `#access_token=...` in the
    // address bar, and Supabase appends its own hash onto whatever we send here, producing an
    // unparsable double-fragment URL if we pass one through.
    options: { emailRedirectTo: `${location.origin}${location.pathname}${location.search}` },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
