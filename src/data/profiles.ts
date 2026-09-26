import { getSupabaseClient } from "./supabaseClient";

export async function setUsername(username: string): Promise<{ username: string }> {
  const supabase = getSupabaseClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("profiles")
    .update({ username })
    .eq("id", userId)
    .select("username")
    .single();
  if (error) {
    if (error.code === "23505") throw new Error("That username is already taken.");
    throw error;
  }

  return { username: data.username as string };
}

/** Whether the signed-in user is an admin, per their `profiles.role` (see
 *  `public.is_admin()` in supabase/migrations/0001_init.sql, which server-side writes enforce
 *  the same way). Returns false rather than throwing when signed out. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = getSupabaseClient();

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError) throw userError;
  const userId = userData.user?.id;
  if (!userId) return false;

  const { data, error } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (error) throw error;

  return data.role === "admin";
}
