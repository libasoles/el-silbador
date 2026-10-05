import { getSupabaseClient } from "./supabaseClient";

/**
 * Every performer's name, alphabetically, for the performers input to suggest from. The table is
 * small (a seeded list plus what admins add), so the input fetches it once and matches locally,
 * ignoring accents with `suggestArtistNames`, instead of querying on every keystroke.
 */
export async function listArtistNames(): Promise<string[]> {
  const supabase = await getSupabaseClient();

  const { data, error } = await supabase.from("artists").select("name").order("name");
  if (error) throw error;

  return (data as { name: string }[]).map((row) => row.name);
}
