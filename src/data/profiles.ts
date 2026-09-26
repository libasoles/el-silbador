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
