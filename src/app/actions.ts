"use server";

import { revalidatePath } from "next/cache";

// The home page listing is ISR-cached (see page.tsx `revalidate`). Toggling a song's
// visibility updates Supabase directly from the browser, so nothing else invalidates
// that cache — call this right after a successful visibility change.
export async function revalidatePublicSongs() {
  revalidatePath("/");
  revalidatePath("/sitemap.xml");
  // A visibility change also changes a song page's robots metadata. This route pattern clears
  // every cached song page, including one whose slug was regenerated after a title edit.
  revalidatePath("/cancion/[slug]", "page");
}
