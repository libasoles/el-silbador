/**
 * Comparison key for a performer's name, mirroring `public.normalize_artist_name` in
 * supabase/migrations/0011_artists_and_performers.sql: "Los Chalchaleros" and " los chalchaléros"
 * are the same artist.
 */
export function artistNameKey(name: string): string {
  return name
    .trim()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** Same artists, in the same order, by `artistNameKey`. */
export function sameArtistNames(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((name, index) => artistNameKey(name) === artistNameKey(b[index]));
}
